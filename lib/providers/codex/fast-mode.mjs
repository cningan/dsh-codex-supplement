/**
 * Codex Fast Mode state mirror and route.
 *
 * Enabled model ids are persisted by FastModeStore. The official Codex provider
 * owns chat transport, so `installCodexServiceTierInjector` in shared/proxy.mjs
 * applies `service_tier: priority` at its fetch boundary. Failed persistence
 * rolls back the in-memory state.
 * @module dsh-codex-supplement/codex-fast-mode
 */

export const CODEX_FAST_MODE_PATH = '/plugins/dsh-codex-supplement/codex/fast-mode'
export const CODEX_FAST_MODE_MAX_MODELS = 256
export const CODEX_FAST_MODE_MAX_MODEL_ID_LENGTH = 256
export const CODEX_FAST_MODE_BODY_LIMIT = 4_096

export function isFastModeModelId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= CODEX_FAST_MODE_MAX_MODEL_ID_LENGTH
}

/** 正数集合：只保存开启项，关闭项直接删除，避免无界增长。 */
export class FastModeRegistry {
  constructor(maxModels = CODEX_FAST_MODE_MAX_MODELS) {
    if (!Number.isSafeInteger(maxModels) || maxModels < 1 || maxModels > CODEX_FAST_MODE_MAX_MODELS) {
      throw new RangeError('Fast Mode registry capacity is out of bounds')
    }
    this.maxModels = maxModels
    this.enabled = new Set()
  }

  isEnabled(modelId) {
    return isFastModeModelId(modelId) && this.enabled.has(modelId)
  }

  /** 当前开启的模型 id 列表（状态路由/设置卡用）。 */
  models() {
    return [...this.enabled]
  }

  set(modelId, enabled) {
    if (!isFastModeModelId(modelId)) throw new TypeError('Invalid Fast Mode model id')
    if (typeof enabled !== 'boolean') throw new TypeError('Fast Mode enabled must be boolean')
    if (!enabled) {
      this.enabled.delete(modelId)
      return
    }
    if (!this.enabled.has(modelId) && this.enabled.size >= this.maxModels) {
      throw new RangeError('Fast Mode model registry is full')
    }
    this.enabled.add(modelId)
  }

  /** Replace the runtime mirror from the validated settings value. */
  replace(models) {
    if (models !== undefined && (typeof models !== 'object' || models === null || Array.isArray(models))) {
      throw new TypeError('Fast Mode models must be an object')
    }
    const next = []
    for (const [modelId, enabled] of Object.entries(models ?? {})) {
      if (enabled !== true || !isFastModeModelId(modelId)) continue
      if (next.length >= this.maxModels) break
      next.push(modelId)
    }
    this.enabled.clear()
    for (const modelId of next) this.enabled.add(modelId)
  }

  clear() {
    this.enabled.clear()
  }
}

function header(request, name) {
  const value = request.headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

function contentLength(request) {
  const raw = header(request, 'content-length')
  if (raw === undefined) return undefined
  if (!/^\d+$/.test(raw.trim())) throw new TypeError('Fast Mode request content length is invalid')
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) throw new TypeError('Fast Mode request content length is invalid')
  return value
}

async function readJsonBody(request) {
  const declared = contentLength(request)
  if (declared !== undefined && declared > CODEX_FAST_MODE_BODY_LIMIT) {
    throw new RangeError('Fast Mode request body is too large')
  }
  const chunks = []
  let total = 0
  if (typeof request[Symbol.asyncIterator] === 'function') {
    for await (const chunk of request) {
      const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk)
      total += bytes.byteLength
      if (total > CODEX_FAST_MODE_BODY_LIMIT) throw new RangeError('Fast Mode request body is too large')
      chunks.push(bytes)
    }
  } else {
    const body = request.body
    if (typeof body === 'string') chunks.push(Buffer.from(body))
    else if (body instanceof Uint8Array) chunks.push(new Uint8Array(body))
    else if (body !== undefined) throw new TypeError('Fast Mode request body is invalid')
    total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    if (total > CODEX_FAST_MODE_BODY_LIMIT) throw new RangeError('Fast Mode request body is too large')
  }
  if (chunks.length === 0) throw new TypeError('Fast Mode request body is invalid')
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new TypeError('Fast Mode request body is invalid')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new TypeError('Fast Mode request body is invalid')
  }
}

function modelFromQuery(request) {
  if (typeof request.url !== 'string') return undefined
  try {
    const url = new URL(request.url, 'http://dsh.invalid')
    const values = url.searchParams.getAll('model')
    return values.length === 1 && isFastModeModelId(values[0]) ? values[0] : undefined
  } catch {
    return undefined
  }
}

function parseBody(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const keys = Object.keys(value)
  if (keys.length !== 2 || !keys.includes('model') || !keys.includes('enabled')) return undefined
  return isFastModeModelId(value.model) && typeof value.enabled === 'boolean'
    ? { model: value.model, enabled: value.enabled }
    : undefined
}

function json(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(value))
}

/** 注册 codex 自己的 GET/POST Fast mode 控制路由（同源 webServer）。 */
export function registerFastModeRoute(webServer, registry, authorize, persist) {
  return webServer.register({
    kind: 'exact',
    path: CODEX_FAST_MODE_PATH,
    handler: async (request, response) => {
      if (!authorize(request)) {
        // 2026-09-22：403 回报判定依据（origin / sec-fetch-site / host）——桌面端 app://dsh
        // 之类的特权源曾被旧版 localhost-only 规则误拒，带上依据才定位得快。
        json(response, 403, {
          error: 'origin not allowed',
          origin: request?.headers?.origin ?? null,
          secFetchSite: request?.headers?.['sec-fetch-site'] ?? null,
          host: request?.headers?.host ?? null,
        })
        return
      }
      if (request.method !== 'GET' && request.method !== 'POST') {
        json(response, 405, { error: 'method not allowed' })
        return
      }
      if (request.method === 'GET') {
        const model = modelFromQuery(request)
        if (model === undefined) {
          json(response, 400, { error: 'invalid input' })
          return
        }
        json(response, 200, { enabled: registry.isEnabled(model) })
        return
      }
      const type = header(request, 'content-type')
      if (type === undefined || !/^application\/json(?:\s*;|$)/i.test(type.trim())) {
        json(response, 415, { error: 'unsupported content type' })
        return
      }
      try {
        const body = parseBody(await readJsonBody(request))
        if (body === undefined) {
          json(response, 400, { error: 'invalid input' })
          return
        }
        if (persist === undefined) registry.set(body.model, body.enabled)
        else await persist(body.model, body.enabled)
        json(response, 200, { enabled: registry.isEnabled(body.model) })
      } catch (error) {
        const tooLarge = error instanceof RangeError && /body is too large/i.test(error.message)
        json(response, tooLarge ? 413 : 500, {
          error: tooLarge ? 'request body too large' : 'Fast Mode could not be saved',
        })
      }
    },
  })
}

export const codexFastModeConstants = Object.freeze({
  path: CODEX_FAST_MODE_PATH,
  maxModels: CODEX_FAST_MODE_MAX_MODELS,
})
