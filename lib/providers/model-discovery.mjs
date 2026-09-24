/**
 * Codex model discovery primitives used by the Codex picker.
 *
 * The active Codex spec uses the official Codex catalog path and a successful-result
 * memory cache. Other generic protocol branches remain an internal compatibility seam,
 * but no non-Codex provider is registered by this package.
 * @module dsh-codex-supplement/model-discovery
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { isoFromEpoch } from '../shared/provider-utils.mjs'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_CACHE_TTL_MS = 60_000

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringOrNull(value) {
  return value === undefined || value === null || value === '' ? null : String(value)
}

function capacity(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) return candidate
  }
  return null
}

/**
 * 归一化远程模型列表（hanako providers.ts 219-247 原样移植）。
 * @param {object} data 远程响应体
 * @param {string} api 协议 id（openai-completions / anthropic-messages / google-generative-ai）
 */
export function normalizeRemoteModels(data, api) {
  if (api === 'anthropic-messages') {
    return (data?.data || []).map((model) => ({
      id: String(model.id ?? ''),
      name: stringOrNull(model.display_name) ?? String(model.id ?? ''),
      context: capacity(model.max_input_tokens),
      maxOutput: capacity(model.max_tokens),
    })).filter((model) => model.id)
  }
  if (api === 'google-generative-ai') {
    return (data?.models || []).map((model) => {
      const id = model.baseModelId || String(model.name || '').replace(/^models\//, '')
      return {
        id,
        name: stringOrNull(model.displayName) ?? id,
        context: capacity(model.inputTokenLimit),
        maxOutput: capacity(model.outputTokenLimit),
      }
    }).filter((model) => model.id)
  }
  return (data?.data || []).map((model) => ({
    id: String(model.id ?? ''),
    name: String(model.id ?? ''),
    context: capacity(model.context_length, model.context_window, model.max_context_length),
    maxOutput: capacity(model.max_completion_tokens, model.max_output_tokens),
  })).filter((model) => model.id)
}

/**
 * 远程 GET /models（hanako 337-424 的 step 2）。
 * 401/403 抛 `noFallback` 错误；其它失败挂 `fallback=true`（进入静态兜底）。
 * @param {object} opts - { baseUrl, api, headers, http, signal, timeoutMs }
 * @returns {Promise<Array<{id,name,context,maxOutput}>>}
 */
export async function fetchRemoteModels({ baseUrl, api, headers, http, signal, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const request = http ?? globalThis.fetch
  const base = String(baseUrl || '').replace(/\/+$/, '')
  if (!base) {
    const error = new Error('no models endpoint: baseUrl is empty')
    error.fallback = true
    throw error
  }
  const url = api === 'anthropic-messages'
    ? `${base}/v1/models?limit=1000`
    : `${base}/models`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const external = signal
  const abortFromCaller = () => controller.abort()
  if (external?.aborted) controller.abort()
  else external?.addEventListener?.('abort', abortFromCaller, { once: true })
  try {
    const response = await request(url, {
      method: 'GET',
      headers: { accept: 'application/json', ...(headers || {}) },
      signal: controller.signal,
    })
    if (response.status === 401 || response.status === 403) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText || 'credentials rejected'}`)
      error.status = response.status
      error.noFallback = true
      throw error
    }
    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return normalizeRemoteModels(data, api)
    }
    const error = new Error(`HTTP ${response.status} from ${url}`)
    error.status = response.status
    error.fallback = true
    throw error
  } catch (error) {
    if (error?.noFallback) throw error
    if (error?.fallback) throw error
    const wrapped = new Error(`model discovery request failed: ${error instanceof Error ? error.message : String(error)}`)
    wrapped.cause = error
    wrapped.fallback = true
    throw wrapped
  } finally {
    clearTimeout(timer)
    external?.removeEventListener?.('abort', abortFromCaller)
  }
}

/**
 * registry/默认目录兜底（hanako 289-325 的 registryOrDefaultsFallback 简化版：
 * dsh-oauth 的「registry 默认清单」= spec.models.static，即 lib/providers/<id>/ 的静态目录）。
 * @param {Array<{id:string,name?:string}>} staticModels
 */
export function registryOrDefaultsFallback(staticModels) {
  const defaults = Array.isArray(staticModels) ? staticModels.filter((entry) => entry?.id) : []
  if (defaults.length === 0) {
    return { error: 'No models found for provider', models: [], source: 'none' }
  }
  return {
    source: 'builtin',
    models: defaults.map((entry) => ({
      id: entry.id,
      name: entry.name || entry.id,
      context: entry.context ?? null,
      maxOutput: entry.maxOutput ?? null,
    })),
  }
}

/**
 * provider 模型发现工厂（统一返回 `{ models, source, diagnostics }`，失败也回退静态目录）。
 *
 * @param {object} opts
 * @param {object} opts.spec - normalizeOAuthSpec 结果（models.mode: 'remote' | 'registry'）
 * @param {Function} opts.credential - async () => credential（登录 token）| undefined
 * @param {Function} [opts.http]
 * @param {number} [opts.cacheTtlMs]
 * @param {string} [opts.cacheFile] - 模型清单文件缓存（照 hanako models-cache.json 落盘；
 *   首次启用时读取上次成功结果作种子，成功后回写；失败仍走静态目录兜底）。
 */
export function createProviderModelDiscovery({ spec, credential, http, cacheTtlMs = DEFAULT_CACHE_TTL_MS, cacheFile } = {}) {
  const mode = spec?.models?.mode ?? 'registry'
  const staticModels = spec?.models?.static ?? []
  let cached = null
  let cachedAt = 0
  let pending = null
  let fileLoaded = false

  /** 读取文件缓存（best-effort：坏文件/写失败都不阻断发现流程）。 */
  async function loadFileCache() {
    if (!cacheFile) return
    try {
      const parsed = JSON.parse(await readFile(cacheFile, 'utf8'))
      if (!parsed || typeof parsed !== 'object') return
      const models = Array.isArray(parsed.models) ? parsed.models : null
      if (!Array.isArray(models)) return
      const fetchedAt = Number(parsed.fetchedAt)
      cached = { models, source: typeof parsed.source === 'string' ? parsed.source : 'file', diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [] }
      cachedAt = Number.isFinite(fetchedAt) && fetchedAt > 0 ? fetchedAt : Date.now()
    } catch {
      // 无文件/坏文件：忽略，走动态发现
    }
  }

  /** 回写文件缓存（best-effort；目录自动创建）。 */
  async function saveFileCache(result) {
    if (!cacheFile) return
    try {
      await mkdir(dirname(cacheFile), { recursive: true })
      await writeFile(cacheFile, JSON.stringify({ fetchedAt: Date.now(), models: result.models, source: result.source, diagnostics: result.diagnostics || [] }), 'utf8')
    } catch {
      // 写失败不阻断（只为持久化）
    }
  }

  return async function discover({ force = false, account = null, fast = false } = {}) {
    if (fast) {
      // 快速路径（status 路由用）：只用已知道的目录（内存 → 文件缓存），绝不发起网络；
      // 否则后台触发刷新（best-effort）并立即返回当前最好结果——登录态 UI 秒开不卡。
      // （2026-09-03：修"每次进设置页先显示未登录、过几秒才反应过来"——原 status
      //  await modelDiscovery() 网络 GET /models 最长 15s 超时。）
      if (cached) return cached
      if (!fileLoaded) {
        fileLoaded = true
        await loadFileCache()
        if (cached) return cached
      }
      void discover({ account })
      const fallback = registryOrDefaultsFallback(staticModels)
      return { ...fallback, diagnostics: ['模型目录刷新中；点「获取模型」可立即拉取。'] }
    }
    const now = Date.now()
    if (!force && cached && now - cachedAt < cacheTtlMs) return cached
    // 首次 miss：文件缓存作种子（上次成功结果跨重启复用）
    if (!fileLoaded) {
      fileLoaded = true
      await loadFileCache()
      if (!force && cached && Date.now() - cachedAt < cacheTtlMs) return cached
    }
    if (pending && !force) return pending
    pending = (async () => {
      const result = await resolveModels({ account })
      // 只记忆成功（「获取后记忆」）；失败下次重试，让刷新后的 token 被拾取。
      if (result.diagnostics.length === 0) {
        cached = result
        cachedAt = Date.now()
        await saveFileCache(result)
      }
      return result
    })().finally(() => { pending = null })
    return pending
  }

  async function resolveModels({ account }) {
    // codex 订阅（registry 模式）：hanako 对 openai-codex-responses 的直接返回，不 GET /models。
    if (mode === 'registry') {
      const fallback = registryOrDefaultsFallback(staticModels)
      return { models: fallback.models, source: fallback.source, diagnostics: [] }
    }
    // remote 模式：token → GET {base}/models；401/403 报错不兜底；其它失败静态兜底。
    const api = spec.models.api || spec.accessPoint?.api || 'openai-completions'
    const cred = await (typeof credential === 'function' ? credential() : Promise.resolve(credential))
    if (!cred?.access) {
      const fallback = registryOrDefaultsFallback(staticModels)
      return { models: fallback.models, source: fallback.source, diagnostics: ['未登录：暂无模型清单（登录后点「获取模型」拉取）。'] }
    }
    const baseUrl = spec.accessPoint?.baseUrl || ''
    const headers = await (typeof spec.headersFor === 'function' ? spec.headersFor(cred) : spec.headersFor)
    try {
      const models = await fetchRemoteModels({ baseUrl, api, headers, http, timeoutMs: spec.timeoutMs ?? DEFAULT_TIMEOUT_MS })
      const seen = new Set()
      const merged = [...models].filter((model) => model.id && !seen.has(model.id) ? (seen.add(model.id), true) : false)
      return { models: merged, source: 'remote', diagnostics: [] }
    } catch (error) {
      if (error?.noFallback) {
        return {
          models: [],
          source: 'remote',
          diagnostics: [`远程模型目录被拒（${error.message}）：请重新登录或检查订阅额度。`],
        }
      }
      const fallback = registryOrDefaultsFallback(staticModels)
      return {
        models: fallback.models,
        source: fallback.source,
        diagnostics: [`远程 GET /models 失败（${error instanceof Error ? error.message : String(error)}），暂无模型清单（可点「获取模型」重试）。`],
      }
    }
  }
}

/** 模型 id 是否合法（供注册目录过滤，简单起见不额外限制）。 */
export function isValidModelId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/:+-]{0,127}$/.test(id)
}

export const modelDiscoveryConstants = Object.freeze({
  defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
  defaultCacheTtlMs: DEFAULT_CACHE_TTL_MS,
})

// 供外部复用的小工具：用 token 的 JWT exp 计算过期时间（isoFromEpoch 已在 shared）。
export { isoFromEpoch }
