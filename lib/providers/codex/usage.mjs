/**
 * Codex subscription usage normalization and short-lived tracking.
 *
 * Reads ChatGPT's official `wham/usage` endpoint and exposes stable plan,
 * quota-window, and reset-time fields to the Client presentation. Credential
 * refresh and proxy-aware HTTP are injected by the Codex auth service.
 * @module dsh-codex-supplement/codex-usage
 */

export const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage'
export const USAGE_CACHE_MS = 30_000
export const USAGE_REQUEST_TIMEOUT_MS = 8_000

/** 归一化 wham/usage 响应为稳定展示字段。 */
export function normalizeUsage(value) {
  const root = value !== null && typeof value === 'object' ? value : {}
  const limits = root.rate_limit !== null && typeof root.rate_limit === 'object' ? root.rate_limit : {}
  const credits =
    root.rate_limit_reset_credits !== null && typeof root.rate_limit_reset_credits === 'object'
      ? root.rate_limit_reset_credits
      : undefined
  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)
  const windowOf = (w) => {
    if (w === null || typeof w !== 'object') return undefined
    const usedPercent = num(w.used_percent ?? w.usedPercent)
    if (usedPercent === undefined) return undefined
    return {
      usedPercent: Math.max(0, Math.min(100, usedPercent)),
      ...(num(w.limit_window_seconds ?? w.windowDurationSecs) !== undefined
        ? { windowSeconds: num(w.limit_window_seconds ?? w.windowDurationSecs) }
        : {}),
      ...(num(w.reset_at ?? w.resetsAt) !== undefined
        ? { resetAt: num(w.reset_at ?? w.resetsAt) }
        : {}),
    }
  }
  return {
    ...(typeof root.plan_type === 'string' ? { planType: root.plan_type } : {}),
    ...(windowOf(limits.primary_window ?? limits.primary) !== undefined
      ? { primary: windowOf(limits.primary_window ?? limits.primary) }
      : {}),
    ...(windowOf(limits.secondary_window ?? limits.secondary) !== undefined
      ? { secondary: windowOf(limits.secondary_window ?? limits.secondary) }
      : {}),
    ...(typeof limits.limit_reached === 'boolean' ? { limitReached: limits.limit_reached } : {}),
    ...(num(credits?.available_count) !== undefined
      ? { resetCredits: num(credits.available_count) }
      : {}),
    fetchedAt: Date.now(),
  }
}

/** 查询订阅用量端点（凭据已由调用方保证有效；http 为可选代理出口）。 */
export async function fetchCodexUsage(usageUrl, access, accountId, http) {
  if (typeof access !== 'string' || access.length === 0) throw new Error('OpenAI login is missing')
  const request = http ?? globalThis.fetch
  const response = await request(usageUrl, {
    signal: AbortSignal.timeout(USAGE_REQUEST_TIMEOUT_MS),
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${access}`,
      'chatgpt-account-id': accountId,
      'user-agent': 'dsh-codex-supplement/0.1',
    },
  })
  if (!response.ok) {
    throw new Error(`Codex usage request failed (HTTP ${response.status})`)
  }
  return normalizeUsage(await response.json())
}

/**
 * 用量追踪器：30s 缓存 + 错误留存（照旧插件 Auth.status 的缓存语义）。
 * @param {object} deps
 * @param {Function} deps.readCredential - () => Promise<credential|undefined>
 * @param {Function} [deps.http] - (url, init) => Promise<Response>
 * @param {string} [deps.usageUrl]
 * @param {number} [deps.cacheMs]
 */
export class CodexUsageTracker {
  constructor({ readCredential, http, usageUrl = CODEX_USAGE_URL, cacheMs = USAGE_CACHE_MS } = {}) {
    if (typeof readCredential !== 'function') throw new Error('usage tracker requires readCredential')
    this.readCredential = readCredential
    this.http = http
    this.usageUrl = usageUrl
    this.cacheMs = cacheMs
    this.usageCache = undefined
    this.usageError = undefined
  }

  /** 清缓存（登录/登出后调用）。 */
  reset() {
    this.usageCache = undefined
    this.usageError = undefined
  }

  /** 同步读当前缓存（不触发任何网络/刷新；status 路由用，保证秒回）。 */
  peek() {
    return { usage: this.usageCache, usageError: this.usageError }
  }

  /**
   * 读取用量（带 30s 缓存；refresh=true 强制刷新）。
   * @returns {Promise<{usage: object|undefined, usageError: string|undefined}>}
   */
  async get({ refresh = false } = {}) {
    const credential = await this.readCredential()
    if (credential === undefined) return { usage: undefined, usageError: undefined }
    if (refresh || this.usageCache === undefined || Date.now() - this.usageCache.fetchedAt > this.cacheMs) {
      try {
        const access = credential.access
        const accountId =
          (typeof credential.accountId === 'string' && credential.accountId.length > 0)
            ? credential.accountId
            : ''
        this.usageCache = await fetchCodexUsage(this.usageUrl, access, accountId, this.http)
        this.usageError = undefined
      } catch (error) {
        this.usageError = error instanceof Error ? error.message : String(error)
      }
    }
    return { usage: this.usageCache, usageError: this.usageError }
  }
}

export const codexUsageConstants = Object.freeze({
  usageUrl: CODEX_USAGE_URL,
  cacheMs: USAGE_CACHE_MS,
  timeoutMs: USAGE_REQUEST_TIMEOUT_MS,
})
