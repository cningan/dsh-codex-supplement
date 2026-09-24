/**
 * Codex subscription search provider.
 *
 * Registers the stable `openai-codex` web-search provider id and calls ChatGPT's
 * Codex search endpoint with `search_query`. Credentials and proxy-aware HTTP are
 * supplied by the Codex auth service; the provider sanitizes auth failures and
 * leaves switching the active `web` provider to the explicit settings control.
 * @module dsh-codex-supplement/codex-search
 */

/** 与旧插件保持一致：用户已配置的 web.searchProvider=openai-codex 无需迁移。 */
export const CODEX_SEARCH_PROVIDER = 'openai-codex'
const CODEX_SEARCH_URL = 'https://chatgpt.com/backend-api/codex/alpha/search'

/** 错误消息去 JWT 与查询参数中的敏感材料。 */
function providerMessage(value) {
  if (typeof value !== 'object' || value === null) return undefined
  const error = value['error']
  const raw =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && typeof error['message'] === 'string'
        ? error['message']
        : typeof value['message'] === 'string'
          ? value['message']
          : undefined
  return raw
    ?.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[REDACTED]')
    .slice(0, 1000)
}

/** 从 OAuth access token 提取 chatgpt_account_id（搜索/图片端点必需）。 */
export function accountIdFromToken(access) {
  try {
    const parts = access.split('.')
    if (parts.length !== 3 || parts[1] === undefined) throw new Error('invalid JWT')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    const auth = payload?.['https://api.openai.com/auth']
    if (typeof auth !== 'object' || auth === null) throw new Error('missing auth claim')
    const accountId = auth['chatgpt_account_id']
    if (typeof accountId !== 'string' || accountId.length === 0) throw new Error('missing account id')
    return accountId
  } catch (error) {
    throw new Error('OpenAI Codex credential has no usable account id; sign in again', { cause: error })
  }
}

function externalWebAccess(mode) {
  switch (mode) {
    case 'cached': return false
    case 'indexed': return 'indexed'
    case 'live': return true
    default: return false
  }
}

/** 解析搜索响应为 dsh web 结果词汇（content + sources）。 */
function mapSearchResponse(payload) {
  let content = ''
  const sources = []
  const seen = new Set()
  const addSource = (source) => {
    if (source && typeof source.url === 'string' && source.url.length > 0 && !seen.has(source.url)) {
      seen.add(source.url)
      sources.push({
        url: source.url,
        ...(typeof source.title === 'string' && source.title.length > 0 ? { title: source.title } : {}),
        ...(typeof source.snippet === 'string' && source.snippet.length > 0 ? { snippet: source.snippet } : {}),
      })
    }
  }
  const output = Array.isArray(payload?.output) ? payload.output : []
  for (const item of output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const block of item.content) {
        if ((block?.type === 'output_text' || block?.type === 'text') && typeof block.text === 'string') {
          content += (content.length === 0 ? '' : '\n\n') + block.text
        }
        for (const annotation of block?.annotations ?? []) {
          if (annotation?.type === 'url_citation') {
            addSource(annotation.url_citation ?? annotation)
          }
        }
      }
    }
    if (item?.type === 'web_search_call') {
      for (const result of item.results ?? item.action?.results ?? []) {
        addSource(result)
      }
    }
  }
  if (content.length === 0 && typeof payload?.output_text === 'string') {
    content = payload.output_text
  }
  return { content, sources, truncated: false }
}

/**
 * dsh web 搜索 provider 实现。
 * @param {object} options
 * @param {Function} options.credentials - () => Promise<credential|undefined>（含 access/accountId）
 * @param {Function} [options.http] - (url, init) => Promise<Response>（应经 shared/proxy.mjs openaiFetch）
 * @param {string} options.model - 搜索用模型 id
 * @param {string} [options.mode] - 'cached' | 'indexed' | 'live'
 * @param {string} [options.contextSize] - 'low' | 'medium' | 'high'
 * @param {number} [options.maxOutputTokens]
 * @param {Function} [options.resolveRequestId] - () => string 请求 id
 */
export class CodexSearchProvider {
  constructor(options) {
    this.options = options
  }

  get id() {
    return CODEX_SEARCH_PROVIDER
  }

  available() {
    return (
      typeof this.options.model === 'string' && this.options.model.length > 0
      && Number.isInteger(this.options.maxOutputTokens) && this.options.maxOutputTokens > 0
    )
  }

  async search(request, signal) {
    if (signal?.aborted) throw new Error('OpenAI Codex search aborted')
    const credential = await this.options.credentials()
    if (credential === undefined || (typeof credential.access !== 'string' || credential.access.length === 0)) {
      throw new Error('OpenAI Codex search is signed out; sign in in Settings > OAuth > ChatGPT')
    }
    let access = credential.access
    // 适配点：旧插件在此做接近过期刷新；dsh-oauth 的 openaiCodexAuth.credential()
    // 已由公共基座自动刷新，无需重复。若调用方传入 refreshCredential 仍可用：
    if (access.length === 0) {
      throw new Error('OpenAI Codex search credential is missing')
    }
    // accountId 优先用 credential 带的值（基座已在换码时解析 JWT）
    const accountId =
      (typeof credential.accountId === 'string' && credential.accountId.length > 0)
        ? credential.accountId
        : accountIdFromToken(access)
    if (signal?.aborted) throw new Error('OpenAI Codex search aborted')

    const body = {
      id: this.options.resolveRequestId ? this.options.resolveRequestId() : 'dsh-codex-supplement',
      model: this.options.model,
      input: [{
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: request.query }],
      }],
      commands: { search_query: [{ q: request.query }] },
      settings: {
        search_context_size: this.options.contextSize ?? 'medium',
        allowed_callers: ['direct'],
        external_web_access: externalWebAccess(this.options.mode ?? 'cached'),
      },
      max_output_tokens: this.options.maxOutputTokens ?? 10000,
    }
    if (signal?.aborted) throw new Error('OpenAI Codex search aborted')

    let response
    try {
      response = await (this.options.http ?? globalThis.fetch)(CODEX_SEARCH_URL, {
        method: 'POST',
        redirect: 'error',
        headers: {
          authorization: `Bearer ${access}`,
          'chatgpt-account-id': accountId,
          'content-type': 'application/json',
          accept: 'application/json',
          originator: 'deepseek-harness',
        },
        body: JSON.stringify(body),
        ...(signal === undefined ? {} : { signal }),
      })
    } catch (error) {
      if (signal?.aborted) throw new Error('OpenAI Codex search aborted')
      throw new Error(`OpenAI Codex search request failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    let payload
    try {
      payload = await response.json()
    } catch {
      throw new Error(`OpenAI Codex returned an unprocessable search response (HTTP ${response.status})`)
    }
    if (!response.ok) {
      const detail = providerMessage(payload)
      const message = detail === undefined
        ? `OpenAI Codex search failed (HTTP ${response.status})`
        : `OpenAI Codex search failed (HTTP ${response.status}): ${detail}`
      throw new Error(
        response.status === 401 || response.status === 403
          ? `${message}; sign in again in Settings > OAuth > ChatGPT`
          : message,
      )
    }
    return mapSearchResponse(payload)
  }
}

export const codexSearchConstants = Object.freeze({
  providerId: CODEX_SEARCH_PROVIDER,
  searchUrl: CODEX_SEARCH_URL,
})
