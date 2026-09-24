/**
 * Codex OAuth lifecycle base, currently used only by CodexAuthService.
 *
 * The spec supplies Codex endpoints and account extraction; this module owns
 * PKCE/browser callback and manual-code lifecycle, token exchange/refresh, and
 * credential-store handoff. Account metadata stores only a credentialRef while
 * token material remains in the secret store. Generic spec helpers remain an
 * internal seam; this package registers no non-Codex OAuth provider.
 * @module dsh-codex-supplement/oauth-base
 */

import { createBrowserOAuthAuthorizer } from '../shared/browser-oauth-authorizer.mjs'
import { isoFromEpoch } from '../shared/provider-utils.mjs'

/** token 交换/刷新默认超时。 */
const API_TIMEOUT_MS = 30_000
/** 访问令牌过期前多少毫秒视为「即将过期」并触发自动刷新（对齐 codex-auth-service）。 */
const REFRESH_MARGIN_MS = 60 * 1000

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0) ?? null
}

/**
 * 归一化 spec。字段说明见 `createOAuthProviderBase` 头注。
 * @param {object} input
 */
export function normalizeOAuthSpec(input = {}) {
  if (!isObject(input)) throw new Error('oauth spec must be an object')
  const oauth = input.oauth ?? {}
  const spec = {
    providerId: String(input.providerId || ''),
    displayName: String(input.displayName || input.providerId || ''),
    authJsonKey: String(input.authJsonKey || input.providerId || ''),
    accessPoint: {
      baseUrl: String(input.accessPoint?.baseUrl ?? ''),
      api: String(input.accessPoint?.api ?? 'openai-completions'),
    },
    oauth: {
      authorizationUrl: String(oauth.authorizationUrl ?? ''),
      tokenUrl: String(oauth.tokenUrl ?? ''),
      clientId: String(oauth.clientId ?? ''),
      scope: String(oauth.scope ?? ''),
      redirectUri: String(oauth.redirectUri ?? ''),
      callbackPath: String(oauth.callbackPath ?? '/auth/callback'),
      callbackHost: String(oauth.callbackHost ?? '127.0.0.1'),
      callbackPort: oauth.callbackPort ?? 0,
      requiresManualCode: Boolean(oauth.requiresManualCode),
      includeNonce: oauth.includeNonce !== false,
      instructions: String(oauth.instructions ?? '请在官方授权页面选择账号并完成授权。'),
      extraAuthorizeParams: oauth.extraAuthorizeParams,
      tokenContentType: oauth.tokenContentType === 'json' ? 'json' : 'form',
      tokenBodyExtra: typeof oauth.tokenBodyExtra === 'function' ? oauth.tokenBodyExtra : null,
      normalizeCode: typeof oauth.normalizeCode === 'function' ? oauth.normalizeCode : (code) => code,
      normalizeTokenResponse: typeof oauth.normalizeTokenResponse === 'function' ? oauth.normalizeTokenResponse : null,
      normalizeRefreshResponse: typeof oauth.normalizeRefreshResponse === 'function' ? oauth.normalizeRefreshResponse : null,
    },
    // 可选：per-provider 附加请求头；缺省 Bearer。
    headersFor: typeof input.headersFor === 'function'
      ? input.headersFor
      : (credential) => ({ authorization: `Bearer ${credential?.access ?? ''}` }),
    // 可选：per-provider token 请求超时
    timeoutMs: Number(input.timeoutMs) || API_TIMEOUT_MS,
  }
  if (!spec.providerId) throw new Error('oauth spec requires providerId')
  if (!spec.oauth.authorizationUrl || !spec.oauth.tokenUrl || !spec.oauth.clientId) {
    throw new Error(`oauth spec for ${spec.providerId} requires authorizationUrl/tokenUrl/clientId`)
  }
  return spec
}

/** JWT payload 解码（与 shared/provider-utils 同款，供账号 id 提取）。 */
export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

/**
 * 从 access token 的 JWT claims 提取账号 id（各家 claim 路径不同）。
 * @param {string} token
 * @param {object} [opts] - { path: 'a.b.c'（点路径，无则顶层） }
 */
export function accountIdFromToken(token, { path = '' } = {}) {
  const payload = decodeJwtPayload(token)
  if (!payload) return ''
  if (!path) return firstString(payload.sub, payload.user_id, payload.userId, payload.chatgpt_account_id) ?? ''
  let node = payload
  for (const key of path.split('.')) {
    if (!node || typeof node !== 'object') return ''
    node = node[key]
  }
  return typeof node === 'string' && node.length > 0 ? node : firstString(payload.chatgpt_account_id, payload.sub, payload.user_id) ?? ''
}

/**
 * 指定 spec 的 token 请求（交换/刷新共用）。**返回未归一化的原始响应**——
 * 归一化由调用方（exchangeCode / refreshOAuthToken）经 spec.oauth.normalize* 完成。
 * @param {object} spec  normalizeOAuthSpec 结果
 * @param {object} params - { grantType, code?, codeVerifier?, redirectUri?, refreshToken? }，client_id 自动带
 * @param {{http?:Function, signal?:AbortSignal}} [opts]
 * @returns {Promise<object>} 原始 token 响应体
 */
export async function oauthTokenRequest(spec, params, { http = globalThis.fetch, signal } = {}) {
  const base = {
    grant_type: params.grantType,
    client_id: spec.oauth.clientId,
  }
  let bodyFields
  if (params.grantType === 'authorization_code') {
    bodyFields = {
      ...base,
      code: spec.oauth.normalizeCode(params.code ?? ''),
      redirect_uri: params.redirectUri ?? spec.oauth.redirectUri,
      ...(params.codeVerifier ? { code_verifier: params.codeVerifier } : {}),
    }
  } else {
    bodyFields = {
      ...base,
      refresh_token: params.refreshToken ?? '',
    }
  }
  if (spec.oauth.tokenBodyExtra) {
    bodyFields = { ...bodyFields, ...(spec.oauth.tokenBodyExtra({ grantType: params.grantType, state: params.state ?? null }) || {}) }
  }

  const body = spec.oauth.tokenContentType === 'json'
    ? JSON.stringify(bodyFields)
    : new URLSearchParams(bodyFields)

  let response
  try {
    response = await http(spec.oauth.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': spec.oauth.tokenContentType === 'json' ? 'application/json' : 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body,
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (error) {
    const wrapped = new Error(`OAuth token request failed (${spec.providerId}): ${error instanceof Error ? error.message : String(error)}`)
    wrapped.cause = error
    throw wrapped
  }
  const value = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`OAuth token exchange failed (${response.status})`)
    error.status = response.status
    error.upstreamCode = value?.error ?? value?.error_code ?? value?.code
    throw error
  }
  return value
}

/**
 * 自动刷新（refresh_token 授权）。
 * @param {object} spec
 * @param {object} credential - 已存 secret store 的 credential（含 refresh）
 * @param {{http?:Function, signal?:AbortSignal}} [opts]
 */
export async function refreshOAuthToken(spec, credential, { http, signal } = {}) {
  const value = await oauthTokenRequest(spec, { grantType: 'refresh_token', refreshToken: credential.refresh }, { http, signal })
  const normalize = spec.oauth.normalizeRefreshResponse ?? spec.oauth.normalizeTokenResponse
  const next = normalize ? normalize(value) : value
  if (!next || typeof next.access !== 'string' || next.access.length === 0) {
    // refresh 失败：保留旧 access，交由调用方决定（不覆写 secret store）
    throw new Error('OAuth refresh token response is missing access token')
  }
  return {
    ...credential,
    ...next,
    refresh: firstString(next.refresh, credential.refresh) ?? '',
    accountId: firstString(next.accountId, credential.accountId) ?? credential.accountId ?? '',
    expiresAt: next.expiresAt ?? isoFromEpoch(next.expires) ?? credential.expiresAt ?? null,
    issuer: next.issuer ?? credential.issuer ?? null,
    clientId: next.clientId ?? credential.clientId ?? spec.oauth.clientId,
    lastRefreshedAt: new Date().toISOString(),
  }
}

/**
 * 供应商中立浏览器 OAuth authorizer 工厂（PKCE + state + 回环/手动粘贴 + 交换）。
 *
 * 三家共用同一个实现；spec 只带常量/表单细节。importCredentials 由调用方注入
 * （基座默认实现 = 把 credential 写 secret store + 语义账号进 account store）。
 *
 * @param {object} spec normalizeOAuthSpec 结果
 * @param {{http?:Function, importCredentials?:Function}} [opts]
 */
export function createOAuthAuthorizer(spec, { http, importCredentials } = {}) {
  const normalized = normalizeOAuthSpec(spec)
  return createBrowserOAuthAuthorizer({
    providerId: normalized.providerId,
    callbackPath: normalized.oauth.callbackPath,
    callbackHost: normalized.oauth.callbackHost,
    callbackPort: normalized.oauth.callbackPort,
    redirectUri: normalized.oauth.redirectUri || null,
    browserOpened: false,
    authorizationCodeRequired: normalized.oauth.requiresManualCode,
    instructions: normalized.oauth.instructions,
    authorizationUrlBuilder: async ({ state, codeChallenge, redirectUri, nonce }) => {
      const url = new URL(normalized.oauth.authorizationUrl)
      const params = {
        response_type: 'code',
        client_id: normalized.oauth.clientId,
        redirect_uri: redirectUri,
        scope: normalized.oauth.scope,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
      }
      const extra = typeof normalized.oauth.extraAuthorizeParams === 'function'
        ? normalized.oauth.extraAuthorizeParams({ state, codeChallenge, redirectUri, nonce })
        : normalized.oauth.extraAuthorizeParams
      if (isObject(extra)) {
        for (const [key, value] of Object.entries(extra)) {
          if (value !== undefined && value !== null) params[key] = String(value)
        }
      }
      if (normalized.oauth.includeNonce && nonce) params.nonce = nonce
      url.search = new URLSearchParams(params)
      return url.toString()
    },
    exchangeCode: async ({ code, codeVerifier, redirectUri, context }) => {
      const value = await oauthTokenRequest(normalized, {
        grantType: 'authorization_code',
        code,
        codeVerifier,
        redirectUri,
      }, { http, signal: context?.signal })
      const norm = normalized.oauth.normalizeTokenResponse ? normalized.oauth.normalizeTokenResponse(value) : value
      if (!norm || typeof norm.access !== 'string' || norm.access.length === 0) {
        throw new Error('OAuth token response is missing access token')
      }
      return norm
    },
    importCredentials: importCredentials ?? ((exchanged, context) => {
      const controller = context?.controller
      if (controller && typeof controller.ingestCredential === 'function') {
        return controller.ingestCredential(exchanged, context)
      }
      return [exchanged]
    }),
  })
}

/**
 * 公共 OAuth provider 基座控制器。
 *
 * `spec`（见 normalizeOAuthSpec）+ `accountStore` + `secretStore`，返回完整登录生命周期：
 *   startLogin / poll / submitCode / cancel / status / logout / readCredential(自动刷新)。
 *
 * 各 provider 模块 = 基座 + 自己的 spec +（可选）自定义 importCredentials。
 * @param {object} deps - { spec, accountStore, secretStore, http? }
 */
export function createOAuthProviderBase({ spec: rawSpec, accountStore, secretStore, http }) {
  const spec = normalizeOAuthSpec(rawSpec)
  if (!accountStore || !secretStore) {
    throw new Error(`oauth base for ${spec.providerId} requires accountStore and secretStore`)
  }
  const request = http ?? ((url, init) => globalThis.fetch(url, init))

  // 账号语义（accountStore 行）由 rawSpec.accountFromCredential 决定；缺省直接映射。
  const accountFromCredential = typeof rawSpec.accountFromCredential === 'function'
    ? rawSpec.accountFromCredential
    : (credential) => ({
        accountId: credential.accountId ?? `anonymous:${Date.now().toString(36)}`,
        email: credential.email ?? null,
        displayName: credential.displayName ?? credential.email ?? credential.accountId ?? null,
        plan: credential.plan ?? null,
        scopes: Array.isArray(credential.scopes) ? credential.scopes : [],
      })

  const controller = {
    spec,
    accountStore,
    secretStore,
    http: request,
    loginSessionId: null,
    loginError: null,

    /* ----------------------------- 登录生命周期 ----------------------------- */

    async startLogin() {
      if (this.loginSessionId) return { status: 'pending', loginPending: true }
      const session = await this.authorizer.begin()
      if (session?.sessionId) this.loginSessionId = session.sessionId
      this.loginError = session?.diagnostic ?? null
      return session
    },

    async poll() {
      if (!this.loginSessionId) {
        return { status: 'idle', loggedIn: this.accountStore.list().length > 0 }
      }
      const result = await this.authorizer.poll(this.loginSessionId)
      if (result?.status === 'completed') {
        this.loginSessionId = null
        this.loginError = null
      } else if (result?.status === 'failed' || result?.status === 'missing') {
        this.loginSessionId = null
      }
      if (result?.diagnostic) this.loginError = result.diagnostic
      return result
    },

    async submitCode(input) {
      if (!this.loginSessionId) {
        throw new Error('没有待完成的授权会话，请先登录')
      }
      const result = await this.authorizer.submitAuthorizationCode(this.loginSessionId, input)
      if (result?.status === 'completed') {
        this.loginSessionId = null
        this.loginError = null
      } else if (result?.status === 'failed' || result?.status === 'missing') {
        this.loginSessionId = null
      }
      if (result?.diagnostic) this.loginError = result.diagnostic
      return result
    },

    async cancel() {
      if (this.loginSessionId) {
        await this.authorizer.cancel(this.loginSessionId).catch(() => {})
        this.loginSessionId = null
      }
      return { status: 'cancelled' }
    },

    /* ----------------------------- 凭据（自动刷新） ----------------------------- */

    /**
     * 读选中账号的 token；接近过期自动刷新并回写 secret store。
     * @returns {Promise<object|undefined>} credential（含 access/accountId），未登录 undefined
     */
    async readCredential({ accountId = null, signal } = {}) {
      const account = accountId ? this.accountStore.get(accountId) : this.accountStore.select()
      const ref = account?.auth?.credentialRef
      if (!ref) return undefined
      let credential = await this.secretStore.read(ref)
      if (!credential?.access) return undefined
      const expiresAt = Number.isFinite(Date.parse(credential.expiresAt ?? '')) ? Date.parse(credential.expiresAt) : NaN
      if (Reflect.has(credential, 'refresh') && credential.refresh && Number.isFinite(expiresAt) && expiresAt <= Date.now() + REFRESH_MARGIN_MS) {
        try {
          const next = await refreshOAuthToken(spec, credential, { http: request, signal })
          await this.secretStore.write(ref, next)
          credential = next
        } catch (error) {
          // 自动刷新失败不致命：旧 token 仍可用于下一次请求（首次调用时会再试）。
          this.loginError = `token 刷新失败：${error instanceof Error ? error.message : String(error)}`
        }
      }
      return { ...credential, accountId: credential.accountId ?? account.accountId }
    },

    /** 默认账号导入：auth.json 形态 credential → secret store + account store。 */
    async ingestCredential(credential, context = {}) {
      const accountId = credential.accountId || context.accountId || `${spec.providerId}:${Date.now().toString(36)}`
      const stored = {
        type: 'oauth',
        providerId: spec.providerId,
        access: credential.access,
        refresh: credential.refresh ?? '',
        accountId,
        email: credential.email ?? null,
        displayName: credential.displayName ?? null,
        expiresAt: credential.expiresAt ?? null,
        clientId: credential.clientId ?? spec.oauth.clientId,
        issuer: credential.issuer ?? null,
        scopes: Array.isArray(credential.scopes) ? credential.scopes : [],
      }
      const ref = typeof secretStore.write === 'function'
        ? await secretStore.write(`${spec.providerId}:oauth:${accountId}`, stored)
        : null
      const normalized = {
        providerId: spec.providerId,
        accountId,
        credentialRef: ref ?? credential.credentialRef ?? null,
        displayName: credential.displayName ?? credential.email ?? accountId,
        email: credential.email ?? null,
        auth: { kind: 'oauth', scopes: Array.isArray(credential.scopes) ? credential.scopes : [] },
        subscription: { plan: credential.plan ?? null, status: null, expiresAt: null },
        refresh: {
          accessTokenExpiresAt: credential.expiresAt ?? null,
          nextRefreshAt: null,
          lastRefreshedAt: new Date().toISOString(),
          refreshable: Boolean(credential.refresh),
        },
        resources: credential.resources ?? {},
      }
      const account = accountFromCredential(credential)
      this.accountStore.upsert({ ...normalized, ...account })
      await this.accountStore.persist()
      return [this.accountStore.get(accountId)]
    },

    /* ----------------------------- 登出 / 状态 ----------------------------- */

    async logout(accountId) {
      const ids = accountId ? [accountId] : this.accountStore.list().map((account) => account.accountId)
      for (const id of ids) {
        const account = this.accountStore.get(id)
        const ref = account?.auth?.credentialRef
        if (ref && typeof this.secretStore.delete === 'function') {
          try { await this.secretStore.delete(ref) } catch { /* 非致命 */ }
        }
        this.accountStore.remove(id)
      }
      this.loginSessionId = null
      await this.accountStore.persist()
      return { removed: ids }
    },

    async status() {
      if (this.loginSessionId) {
        try { await this.poll() } catch { /* 轮询失败不阻塞 status */ }
      }
      const accounts = this.accountStore.list()
      return {
        loggedIn: accounts.length > 0,
        loginPending: this.loginSessionId !== null,
        loginError: this.loginError ?? null,
        defaultAccountId: this.accountStore.getDefaultAccountId(),
        accounts: accounts.map((account) => ({
          accountId: account.accountId,
          email: account.email,
          displayName: account.displayName,
          plan: account.subscription?.plan,
        })),
      }
    },
  }

  const importCredentials = typeof rawSpec.importCredentials === 'function'
    ? rawSpec.importCredentials
    : (exchanged, context) => controller.ingestCredential(exchanged, context)

  controller.authorizer = createOAuthAuthorizer(spec, { http: request, importCredentials })
  return controller
}

export const oauthBaseConstants = Object.freeze({
  refreshMarginMs: REFRESH_MARGIN_MS,
  apiTimeoutMs: API_TIMEOUT_MS,
})
