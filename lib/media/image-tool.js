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
  resolveCarrierModel,
  resolveImageModelForRequest,
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

/** 官方 `agentDefaultModel` 当前选中的 Codex carrier（仅当 provider 就是 openai-codex）。 */
function codexCarrierFromOfficialDefault(ctx) {
  try {
    const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
    return selection?.provider === 'openai-codex' ? selection.model : undefined
  } catch {
    return undefined
  }
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
  const outputNote = `Generated images are saved to the current session workspace under ${DEFAULT_IMAGE_OUTPUT_DIR}/ by default (configurable via imageOutputDir). The tool returns absolute file paths, not image content or an in-chat image card. Use read_image on a returned path when visual inspection is needed.`

  return defineTool({
    name,
    description: buildImageToolDescription({ models, defaultModel, outputNote }),
    parameters: buildImageToolParameters({ models, defaultModel }),
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
      // 清单顺序即优先级：不传 model 时用清单第一个（不再有独立的"默认档"配置项）。
      const { model: imageModel } = resolveImageModelForRequest({
        requested: args.model,
        selectedModels: selected,
      })
      const carrierModel = resolveCarrierModel({
        officialCodexDefaultModel: codexCarrierFromOfficialDefault(ctx),
      })
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
      try {
        const result = await runMediaGeneration({
          protocolId: adapter.protocolId,
          request: {
            prompt: args.prompt,
            imageModel,
            ...(carrierModel ? { carrierModel } : {}),
            ...(args.size ? { size: args.size } : {}),
            ...(args.quality ? { quality: args.quality } : {}),
            ...(args.background ? { background: args.background } : {}),
            ...(args.action ? { action: args.action } : {}),
            ...(args.format ? { outputFormat: args.format } : {}),
            ...(args.image ? { image: args.image } : {}),
          },
          credential,
          http: auth.http ?? globalThis.fetch,
          signal: controller.signal,
        })
        images = result.images
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
        const extension = mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png'
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
        summary: `Generated ${files.length} image${files.length > 1 ? 's' : ''} with ${imageModel} via Codex subscription; saved to ${files.map((file) => file.path).join(', ')}`,
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
