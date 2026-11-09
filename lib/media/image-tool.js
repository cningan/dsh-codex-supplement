import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { getAdapterById, runMediaGeneration } from './executors.mjs'
import { resolveImageOutputDir, DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'
import { DEFAULT_IMAGE_MODEL } from './image-models.mjs'
import {
  IMAGE_TOOL_NAME,
  buildImageToolDescription,
  buildImageToolOutputSchema,
  buildImageToolParameters,
  renderImageToolOutput,
} from './image-tool-schema.mjs'
import {
  CODEX_PROVIDER_ID,
  assertCodexImageAdapter,
  resolveImageModelForRequest,
  resolveModelProfile,
  resolveSelectedImageModels,
} from './model-selection.mjs'

const REQUEST_TIMEOUT_MS = 120_000
const PROMPT_MAX_LENGTH = 32_000

// 工具名与参数/输出 schema 都在 ./image-tool-schema.mjs（纯数据，离线可测）；
// 本模块只负责把它交给工具系统并实现执行流程。
export { IMAGE_TOOL_NAME }

function isAborted(signal) {
  return signal?.aborted === true
}

/** 媒体类型 → 落盘扩展名（2.6 起含 gif / svg）。 */
function extensionForMediaType(mediaType) {
  if (mediaType === 'image/jpeg') return 'jpg'
  if (mediaType === 'image/webp') return 'webp'
  if (mediaType === 'image/gif') return 'gif'
  if (mediaType === 'image/svg+xml') return 'svg'
  return 'png'
}

/** 配置里当前勾选的图像模型清单（工具注册与执行共用同一解析）。 */
export function selectedImageModels(current) {
  const config = current()
  return resolveSelectedImageModels({
    models: config?.imageModels,
    legacySelections: config?.providerModelSelections,
    legacyEnabled: Array.isArray(config?.enableProviders)
      && config.enableProviders.includes(CODEX_PROVIDER_ID),
  })
}

async function resolveCodexTarget(ctx, current, exec) {
  if (current()?.enableImageGeneration !== true) {
    throw new Error('Image generation is disabled in Codex Subscription settings')
  }
  const selected = selectedImageModels(current)
  if (selected.length === 0) {
    throw new Error(
      'No image model is enabled: pick at least one in Settings → Codex Subscription → image generation.',
    )
  }
  const adapter = getAdapterById(CODEX_PROVIDER_ID)
  assertCodexImageAdapter(adapter)
  const auth = ctx.get('openaiCodexAuth')
  if (auth === undefined) throw new Error('Codex sign-in service is unavailable')
  let credential
  try { credential = await auth.credential(exec.signal) } catch { credential = undefined }
  if (credential === undefined) throw new Error('Sign in to Codex before generating an image')
  return { adapter, credential, auth, selected }
}

/**
 * 单个 Codex 订阅生图工具。
 *
 * 设计（用户 2026-09-24 裁定）：**工具不绑定模型**——`model` 是一个普通参数，
 * 取值来自设置页勾选的清单；勾选为空则不注册本工具（`lib/media/index.js` 负责）。
 * 图像引擎仍由订阅服务端执行，本插件只声明想用哪一档。
 */
export function imageToolDefinition(ctx, { current, name, modelSelection } = {}) {
  const models = Array.isArray(modelSelection?.models) ? modelSelection.models : []
  const defaultModel = typeof modelSelection?.defaultModel === 'string' && modelSelection.defaultModel.length > 0
    ? modelSelection.defaultModel
    : (models[0] ?? DEFAULT_IMAGE_MODEL)
  const defaultProfile = resolveModelProfile({
    model: defaultModel,
    defaultsByModel: modelSelection?.defaultsByModel,
  })
  const outputNote = `Generated images are saved to the current session workspace under ${DEFAULT_IMAGE_OUTPUT_DIR}/ by default (configurable via imageOutputDir). The tool returns absolute file paths, not image content or an in-chat image card. Use read_image on a returned path when visual inspection is needed.`

  return defineTool({
    name,
    description: buildImageToolDescription({ models, defaultModel, outputNote }),
    parameters: buildImageToolParameters({
      models,
      defaultModel,
      defaultQuality: defaultProfile.quality,
      defaultComplexity: defaultProfile.complexity,
    }),
    output: {
      schema: buildImageToolOutputSchema(),
      render: renderImageToolOutput,
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
    async execute(args, exec) {
      if (typeof args?.prompt !== 'string' || args.prompt.trim().length === 0) {
        throw new Error('A non-empty prompt is required')
      }
      if (args.prompt.length > PROMPT_MAX_LENGTH) {
        throw new Error(`Prompt must be at most ${PROMPT_MAX_LENGTH} characters`)
      }

      const { adapter, credential, auth, selected } = await resolveCodexTarget(ctx, current, exec)
      const { model: imageModel } = resolveImageModelForRequest({
        requested: args.model,
        selectedModels: selected,
        defaultModel: modelSelection?.defaultModel,
      })
      const profile = resolveModelProfile({
        model: imageModel,
        defaultsByModel: modelSelection?.defaultsByModel,
      })
      // 显式参数优先；缺省跟随当前模型自己的 profile。模型不支持的档位直接拒绝，
      // 不把非法值发给上游，也不静默换档。
      const requestedQuality = typeof args.quality === 'string' && args.quality.length > 0 ? args.quality : undefined
      if (requestedQuality !== undefined && !profile.qualityOptions.includes(requestedQuality)) {
        throw new Error(`Quality "${requestedQuality}" is not supported by ${imageModel}. Supported: ${profile.qualityOptions.join(', ')}.`)
      }
      const quality = requestedQuality ?? profile.quality
      const requestedComplexity = typeof args.complexity === 'string' && args.complexity.length > 0 ? args.complexity : undefined
      if (requestedComplexity !== undefined && !profile.complexityOptions.includes(requestedComplexity)) {
        throw new Error(`Complexity "${requestedComplexity}" is not supported by ${imageModel}. Supported: ${profile.complexityOptions.join(', ') || 'model default'}.`)
      }
      const complexity = profile.complexityOptions.length > 0
        ? (requestedComplexity ?? profile.complexity)
        : undefined
      if (isAborted(exec.signal)) throw new Error('Image generation cancelled')

      const controller = new AbortController()
      let timedOut = false
      const onCallerAbort = () => controller.abort()
      exec.signal?.addEventListener('abort', onCallerAbort, { once: true })
      const timer = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, REQUEST_TIMEOUT_MS)

      let images = []
      let usedCarrier
      let effective
      try {
        const result = await runMediaGeneration({
          protocolId: adapter.protocolId,
          request: {
            prompt: args.prompt,
            imageModel,
            ...(args.size ? { size: args.size } : {}),
            ...(quality ? { quality } : {}),
            ...(complexity ? { complexity } : {}),
            ...(args.background ? { background: args.background } : {}),
            ...(args.action ? { action: args.action } : {}),
            ...(args.output_format ? { outputFormat: args.output_format } : {}),
            ...(args.image ? { image: args.image } : {}),
            ...(args.mask ? { inputImageMask: args.mask } : {}),
            ...(args.output_compression !== undefined ? { outputCompression: args.output_compression } : {}),
            ...(args.moderation ? { moderation: args.moderation } : {}),
            ...(args.input_fidelity ? { inputFidelity: args.input_fidelity } : {}),
            ...(args.partial_images !== undefined ? { partialImages: args.partial_images } : {}),
            ...(args.frames !== undefined ? { frameCount: args.frames } : {}),
            ...(args.frame_duration_ms !== undefined ? { frameDurationMs: args.frame_duration_ms } : {}),
          },
          credential,
          http: auth.http ?? globalThis.fetch,
          signal: controller.signal,
        })
        images = result.images
        effective = result.effective
        if (typeof result.carrierModel === 'string' && result.carrierModel.length > 0) usedCarrier = result.carrierModel
      } catch (error) {
        if (isAborted(exec.signal)) throw new Error('Image generation cancelled')
        if (timedOut) throw new Error('Codex image generation timed out')
        if (error instanceof Error && !(error instanceof TypeError)) throw error
        throw new Error(`Codex image generation failed: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        clearTimeout(timer)
        exec.signal?.removeEventListener('abort', onCallerAbort)
      }

      const output = await resolveImageOutputDir({ config: current(), exec })
      if (output.dir === undefined) {
        throw new Error(`Image generated but no workspace output directory is available (${output.reason ?? 'unknown'}). Check imageOutputDir and the session workspace.`)
      }
      const files = []
      const stamp = Date.now()
      for (let index = 0; index < images.length; index++) {
        const data = Buffer.from(images[index].data, 'base64')
        const mediaType = images[index].mimeType
        const extension = extensionForMediaType(mediaType)
        const filePath = join(output.dir, `${adapter.id}-image-${stamp}-${index}.${extension}`)
        await mkdir(output.dir, { recursive: true })
        try {
          await writeFile(filePath, data)
        } catch (error) {
          throw new Error(`Image generated but workspace write failed (${filePath}): ${error instanceof Error ? error.message : String(error)}`)
        }
        files.push({ path: filePath, bytes: data.length, mediaType })
        try {
          await ctx.attachments.saveImage({ data, mediaType, name: `${adapter.id}-image-${stamp}-${index}.${extension}` })
        } catch (error) {
          ctx.logger?.warn('dsh-codex-supplement: image attachment save failed; workspace file is available: %s',
            error instanceof Error ? error.message : String(error))
        }
      }

      return {
        files,
        model: imageModel,
        ...(usedCarrier === undefined ? {} : { carrier: usedCarrier }),
        ...(effective === undefined ? {} : { effective }),
        summary: `Generated ${files.length} image${files.length > 1 ? 's' : ''} with ${imageModel} at quality ${quality ?? 'auto'}${complexity ? ` and complexity ${complexity}` : ''} via Codex subscription; saved to ${files.map((file) => file.path).join(', ')}`,
      }
    },
    presentCall: (args) => ({
      card: 'generic',
      title: 'Generate image',
      kind: 'other',
      rawInput: typeof args?.prompt === 'string' ? args.prompt : '',
    }),
  })
}
