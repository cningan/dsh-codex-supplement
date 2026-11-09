import z from '@deepseek-ai/schemastery'
import { IMAGE_TOOL_NAME, imageToolDefinition, selectedImageModels, codexCarrierFromOfficialDefault } from './image-tool.js'
import { DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'
import { DEFAULT_IMAGE_MODELS, IMAGE_MODEL_CHOICES } from './image-models.mjs'
import { runMediaGeneration } from './executors.mjs'
import { resolveTestImageRequest, toPreviewImages } from './test-request.mjs'
import {
  DEFAULT_CODEX_BASE_URL,
  DEFAULT_IMAGE_QUALITY,
  openaiCodexResponsesImageAdapter,
  checkOAuthStatus,
} from './adapters/openai-codex.js'

const CODEX_PROVIDER_ID = 'openai-codex-oauth'
const CAPABILITIES_PATH = '/plugins/dsh-codex-supplement/capabilities'
/** 设置页“试生图”的一次性诊断路由（不写工作区、不注册工具）。 */
const TEST_IMAGE_PATH = '/plugins/dsh-codex-supplement/codex/test-image'

export const name = 'dsh-codex-supplement-media'

export const Config = z.object({
  /** 总开关：与"勾选至少一个图像模型"共同决定是否注册生图工具。 */
  enableImageGeneration: z.boolean().default(false).volatile(),
  /** 模型清单（设置页逐行编辑）。空数组 = 不暴露生图工具；顺序即优先级，第一个是缺省档。 */
  imageModels: z.array(z.string()).default([...DEFAULT_IMAGE_MODELS]).volatile(),
  /** 缺省质量档（工具调用不传 `quality` 时使用）。出厂 `auto` = 服务端按提示词自决。 */
  imageQuality: z.string().default(DEFAULT_IMAGE_QUALITY).volatile(),
  /** 缺省复杂度（2.6 起；空串 = 交给模型默认，不上送）。 */
  imageComplexity: z.string().default('').volatile(),
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

/** 读取 JSON 请求体（过大或不可解析时抛错）。 */
async function readJsonBody(request, maxBytes = 256 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBytes) throw new Error('request body too large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim().length === 0) return {}
  const parsed = JSON.parse(text)
  return parsed !== null && typeof parsed === 'object' ? parsed : {}
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
    imageQuality: read('imageQuality', DEFAULT_IMAGE_QUALITY),
    imageComplexity: read('imageComplexity', ''),
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
    const signature = JSON.stringify([enabled, models, cfg.imageQuality, cfg.imageComplexity])
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
                defaultQuality: cfg.imageQuality ?? DEFAULT_IMAGE_QUALITY,
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
                complexities: openaiCodexResponsesImageAdapter.capabilities.complexities,
                backgrounds: openaiCodexResponsesImageAdapter.capabilities.backgrounds,
                actions: openaiCodexResponsesImageAdapter.capabilities.actions,
                defaultComplexity: cfg.imageComplexity ?? '',
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
      const unregisterTest = webCtx.webServer.register({
        kind: 'exact',
        path: TEST_IMAGE_PATH,
        handler: async (request, response) => {
          if (!requestAllowed(request)) {
            sendJson(response, 403, { error: 'origin not allowed' })
            return
          }
          if (request.method !== 'POST') {
            sendJson(response, 405, { error: 'method not allowed' })
            return
          }
          const started = Date.now()
          let requested
          try {
            const body = await readJsonBody(request)
            const cfg = current()
            const models = selectedImageModels(current)
            const auth = ctx.get('openaiCodexAuth')
            if (auth === undefined) throw new Error('Codex sign-in service is unavailable')
            let credential
            try { credential = await auth.credential() } catch { credential = undefined }
            if (credential === undefined) throw new Error('Sign in to Codex before testing image generation')
            const resolved = resolveTestImageRequest({ body, config: cfg, selectedModels: models })
            requested = resolved.requested
            const carrierModel = codexCarrierFromOfficialDefault(ctx)
            const result = await runMediaGeneration({
              protocolId: openaiCodexResponsesImageAdapter.protocolId,
              request: {
                ...resolved.request,
                ...(carrierModel === undefined ? {} : { carrierModel }),
              },
              credential,
              http: auth.http ?? globalThis.fetch,
            })
            sendJson(response, 200, {
              ok: true,
              ms: Date.now() - started,
              requested,
              effective: result.effective ?? null,
              carrier: result.carrierModel,
              images: toPreviewImages(result.images),
              note: 'Each test click consumes one real subscription image.',
            })
          } catch (error) {
            sendJson(response, 200, {
              ok: false,
              ms: Date.now() - started,
              ...(requested === undefined ? {} : { requested }),
              error: error instanceof Error ? error.message : String(error),
            })
          }
        },
      })
      return () => {
        unregisterCapabilities()
        unregisterTest()
      }
    }, 'dsh-codex-supplement: capability and test routes')
  })

  reconcileImage()
}
