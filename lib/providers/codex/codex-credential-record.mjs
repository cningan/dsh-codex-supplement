/**
 * codex 凭据的**官方 credential record 门面**（2026-09-22 新增）。
 *
 * Background:
 * Codex chat is owned by DSH's official `llm-pi-ai` `openai-codex` provider.
 * Both that provider and this supplement use the shared credential record
 * `llm-pi-ai/openai-codex`; the provider owns interpretation of its payload.
 *
 * 因此本插件放弃「自己独占 token」的旧形态：**官方 record = codex token 的唯一正源**。
 * 本模块是插件侧唯一读写该 record 的地方：
 *   - 读：`read()` → 插件需要的字段子集 { access, refresh, expires, accountId }
 *   - 判断：`needsRefresh(payload)`（到期前留提前量）
 *   - 写回：`write()` / `captureCredential()`（登录后、临近过期刷新后）
 *   - 删：`clear()`（登出）
 *   - 一次性迁移：`readLegacyOnce()`（旧 secret store 只作**只读历史**，绝不回写）
 *
 * 设计纪律：
 *   1) **fail-open**：credentials 服务缺失（未挂载/被停用/键空间不合法）时一律静默返回
 *      undefined，绝不抛错——codex 增强是可选能力，不得因它让插件启动失败。
 *   2) 零依赖：record 键用普通字符串 `'llm-pi-ai/openai-codex'`（= `credentialKey(scope, id)`
 *      的 join 形态）。`@deepseek-ai/dsh-credentials` 的 brand 是编译期概念，运行期
 *      `readRecord` 只需该字符串；本插件 package.json **无 dependencies**，不引入新依赖。
 *      若未来该键空间收紧为运行期强校验，改为从 `@deepseek-ai/dsh-credentials` import
 *      `credentialKey` 并调用（一行改动）。
 *   3) 不打印 token：任何日志/返回值都不得包含 access/refresh 内容。
 *
 * @module dsh-codex-supplement/codex-credential-record
 */

import { isoFromEpoch } from '../../shared/provider-utils.mjs'

/** record 的 scope：写入者的注册插件名（官方 llm-pi-ai）。 */
export const CODEX_RECORD_SCOPE = 'llm-pi-ai'
/** record 的 id：llm-pi-ai 自己的寻址单位（provider 路由键）。 */
export const CODEX_RECORD_ID = 'openai-codex'
/** 完整键（`<scope>/<id>`，见 dsh-credentials 的 CredentialKey 语法）。 */
export const CODEX_CREDENTIAL_KEY = `${CODEX_RECORD_SCOPE}/${CODEX_RECORD_ID}`
/** 刷新提前量（与 oauth-base 基座同量级：token 通常 1h 有效）。 */
export const CODEX_RECORD_REFRESH_MARGIN_MS = 5 * 60 * 1000
/** record 的 kind 标记（grant = 一次授权流程的产物）。 */
const GRANT_KIND = 'grant'
/** credentials 服务名（CredentialProvider 的 Service 名）。 */
const CREDENTIALS_SERVICE = 'credentials'

/**
 * 无副作用的时间戳解析：支持 epoch 毫秒、epoch 秒（照 `isoFromEpoch` 的宽松口径：
 * <1e10 视为秒并放大 1000 倍）与 ISO 字符串；无法解析 → null。
 * 统一输出 **epoch 毫秒**（record 的 `expires` 就是 epoch-ms）。
 */
function timestampOf(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value < 10_000_000_000 ? value * 1000 : value
  }
  if (typeof value === 'string' && value.length > 0) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 10_000_000_000 ? numeric * 1000 : numeric
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** 只保留插件需要的字段（其余字段原样丢弃；token 内容不复制到其它字段）。 */
function pickPayload(value) {
  if (value === null || typeof value !== 'object') return undefined
  const access = typeof value.access === 'string' ? value.access : ''
  if (access.length === 0) return undefined
  const refresh = typeof value.refresh === 'string' ? value.refresh : ''
  const accountId = typeof value.accountId === 'string' ? value.accountId : ''
  const expires = timestampOf(value.expires) ?? timestampOf(value.expiresAt)
  return {
    type: typeof value.type === 'string' ? value.type : 'oauth',
    access,
    refresh,
    ...(expires === null ? {} : { expires }),
    accountId,
  }
}

/**
 * 插件读取面 → 官方 record payload 格式（pi-ai 自有格式，按兼容 credential record shape 映射）。
 *
 * 兼容三种入参：record 原生 payload（`{type,access,refresh,expires,accountId}`）、
 * 旧 secret store credential（`{access,refresh,expiresAt,accountId}`）、
 * 插件内部 credential（`{access,refresh,expires(epoch),accountId}`）。
 * @returns {object|undefined} 可写入的 payload；无 access 时 undefined
 */
export function toRecordPayload(value) {
  const picked = pickPayload(value)
  if (picked === undefined) return undefined
  return {
    type: picked.type,
    access: picked.access,
    refresh: picked.refresh,
    ...(picked.expires === undefined ? {} : { expires: picked.expires }),
    accountId: picked.accountId,
  }
}

/**
 * 官方 record payload → 插件内部 credential 形状。
 *
 * 保持既有外部契约：调用方（search/usage/model-discovery/status 路由/图片生成工具）
 * 只依赖 `.access` 与 `.accountId`；额外字段只是便利。
 * @returns {{access:string, accountId:string, refresh:string, expires?:number, expiresAt?:string, type:string}|undefined}
 */
export function fromRecordPayload(value) {
  const picked = pickPayload(value)
  if (picked === undefined) return undefined
  return {
    type: picked.type,
    access: picked.access,
    accountId: picked.accountId,
    refresh: picked.refresh,
    ...(picked.expires === undefined ? {} : { expires: picked.expires, expiresAt: isoFromEpoch(picked.expires) ?? undefined }),
  }
}

/**
 * 是否临近/已过期（需要刷新）。无过期信息 → false（当作有效，交给上游 401 处理）。
 * @param {object} credential - record payload 或插件 credential
 * @param {number} [now]
 */
export function needsRefresh(credential, now = Date.now()) {
  const expires = timestampOf(credential?.expires) ?? timestampOf(credential?.expiresAt)
  if (expires === null) return false
  return expires <= now + CODEX_RECORD_REFRESH_MARGIN_MS
}

/**
 * 官方 credential record 门面。**不持有 token 状态**——每次操作都向 seam 现读，
 * 这样官方 llm-pi-ai 侧自己刷新过的 token 本插件立刻可见（单源不漂移）。
 */
export class CodexCredentialRecord {
  constructor(ctx, { key = CODEX_CREDENTIAL_KEY, marginMs = CODEX_RECORD_REFRESH_MARGIN_MS } = {}) {
    this.ctx = ctx
    this.key = key
    this.marginMs = marginMs
    /** credentials 服务（懒解析；服务未挂载时为 null）。 */
    this.service = null
  }

  /** 懒解析 credentials 服务（ctx.get 在服务未注册时返回 undefined，不抛错）。 */
  #service() {
    if (this.service !== null) return this.service
    let service
    try {
      service = this.ctx?.get?.(CREDENTIALS_SERVICE)
    } catch {
      service = undefined
    }
    if (service === null || typeof service !== 'object') return undefined
    this.service = service
    return service
  }

  /** 服务是否可用（诊断用；不影响任何 fail-open 路径）。 */
  available() {
    const service = this.#service()
    return Boolean(service && typeof service.readRecord === 'function')
  }

  /**
   * 读官方 record → 插件 credential。服务缺失/无记录/载荷不可用 → undefined（fail-open）。
   * @returns {Promise<object|undefined>}
   */
  async read() {
    const service = this.#service()
    if (!service || typeof service.readRecord !== 'function') return undefined
    let record
    try {
      record = await service.readRecord(this.key)
    } catch (error) {
      this.ctx?.logger?.warn('dsh-codex-supplement: 读取官方 credential record 失败（按未登录处理）: %s',
        error instanceof Error ? error.message : String(error))
      return undefined
    }
    if (!record || record.kind !== GRANT_KIND) return undefined
    return fromRecordPayload(record.payload)
  }

  /**
   * 写回官方 record（登录后 / 刷新后）。服务缺失 → false（fail-open，调用方自行决定是否致命）。
   * @returns {Promise<boolean>} 是否写入成功
   */
  async write(credential) {
    const payload = toRecordPayload(credential)
    if (payload === undefined) return false
    return this.writePayload(payload)
  }

  /**
   * 以「读-判-替换」语义写入完整 payload（modifyRecord 是唯一写路径，自带文件锁）。
   * 未变化则不落盘（避免无谓写盘 + 事件风暴）。
   * @returns {Promise<boolean>}
   */
  async writePayload(payload) {
    const service = this.#service()
    if (!service || typeof service.modifyRecord !== 'function') return false
    const next = { kind: GRANT_KIND, payload }
    try {
      await service.modifyRecord(this.key, async (current) => {
        if (current && current.kind === GRANT_KIND
          && JSON.stringify(current.payload) === JSON.stringify(payload)) return current
        return next
      })
      return true
    } catch (error) {
      this.ctx?.logger?.warn('dsh-codex-supplement: 写回官方 credential record 失败: %s',
        error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /** 删除官方 record（登出）。服务缺失 → false（fail-open）。 */
  async clear() {
    const service = this.#service()
    if (!service || typeof service.deleteRecord !== 'function') return false
    try {
      await service.deleteRecord(this.key)
      return true
    } catch (error) {
      this.ctx?.logger?.warn('dsh-codex-supplement: 删除官方 credential record 失败: %s',
        error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /**
   * 读当前 record（含临近过期判定），必要时用 `refresh` 回调换新并**写回同一 record**。
   *
   * 这是 `openaiCodexAuth.credential()` 的第一路径：官方 record 存在即以此为准，
   * 与 llm-pi-ai 共用同一 token，不会出现「插件与官方各刷一份」的漂移。
   *
   * @param {{refresh?: (credential: object) => Promise<object|undefined>}} [options]
   * @returns {Promise<object|undefined>}
   */
  async credential({ refresh } = {}) {
    const current = await this.read()
    if (current === undefined) return undefined
    if (!this.isNearExpiry(current) || typeof refresh !== 'function' || current.refresh.length === 0) return current
    let next
    try {
      next = await refresh(current)
    } catch (error) {
      // 刷新失败不致命：旧 token 仍可用（首次 401 时上层会再试）。
      this.ctx?.logger?.warn('dsh-codex-supplement: codex token 刷新失败（沿用旧 token）: %s',
        error instanceof Error ? error.message : String(error))
      return current
    }
    if (next === undefined || next === null) return current
    const payload = toRecordPayload({ ...current, ...next, expires: next.expires ?? current.expires })
    if (payload !== undefined) {
      await this.writePayload(payload)
      return fromRecordPayload(payload) ?? current
    }
    return current
  }

  /** record payload / credential 是否临近过期（用本实例的提前量）。 */
  isNearExpiry(credential, now = Date.now()) {
    const expires = timestampOf(credential?.expires) ?? timestampOf(credential?.expiresAt)
    if (expires === null) return false
    return expires <= now + this.marginMs
  }

  /**
   * 一次性迁移：官方 record 缺失时，从旧插件存储（secret store + account store）
   * 读一次并**播种**官方 record。
   *
   * 之后旧存储只作只读历史：本模块绝不回写旧 store（见文件头「单源」说明）。
   * @param {{loadLegacy?: () => Promise<object|undefined>}} options
   * @returns {Promise<object|undefined>} 播种后的 credential（无法迁移时 undefined）
   */
  async readLegacyOnce({ loadLegacy } = {}) {
    if (typeof loadLegacy !== 'function') return undefined
    let legacy
    try {
      legacy = await loadLegacy()
    } catch (error) {
      this.ctx?.logger?.warn('dsh-codex-supplement: 读取旧 codex 凭据失败: %s',
        error instanceof Error ? error.message : String(error))
      return undefined
    }
    if (legacy === undefined || legacy === null) return undefined
    const payload = toRecordPayload(legacy)
    if (payload === undefined) return undefined
    const written = await this.writePayload(payload)
    if (written) {
      this.ctx?.logger?.info('dsh-codex-supplement: 已把旧 codex 凭据迁移到官方 credential record「%s」（旧存储转为只读历史）', this.key)
    }
    return fromRecordPayload(payload)
  }
}

export const codexCredentialRecordConstants = Object.freeze({
  key: CODEX_CREDENTIAL_KEY,
  scope: CODEX_RECORD_SCOPE,
  id: CODEX_RECORD_ID,
  refreshMarginMs: CODEX_RECORD_REFRESH_MARGIN_MS,
})
