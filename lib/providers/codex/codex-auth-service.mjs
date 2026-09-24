/**
 * Codex authentication service registered as Cordis Service `openaiCodexAuth`.
 *
 * The image tool in this bundle consumes `credential(signal)` for the official
 * access/account fields and `http` for the OpenAI proxy-aware network path.
 * OAuth lifecycle behavior lives in the internal OAuth base; this service owns
 * Codex-specific spec, device-code fallback, official-record synchronization,
 * and migration from the legacy secret/account store.
 *
 * Account metadata stores only a credentialRef; token material is never logged.
 * @module dsh-codex-supplement/codex-auth-service
 */

import { Service } from '@deepseek-ai/cordis'

import { createOAuthProviderBase, refreshOAuthToken } from '../../providers/oauth-base.mjs'
import { createCredentialRef } from '../../shared/secret-store.mjs'
import { isoFromEpoch } from '../../shared/provider-utils.mjs'
import {
  resolveCodexOAuthSpec,
  buildCodexProviderSpec,
  codexTokenRequest,
  beginCodexDeviceLogin,
  CODEX_CLIENT_ID,
} from './codex-oauth.mjs'

const PROVIDER_ID = 'codex'

export class CodexAuthService extends Service {
  /**
   * @param {object} ctx - dsh 插件 fiber context
   * @param {object} deps - { accountStore, secretStore, oauthConfig?, http? }
   */
  constructor(ctx, { accountStore, secretStore, oauthConfig = {}, http = null, recordStore = null } = {}) {
    super(ctx, 'openaiCodexAuth')
    this.ctx = ctx
    this.accountStore = accountStore
    this.secretStore = secretStore
    this.providerId = PROVIDER_ID
    // 网络出口：可注入（代理/转发），缺省原生 fetch。
    this.http = http ?? ((url, init) => fetch(url, init))
    // Login session state surfaced by routes/UI.
    this.loginError = undefined
    this.deviceFlow = undefined
    this.deviceAbort = undefined

    // 公共 OAuth 基座（三家共用同一实现；codex spec 由 buildCodexProviderSpec 提供）。
    this.oauthSpec = resolveCodexOAuthSpec(oauthConfig) // 设备码流程的原生协议 spec（含 device* 端点）
    const spec = buildCodexProviderSpec(oauthConfig)
    this.spec = { ...spec, importCredentials: (exchanged, context) => this.#ingestCredential(exchanged, context) }
    this.base = createOAuthProviderBase({
      spec: this.spec,
      accountStore,
      secretStore,
      http: this.http,
    })
    // 官方 credential record 门面（2026-09-22：官方 record = codex token 唯一正源）。
    // 由 installCodex 通过 ctx.inject(['credentials']) 后注入；未注入时 credential()
    // 退化为「旧 secret store 只读历史」路径（fail-open，不抛错）。
    this.recordStore = recordStore
    /** 迁移是否已试过（只试一次，失败不反复读旧 store）。 */
    this.legacyMigrationUsed = false
  }

  /** 进行中的浏览器登录会话 id（基座持有；路由层同步使用）。 */
  get loginSessionId() {
    return this.base.loginSessionId
  }

  get loginPending() {
    return this.base.loginSessionId !== null || this.deviceFlow !== undefined
  }

  /* ----------------------------- token / 刷新（基座） ----------------------------- */

  /**
   * 读当前 codex token。**官方 credential record 优先**（2026-09-22 起）：
   *
   *   1) record `llm-pi-ai/openai-codex` 有值且未临近过期 → 直接用它
   *      （与官方 llm-pi-ai 的 openai-codex 对话路由共用同一个 token，绝不会各刷一份）
   *   2) record 有值但临近过期 → 用 `refresh` 换新，**写回同一条 record**
   *   3) record 缺失 → 从旧插件存储（secret store + account store）读一次并**播种** record
   *      （一次性迁移；此后旧 store 只作只读历史，本方法不再回写它）
   *   4) credentials 服务不可用 / 旧存储也没有 → 退回基座旧路径（读了就等于完全旧行为）
   *
   * 外部契约不变：返回 `{ access, accountId, … }` 或未登录时 undefined。
   * @returns {Promise<object|undefined>} credential（含 .access / .accountId），未登录时 undefined
   */
  async credential(signal) {
    const recordStore = this.recordStore
    if (recordStore) {
      const fromRecord = await recordStore.credential({
        refresh: (credential) => refreshOAuthToken(this.spec, credential, { http: this.http, signal }),
      })
      if (fromRecord !== undefined) return fromRecord
      if (!this.legacyMigrationUsed) {
        this.legacyMigrationUsed = true
        const migrated = await recordStore.readLegacyOnce({ loadLegacy: () => this.base.readCredential({ signal }) })
        if (migrated !== undefined) return migrated
      }
    }
    // 旧路径（无 credentials 服务 / 迁移无可迁移内容时）：只读，不再作为正源。
    return this.base.readCredential({ signal })
  }

  /** 显式刷新（供调用方在 401 之后重试一次）。 */
  async refreshCredential(credential, signal) {
    return refreshOAuthToken(this.spec, credential, { http: this.http, signal })
  }

  /* ----------------------------- 登录生命周期（基座） ----------------------------- */

  /** 开始浏览器授权（PKCE）。返回 publicSession（含 authorizationUrl）。 */
  async startBrowserLogin() {
    const session = await this.base.startLogin()
    // 与基座保持一致：loginSessionId 由基座管理；此处对路由暴露同语义字段。
    this.loginError = this.base.loginError ?? undefined
    return session
  }

  /** 轮询浏览器授权会话；完成后账号已由 importCredentials 落库。 */
  async poll() {
    const result = await this.base.poll()
    this.loginError = this.base.loginError ?? undefined
    return result
  }

  /** 手动粘贴回调地址/授权码（authorizationCodeRequired 场景）。 */
  async submitCode(sessionId, input) {
    if (!sessionId) return this.poll()
    const result = await this.base.submitCode(input)
    this.loginError = this.base.loginError ?? undefined
    return result
  }

  /** 开始设备码登录（无浏览器 fallback）。返回 { userCode, url, completion }。 */
  async startDeviceLogin() {
    if (this.deviceFlow) return this.deviceFlow
    const controller = new AbortController()
    this.deviceAbort = controller
    const flow = beginCodexDeviceLogin(
      this.oauthSpec,
      (code, verifier, signal, redirectUri) => this.finishDeviceLogin(code, verifier, signal, redirectUri),
      controller.signal,
      (error) => this.recordLoginError(error),
      this.http,
    )
    this.deviceFlow = flow
    flow.completion.finally(() => {
      this.deviceFlow = undefined
      this.deviceAbort = undefined
    })
    return flow
  }

  async finishDeviceLogin(code, verifier, signal, redirectUri) {
    const credential = await codexTokenRequest(this.oauthSpec, {
      grant_type: 'authorization_code',
      client_id: CODEX_CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }, signal, this.http)
    if (!credential.refresh) throw new Error('OpenAI token response is missing refresh_token')
    await this.#ingestCredential(credential, {})
    this.loginError = undefined
    this.ctx.logger?.info('dsh-codex-supplement: codex signed in (account %s)', credential.accountId)
  }

  recordLoginError(error) {
    const message = error instanceof Error ? error.message : String(error)
    this.loginError = message
    this.ctx.logger?.error('dsh-codex-supplement: codex login failed: %s', message)
  }

  async cancel() {
    await this.base.cancel()
    if (this.deviceAbort) {
      this.deviceAbort.abort()
      this.deviceAbort = undefined
      this.deviceFlow = undefined
    }
    return { status: 'cancelled' }
  }

  /* ----------------------------- 登出 / 状态 ----------------------------- */

  async logout(accountId) {
    const result = await this.base.logout(accountId)
    // 2026-09-22：官方 record 是正源，登出必须一并删除，否则 llm-pi-ai 侧仍会认为已登录。
    if (this.recordStore) {
      const remaining = this.accountStore.list?.() ?? []
      if (remaining.length === 0) await this.recordStore.clear()
    }
    return result
  }

  /** 登录状态 + 账号 + 静态模型目录。若浏览器授权进行中，主动 poll 推进。 */
  async status(refresh = false) {
    void refresh
    return this.base.status()
  }

  /* ----------------------------- 账号落库（auth.json 形态） ----------------------------- */

  async #ingestCredential(credential, context = {}) {
    const accountId = credential.accountId || context.accountId || `codex:${Date.now().toString(36)}`
    const ref = createCredentialRef(PROVIDER_ID, accountId)
    await this.secretStore.write(ref, {
      type: 'oauth',
      providerId: PROVIDER_ID,
      access: credential.access,
      refresh: credential.refresh ?? '',
      accountId,
      email: credential.email ?? null,
      displayName: credential.displayName ?? null,
      expiresAt: isoFromEpoch(credential.expires),
      clientId: credential.clientId ?? CODEX_CLIENT_ID,
      issuer: this.oauthSpec.issuer,
      scopes: Array.isArray(credential.scopes) ? credential.scopes : [],
    })
    const normalized = {
      providerId: PROVIDER_ID,
      accountId,
      credentialRef: ref,
      displayName: credential.displayName ?? credential.email ?? accountId,
      email: credential.email,
      auth: { kind: 'oauth', scopes: Array.isArray(credential.scopes) ? credential.scopes : [] },
      subscription: { plan: credential.plan ?? null, status: null, expiresAt: null },
      refresh: {
        accessTokenExpiresAt: isoFromEpoch(credential.expires),
        nextRefreshAt: null,
        lastRefreshedAt: new Date().toISOString(),
        refreshable: Boolean(credential.refresh),
      },
      resources: {
        transport: 'codex_chat_completions_sse',
        authSource: 'official_codex_oauth',
      },
    }
    this.accountStore.upsert(normalized)
    await this.accountStore.persist()
    // 2026-09-22：登录产物**同步播种官方 credential record**（唯一正源）。
    // 失败不致命：下一次 credential() 会走「record 缺失 → 旧 store 一次性迁移」补齐。
    if (this.recordStore) {
      await this.recordStore.write({
        type: 'oauth',
        access: credential.access,
        refresh: credential.refresh ?? '',
        expires: credential.expires,
        accountId,
      })
    }
    return [normalized]
  }
}

export const codexAuthServiceConstants = Object.freeze({
  serviceName: 'openaiCodexAuth',
  providerId: PROVIDER_ID,
})
