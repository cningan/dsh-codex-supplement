import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { getAdapterById, runMediaGeneration } from './executors.mjs'
import { resolveImageOutputDir, DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'
import {
  CODEX_MANAGED_IMAGE_CHOICE,
  resolveImageModel,
  resolveSelectedModelIds,
} from './model-selection.mjs'

const CODEX_PROVIDER_ID = 'openai-codex-oauth'
const REQUEST_TIMEOUT_MS = 120_000
const PROMPT_MAX_LENGTH = 32_000

function isAborted(signal) {
  return signal?.aborted === true
}

function codexCarrierFromOfficialDefault(ctx) {
  try {
    const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
    return selection?.provider === 'openai-codex' ? selection.model : undefined
  } catch {
    return undefined
  }
}

function resolveRequestModel({ adapter, current, modelSelection, ctx }) {
  return resolveImageModel({
    adapter,
    savedSelection: current()?.providerModelSelections?.[adapter.id],
    documentedSelection: modelSelection,
    officialCodexDefaultModel: codexCarrierFromOfficialDefault(ctx),
  })
}

async function resolveCodexTarget(ctx, current, exec) {
  if (current()?.enableImageGeneration !== true) {
    throw new Error('Image generation is disabled in Codex Supplement settings')
  }
  const config = current()
  const selected = resolveSelectedModelIds({
    providerId: CODEX_PROVIDER_ID,
    selections: config?.providerModelSelections,
    legacyEnabled: Array.isArray(config?.enableProviders)
      && config.enableProviders.includes(CODEX_PROVIDER_ID),
  })
  if (!selected.includes(CODEX_MANAGED_IMAGE_CHOICE)) {
    throw new Error('Select the Codex-managed image engine in Codex Supplement settings first')
  }
  const adapter = getAdapterById(CODEX_PROVIDER_ID)
  const auth = ctx.get('openaiCodexAuth')
  if (auth === undefined) throw new Error('Codex sign-in service is unavailable')
  let credential
  try { credential = await auth.credential(exec.signal) } catch { credential = undefined }
  if (credential === undefined) throw new Error('Sign in to Codex before generating an image')
  return { adapter, credential, auth }
}

/** Existing Codex subscription image tool; the subscription owns the image engine. */
export function imageToolDefinition(ctx, { current, name, modelSelection } = {}) {
  const outputNote = `Generated images are saved to the current session workspace under ${DEFAULT_IMAGE_OUTPUT_DIR}/ by default (configurable via imageOutputDir). The tool returns absolute file paths, not image content or an in-chat image card. Use read_image on a returned path when visual inspection is needed.`

  return defineTool({
    name,
    description: `Generate an image through the signed-in ChatGPT/Codex subscription using its managed image engine. The official DSH Codex model is used only as the Responses carrier; no GPT Image model ID is selected or sent as the carrier. ${outputNote}`,
    parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Detailed image-generation prompt.',
      },
      size: {
        type: 'string',
        description: 'Optional output size or resolution hint supported by the Codex image endpoint.',
      },
      aspectRatio: {
        type: 'string',
        description: 'Optional aspect ratio hint, such as 16:9, 1:1, or 3:4.',
      },
      format: {
        type: 'string',
        enum: ['png', 'jpeg', 'webp'],
        description: 'Optional output format.',
      },
      image: {
        type: 'string',
        description: 'Optional reference image as a local absolute path, HTTP URL, or data URL.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          files: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string', required: true },
                bytes: { type: 'integer', required: true },
                mediaType: { type: 'string', required: true },
              },
            },
          },
          model: { type: 'string' },
          summary: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: [
          value?.summary ?? 'Generated image.',
          ...(Array.isArray(value?.files) && value.files.length > 0
            ? ['Files:', ...value.files.map((file) => `- ${file.path} (${file.bytes} bytes) ${file.mediaType}`)]
            : []),
        ].join('\n'),
      }],
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
    async execute(args, exec) {
      if (typeof args?.prompt !== 'string' || args.prompt.trim().length === 0) {
        throw new Error('A non-empty prompt is required')
      }
      if (args.prompt.length > PROMPT_MAX_LENGTH) {
        throw new Error(`Prompt must be at most ${PROMPT_MAX_LENGTH} characters`)
      }

      const { adapter, credential, auth } = await resolveCodexTarget(ctx, current, exec)
      const requestModel = resolveRequestModel({ adapter, current, modelSelection, ctx })
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
      let usedModel
      try {
        const result = await runMediaGeneration({
          protocolId: adapter.protocolId,
          request: {
            prompt: args.prompt,
            ...(requestModel ? { model: requestModel } : {}),
            ...(args.size ? { size: args.size } : {}),
            ...(args.aspectRatio ? { aspectRatio: args.aspectRatio, aspect_ratio: args.aspectRatio } : {}),
            ...(args.format ? { format: args.format } : {}),
            ...(args.image ? { image: args.image } : {}),
          },
          credential,
          http: auth.http ?? globalThis.fetch,
          signal: controller.signal,
        })
        images = result.images
        if (typeof result.model === 'string' && result.model.length > 0) usedModel = result.model
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
        ...(usedModel === undefined ? {} : { model: usedModel }),
        summary: `Generated ${files.length} image${files.length > 1 ? 's' : ''} via Codex subscription; saved to ${files.map((file) => file.path).join(', ')}`,
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
