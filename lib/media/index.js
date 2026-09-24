import z from '@deepseek-ai/schemastery'
import { imageToolDefinition } from './image-tool.js'
import { DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'
import { resolveSelectedModelIds } from './model-selection.mjs'
import {
  DEFAULT_CODEX_BASE_URL,
  openaiCodexResponsesImageAdapter,
  checkOAuthStatus,
} from './adapters/openai-codex.js'

const CODEX_PROVIDER_ID = 'openai-codex-oauth'
const CAPABILITIES_PATH = '/plugins/dsh-codex-supplement/capabilities'
const IMAGE_MODELS_PATH = '/plugins/dsh-codex-supplement/models'

export const name = 'dsh-codex-supplement-media'

export const Config = z.object({
  enableImageGeneration: z.boolean().default(false).volatile(),
  // Kept only to seed the Codex managed-image choice when migrating the old config shape.
  enableProviders: z.array(z.string()).default([]).volatile(),
  providerModelSelections: z.dict(z.object({
    models: z.array(z.string()).default([]),
    defaultModel: z.string().default(''),
  })).default({}).volatile(),
  imageOutputDir: z.string().default(DEFAULT_IMAGE_OUTPUT_DIR).volatile(),
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

function selectedModels(config) {
  return resolveSelectedModelIds({
    providerId: CODEX_PROVIDER_ID,
    selections: config?.providerModelSelections,
    legacyEnabled: Array.isArray(config?.enableProviders)
      && config.enableProviders.map(String).includes(CODEX_PROVIDER_ID),
    defaultModel: openaiCodexResponsesImageAdapter.defaultModel,
    modelRole: 'codex-carrier',
  })
}

function imageModelSelection(config) {
  const models = selectedModels(config)
  if (models.length === 0) return undefined
  return {
    models,
    defaultModel: '',
    description: 'Codex subscription-managed image engine; the official Codex model is only the Responses carrier.',
  }
}

function snapshotConfig(config, ctx) {
  const read = (field, fallback) => {
    const value = config?.[field]
    if (value !== undefined && typeof value?.get === 'function') return value.get()
    return value === undefined ? fallback : value
  }
  return {
    enableImageGeneration: read('enableImageGeneration', false) === true,
    enableProviders: read('enableProviders', []),
    providerModelSelections: read('providerModelSelections', {}),
    imageOutputDir: read('imageOutputDir', DEFAULT_IMAGE_OUTPUT_DIR),
    fs: ctx?.get?.('fs'),
    sandboxPolicy: ctx?.get?.('sandboxPolicy'),
  }
}

export function apply(ctx, config) {
  const current = () => snapshotConfig(config, ctx)
  const registeredTools = []
  let toolDisposers = []
  let appliedSignature = ''

  const reconcileImage = () => {
    const cfg = current()
    const enabled = cfg.enableImageGeneration
    const models = selectedModels(cfg)
    const signature = `${enabled}|${JSON.stringify(cfg.providerModelSelections ?? {})}|${cfg.enableProviders.join(',')}`
    if (signature === appliedSignature) return
    for (const dispose of toolDisposers) {
      try { dispose() } catch (error) {
        ctx.logger?.warn('dsh-codex-supplement: image tool cleanup failed')
        ctx.logger?.warn(error)
      }
    }
    toolDisposers = []
    registeredTools.length = 0
    appliedSignature = signature
    if (!enabled || models.length === 0) return

    const modelSelection = imageModelSelection(cfg)
    const register = (name) => {
      try {
        toolDisposers.push(ctx.tools.register(imageToolDefinition(ctx, {
          current,
          name,
          includeProvider: false,
          forcedProvider: CODEX_PROVIDER_ID,
          modelSelection,
        })))
        registeredTools.push(name)
      } catch (error) {
        ctx.logger?.error(`dsh-codex-supplement: failed to register ${name}`)
        ctx.logger?.error(error)
      }
    }
    // Keep both established tool names for existing sessions and current workflows.
    register('codex-generate-image')
    register('media-image-codex')
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
            let codexCarrier
            try {
              const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
              if (selection?.provider === 'openai-codex' && typeof selection.model === 'string') {
                codexCarrier = selection.model
              }
            } catch { /* optional service; the adapter keeps its known-good fallback */ }
            const protocol = {
              id: CODEX_PROVIDER_ID,
              name: openaiCodexResponsesImageAdapter.name,
              protocolId: openaiCodexResponsesImageAdapter.protocolId,
              capability: 'image_generation',
              auth: 'oauth',
              supported: true,
              executor: CODEX_PROVIDER_ID,
              modelRole: 'codex-carrier',
              defaultModel: openaiCodexResponsesImageAdapter.defaultModel,
              defaultBaseUrl: DEFAULT_CODEX_BASE_URL,
              available: oauth.loggedIn,
              availableReason: oauth.loggedIn ? '' : 'Not signed in to Codex',
            }
            sendJson(response, 200, {
              codexCarrier,
              capability: {
                id: openaiCodexResponsesImageAdapter.id,
                name: openaiCodexResponsesImageAdapter.name,
                protocolId: openaiCodexResponsesImageAdapter.protocolId,
                auth: openaiCodexResponsesImageAdapter.auth,
                defaultModel: openaiCodexResponsesImageAdapter.defaultModel,
                modelRole: openaiCodexResponsesImageAdapter.modelRole,
                models: openaiCodexResponsesImageAdapter.capabilities.models,
                inputs: openaiCodexResponsesImageAdapter.capabilities.inputs,
                outputs: openaiCodexResponsesImageAdapter.capabilities.outputs,
                supportsEdit: openaiCodexResponsesImageAdapter.capabilities.supportsEdit,
                enabled: cfg.enableImageGeneration,
                registeredTools: [...registeredTools],
                formats: openaiCodexResponsesImageAdapter.capabilities.formats,
                sizes: openaiCodexResponsesImageAdapter.capabilities.sizes,
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
      const unregisterModels = webCtx.webServer.register({
        kind: 'exact',
        path: IMAGE_MODELS_PATH,
        handler: async (request, response) => {
          if (!requestAllowed(request)) {
            sendJson(response, 403, { error: 'origin not allowed' })
            return
          }
          sendJson(response, 200, {
            models: [],
            source: 'managed-by-codex',
            fetchedAt: new Date().toISOString(),
          })
        },
      })
      return () => { unregisterModels(); unregisterCapabilities() }
    }, 'dsh-codex-supplement: capability routes')
  })

  reconcileImage()
}
