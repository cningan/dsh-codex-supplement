import z from '@deepseek-ai/schemastery'
import { IMAGE_TOOL_NAME, imageToolDefinition, selectedImageModels } from './image-tool.js'
import { DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'
import { DEFAULT_IMAGE_MODELS, IMAGE_MODEL_CHOICES } from './image-models.mjs'
import {
  DEFAULT_CODEX_BASE_URL,
  openaiCodexResponsesImageAdapter,
  checkOAuthStatus,
} from './adapters/openai-codex.js'

const CODEX_PROVIDER_ID = 'openai-codex-oauth'
const CAPABILITIES_PATH = '/plugins/dsh-codex-supplement/capabilities'

export const name = 'dsh-codex-supplement-media'

export const Config = z.object({
  /** 总开关：与"勾选至少一个图像模型"共同决定是否注册生图工具。 */
  enableImageGeneration: z.boolean().default(false).volatile(),
  /** 模型清单（设置页逐行编辑）。空数组 = 不暴露生图工具；顺序即优先级，第一个是缺省档。 */
  imageModels: z.array(z.string()).default([...DEFAULT_IMAGE_MODELS]).volatile(),
  /** 生成结果另存目录（相对会话工作区）。 */
  imageOutputDir: z.string().default(DEFAULT_IMAGE_OUTPUT_DIR).volatile(),
  // ── 以下两项是旧配置形态，**只用于一次性迁移读取**，不再是选择的正源 ──
  /** @deprecated 用 `imageModels`；仅用于识别旧配置是否启用过订阅引擎。 */
  enableProviders: z.array(z.string()).default([]).volatile(),
  /** @deprecated 用 `imageModels`；仅用于识别旧配置是否显式关闭过。 */
  providerModelSelections: z.dict(z.object({
    models: z.array(z.string()).default([]),
    defaultModel: z.string().default(''),
  })).default({}).volatile(),
})

export const inject = ['tools', 'attachments', 'fs', 'sandboxPolicy']

function requestAllowed(request) {
  const origin = request.headers.origin
  if (origin !== undefined) {
    let hostname
    try {
      hostname = new URL(origin).hostname
    } catch {
      return false
    }
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') return false
  }
  return request.headers['sec-fetch-site'] !== 'cross-site'
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  }).end(JSON.stringify(value))
}

function snapshotConfig(config, ctx) {
  const read = (field, fallback) => {
    const value = config?.[field]
    if (value !== undefined && typeof value?.get === 'function') return value.get()
    return value === undefined ? fallback : value
  }
  return {
    enableImageGeneration: read('enableImageGeneration', false) === true,
    imageModels: read('imageModels', [...DEFAULT_IMAGE_MODELS]),
    imageOutputDir: read('imageOutputDir', DEFAULT_IMAGE_OUTPUT_DIR),
    providerModelSelections: read('providerModelSelections', {}),
    enableProviders: read('enableProviders', []),
    fs: ctx?.get?.('fs'),
    sandboxPolicy: ctx?.get?.('sandboxPolicy'),
  }
}

/** 当前 carrier（官方 Codex 对话模型），仅用于能力展示。 */
function currentCarrier(ctx) {
  try {
    const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
    if (selection?.provider === 'openai-codex' && typeof selection.model === 'string') return selection.model
  } catch { /* optional service */ }
  return undefined
}

export function apply(ctx, config) {
  const current = () => snapshotConfig(config, ctx)
  let registeredTools = []
  let toolDisposers = []
  let appliedSignature = ''

  const reconcileImage = () => {
    const cfg = current()
    const enabled = cfg.enableImageGeneration
    const models = selectedImageModels(current)
    const signature = JSON.stringify([enabled, models])
    if (signature === appliedSignature) return
    for (const dispose of toolDisposers) {
      try { dispose() } catch (error) {
        ctx.logger?.warn('dsh-codex-supplement: image tool cleanup failed')
        ctx.logger?.warn(error)
      }
    }
    toolDisposers = []
    registeredTools = []
    appliedSignature = signature
    // 勾选为空即不暴露工具：这正是"有对应勾选才把工具暴露在上下文"的落点。
    if (!enabled || models.length === 0) return

    const modelSelection = { models }
    try {
      toolDisposers.push(ctx.tools.register(imageToolDefinition(ctx, {
        current,
        name: IMAGE_TOOL_NAME,
        modelSelection,
      })))
      registeredTools = [IMAGE_TOOL_NAME]
    } catch (error) {
      ctx.logger?.error(`dsh-codex-supplement: failed to register ${IMAGE_TOOL_NAME}`)
      ctx.logger?.error(error)
    }
  }

  ctx.on('loader/volatile-update', () => {
    try { reconcileImage() } catch (error) {
      ctx.logger?.error('dsh-codex-supplement: failed to reconcile image tools after config update')
      ctx.logger?.error(error)
    }
  })

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => {
      const unregisterCapabilities = webCtx.webServer.register({
        kind: 'exact',
        path: CAPABILITIES_PATH,
        handler: async (request, response) => {
          if (!requestAllowed(request)) {
            sendJson(response, 403, { error: 'origin not allowed' })
            return
          }
          try {
            const auth = ctx.get('openaiCodexAuth')
            const oauth = await checkOAuthStatus(auth)
            const cfg = current()
            const models = selectedImageModels(current)
            // 顺序即优先级：清单第一个就是缺省档（不再有独立的 defaultImageModel 配置项）。
            const defaultModel = models[0]
            const protocol = {
              id: CODEX_PROVIDER_ID,
              name: openaiCodexResponsesImageAdapter.name,
              protocolId: openaiCodexResponsesImageAdapter.protocolId,
              capability: 'image_generation',
              auth: 'oauth',
              supported: true,
              executor: CODEX_PROVIDER_ID,
              modelRole: 'codex-carrier',
              defaultModel: openaiCodexResponsesImageAdapter.defaultResponsesModel,
              defaultBaseUrl: DEFAULT_CODEX_BASE_URL,
              available: oauth.loggedIn,
              availableReason: oauth.loggedIn ? '' : 'Not signed in to Codex',
            }
            sendJson(response, 200, {
              codexCarrier: currentCarrier(ctx),
              capability: {
                id: openaiCodexResponsesImageAdapter.id,
                name: openaiCodexResponsesImageAdapter.name,
                protocolId: openaiCodexResponsesImageAdapter.protocolId,
                auth: openaiCodexResponsesImageAdapter.auth,
                // `models` = 当前勾选（工具参数合法集）；`catalog` = 官方可选目录（设置页选项）。
                models,
                catalog: IMAGE_MODEL_CHOICES,
                defaultModel,
                carrierModel: openaiCodexResponsesImageAdapter.defaultResponsesModel,
                modelRole: 'image-model',
                inputs: openaiCodexResponsesImageAdapter.capabilities.inputs,
                outputs: openaiCodexResponsesImageAdapter.capabilities.outputs,
                supportsEdit: openaiCodexResponsesImageAdapter.capabilities.supportsEdit,
                enabled: cfg.enableImageGeneration,
                registeredTools: [...registeredTools],
                formats: openaiCodexResponsesImageAdapter.capabilities.formats,
                sizes: openaiCodexResponsesImageAdapter.capabilities.sizes,
                qualities: openaiCodexResponsesImageAdapter.capabilities.qualities,
                backgrounds: openaiCodexResponsesImageAdapter.capabilities.backgrounds,
                actions: openaiCodexResponsesImageAdapter.capabilities.actions,
              },
              oauth,
              presets: [protocol],
              capabilityEnum: ['image_generation'],
              protocols: [protocol],
            })
          } catch (error) {
            sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      })
      return unregisterCapabilities
    }, 'dsh-codex-supplement: capability routes')
  })

  reconcileImage()
}
