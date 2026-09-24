/**
 * codex (ChatGPT/GPT 订阅) OAuth 协议层（自包含）。
 *
 * 只做协议：常量、端点解析、PKCE/设备码流程、token 交换/刷新、账号 id 提取。
 * 凭据持久化与账号存储由调用方（codex-auth-service.mjs / index.mjs）负责。
 *
 * OAuth endpoints and the public client id follow the official Codex CLI protocol.
 * The client id is a public OAuth application identifier, not a user credential.
 * @module dsh-codex-supplement/codex-oauth
 */

import { createHash, randomBytes } from 'node:crypto'

import { decodeJwtPayload, redactError } from '../../shared/provider-utils.mjs'

/** Codex CLI 同款公开客户端标识（OpenAI 官方注册，非秘密）。 */
export const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
/** OAuth issuer（auth.openai.com 是官方授权/令牌端点）。 */
export const CODEX_ISSUER = 'https://auth.openai.com'
/** 需要的 scope（openid + 邮箱 + 离线刷新）。 */
export const CODEX_SCOPE = 'openid profile email offline_access'
/** 默认本地回调端口（与 Codex CLI 一致）。 */
export const CODEX_REDIRECT_PORT = 1455
/** 默认本地回调地址（循环回环，登录期间临时监听，完成后关闭）。 */
export const DEFAULT_REDIRECT_URI = `http://localhost:${CODEX_REDIRECT_PORT}/auth/callback`

/* ── 对齐 hanako lib__providers__openai-codex-oauth.ts（provider 合约） ── */
/** 订阅 provider 在 auth.json 中的 key（hanako authJsonKey）。 */
export const CODEX_AUTH_JSON_KEY = 'openai-codex'
/** hanako defaultBaseUrl。 */
export const CODEX_DEFAULT_BASE_URL = 'https://chatgpt.com/backend-api'
/** hanako defaultApi。 */
export const CODEX_DEFAULT_API = 'openai-codex-responses'

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url')
}

/** PKCE S256 challenge（与 browser-oauth-authorizer 一致）。 */
function pkceChallenge(verifier) {
  return base64Url(createHash('sha256').update(verifier).digest())
}

/** 生成一个 Codex PKCE verifier + challenge。 */
export function createCodexPkce() {
  const verifier = base64Url(randomBytes(32))
  return { verifier, challenge: pkceChallenge(verifier) }
}

/**
 * 解析全部 OAuth 端点。
 * @param {object} [config] - { issuer?, redirectPort?, redirectUri? }
 */
export function resolveCodexOAuthSpec(config = {}) {
  const issuer = config.issuer ?? CODEX_ISSUER
  const redirectPort = config.redirectPort ?? CODEX_REDIRECT_PORT
  return {
    issuer,
    redirectPort,
    tokenUrl: `${issuer}/oauth/token`,
    authorizeUrl: `${issuer}/oauth/authorize`,
    deviceCodeUrl: `${issuer}/api/accounts/deviceauth/usercode`,
    deviceTokenUrl: `${issuer}/api/accounts/deviceauth/token`,
    deviceAuthUrl: `${issuer}/codex/device`,
    redirectUri: config.redirectUri ?? `http://localhost:${redirectPort}/auth/callback`,
    deviceRedirectUri: `${issuer}/deviceauth/callback`,
  }
}

/**
 * 从 token claims 提取 ChatGPT 账号 id（与 oauth.js 同逻辑）。
 */
export function extractCodexAccountId(token, idToken) {
  const claims = decodeJwtPayload(token)
  const id =
    claims?.['https://api.openai.com/auth']?.chatgpt_account_id ??
    claims?.chatgpt_account_id ??
    claims?.organizations?.[0]?.id
  if (typeof id === 'string' && id.length > 0) return id
  if (idToken === undefined) return undefined
  const idClaims = decodeJwtPayload(idToken)
  const fallback =
    idClaims?.chatgpt_account_id ??
    idClaims?.['https://api.openai.com/auth']?.chatgpt_account_id
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : undefined
}

/** 归一化官方 token 响应为内部 credential（{type,access,refresh,expires,accountId,email,scopes}）。 */
export function normalizeCodexToken(value, now = Date.now()) {
  const accountId = extractCodexAccountId(value?.access_token, value?.id_token)
  const refresh = typeof value?.refresh_token === 'string' ? value.refresh_token : undefined
  const expiresIn = typeof value?.expires_in === 'number' ? value.expires_in : 3600
  if (typeof value?.access_token !== 'string' || value.access_token.length === 0) {
    throw new Error('OpenAI token response is missing access_token')
  }
  const idClaims = value?.id_token ? decodeJwtPayload(value.id_token) : null
  const scopeValue = typeof value?.scope === 'string' ? value.scope : ''
  return {
    type: 'oauth',
    access: value.access_token,
    refresh: refresh ?? '',
    expires: now + expiresIn * 1000,
    expiresAt: new Date(now + expiresIn * 1000).toISOString(),
    accountId: accountId ?? '',
    email: typeof idClaims?.email === 'string' ? idClaims.email : null,
    displayName: typeof idClaims?.name === 'string' ? idClaims.name : null,
    scopes: scopeValue ? scopeValue.split(/\s+/).filter(Boolean) : [],
  }
}

/**
 * 构造 codex 的 OAuth provider spec（公共基座 `createOAuthProviderBase` 用）。
 *
 * 常量对齐 hanako `lib__providers__openai-codex-oauth.ts`：
 *   authType=oauth / authJsonKey=openai-codex / defaultBaseUrl=chatgpt.com/backend-api /
 *   defaultApi=openai-codex-responses；client_id/issuer/scope/redirect 向 Codex CLI 公开注册值对齐。
 *
 * @param {object} [config] - { issuer?, redirectPort?, redirectUri?, baseUrl? }
 * @returns {object} spec（含 importCredentials 由调用方注入）
 */
export function buildCodexProviderSpec(config = {}) {
  const spec = resolveCodexOAuthSpec(config)
  return {
    providerId: 'codex',
    displayName: 'ChatGPT',
    authJsonKey: CODEX_AUTH_JSON_KEY,
    accessPoint: {
      baseUrl: config.baseUrl ?? CODEX_DEFAULT_BASE_URL,
      api: CODEX_DEFAULT_API,
    },
    oauth: {
      authorizationUrl: spec.authorizeUrl,
      tokenUrl: spec.tokenUrl,
      clientId: CODEX_CLIENT_ID,
      scope: CODEX_SCOPE,
      redirectUri: spec.redirectUri,
      callbackPath: '/auth/callback',
      callbackHost: '127.0.0.1',
      callbackPort: spec.redirectPort,
      requiresManualCode: false,
      instructions: '请在官方 ChatGPT 授权页面选择账号并完成授权；若未自动回调，请粘贴完整回调地址（含 state）到 OAuth 页。',
      // 与 buildCodexAuthorizationUrl 保持同款简化授权流参数（官方 Codex CLI 形态）。
      extraAuthorizeParams: {
        id_token_add_organizations: 'true',
        codex_cli_simplified_flow: 'true',
        originator: 'deepseek-harness',
      },
      tokenContentType: 'form',
      normalizeTokenResponse: (value) => normalizeCodexToken(value),
      normalizeRefreshResponse: (value) => normalizeCodexToken(value),
    },
    headersFor: (credential) => ({
      authorization: `Bearer ${credential?.access ?? ''}`,
      ...(credential?.accountId ? { 'chatgpt-account-id': credential.accountId } : {}),
    }),
  }
}

/**
 * 向官方 token 端点发起请求并归一化响应。
 * @param {object} spec - resolveCodexOAuthSpec 结果
 * @param {URLSearchParams|object} body - 表单参数
 * @param {AbortSignal} [signal]
 * @param {Function} [http] - 可代理出口（缺省用原生 fetch），(url, init) => Promise<Response>
 */
export async function codexTokenRequest(spec, body, signal, http) {
  const request = http ?? globalThis.fetch
  const params = body instanceof URLSearchParams ? body : new URLSearchParams(body)
  const response = await request(spec.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
    ...(signal === undefined ? {} : { signal }),
  })
  const value = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`OpenAI token request failed (HTTP ${response.status}): ${JSON.stringify(value).slice(0, 400)}`)
    error.status = response.status
    error.upstreamCode = value?.error ?? value?.error_code
    throw error
  }
  return normalizeCodexToken(value)
}

/**
 * 构造浏览器授权 URL（PKCE S256 + state）。
 * @param {object} spec
 * @param {{state:string, codeChallenge:string, redirectUri:string, nonce?:string}} args
 */
export function buildCodexAuthorizationUrl(spec, { state, codeChallenge, redirectUri, nonce } = {}) {
  const url = new URL(spec.authorizeUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CODEX_CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', CODEX_SCOPE)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  // 下列参数对齐官方 Codex CLI 简化授权流（保持与 OAuth 官方页面形态一致）。
  url.searchParams.set('id_token_add_organizations', 'true')
  url.searchParams.set('codex_cli_simplified_flow', 'true')
  url.searchParams.set('originator', 'deepseek-harness')
  if (nonce) url.searchParams.set('nonce', nonce)
  return url.toString()
}

/**
 * 设备码登录（无浏览器 / SSH 场景）。
 * @returns {{userCode:string, url:string, completion:Promise<void>}}
 *   completion 在用户完成授权、拿到 authorization_code 并 token 交换成功后 resolve。
 */
export async function beginCodexDeviceLogin(spec, finishLogin, signal, onError, http) {
  const request = http ?? globalThis.fetch
  const usercode = await request(spec.deviceCodeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'deepseek-harness' },
    body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!usercode.ok) {
    throw new Error(`OpenAI device-auth initiation failed (HTTP ${usercode.status})`)
  }
  const init = await usercode.json()
  const userCode = init.user_code
  const interval = Math.max(parseInt(init.interval, 10) || 5, 1) * 1000
  if (typeof userCode !== 'string' || typeof init.device_auth_id !== 'string') {
    throw new Error('OpenAI device-auth response is incomplete')
  }
  const completion = (async () => {
    for (;;) {
      if (signal?.aborted) throw new Error('OpenAI login cancelled')
      const poll = await request(spec.deviceTokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'deepseek-harness' },
        body: JSON.stringify({ device_auth_id: init.device_auth_id, user_code: userCode }),
        ...(signal === undefined ? {} : { signal }),
      })
      if (poll.ok) {
        const data = await poll.json().catch(() => ({}))
        if (typeof data.authorization_code !== 'string' || typeof data.code_verifier !== 'string') {
          throw new Error('OpenAI device-auth token response is incomplete')
        }
        await finishLogin(data.authorization_code, data.code_verifier, signal, spec.deviceRedirectUri)
        return
      }
      if (poll.status !== 403 && poll.status !== 404) {
        throw new Error(`OpenAI device-auth polling failed (HTTP ${poll.status})`)
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  })().catch((error) => {
    onError?.(error instanceof Error ? error : new Error(redactError(error)))
  })
  return { userCode, url: spec.deviceAuthUrl, completion }
}

export const codexOAuthConstants = Object.freeze({
  clientId: CODEX_CLIENT_ID,
  issuer: CODEX_ISSUER,
  scope: CODEX_SCOPE,
  redirectPort: CODEX_REDIRECT_PORT,
  defaultRedirectUri: DEFAULT_REDIRECT_URI,
})
