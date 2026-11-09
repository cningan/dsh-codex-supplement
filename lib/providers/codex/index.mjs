/**
 * Codex (ChatGPT subscription) Host module for Codex Supplement.
 *
 * `installCodex(ctx)` owns Codex-specific account and adjacent features:
 * - Uses the DSH official credential record `llm-pi-ai/openai-codex` as the shared token source.
 * - Provides OAuth/login, usage/quota, and Fast Mode; model catalog/capabilities stay with official `openai-codex`.
 * - Provides `openaiCodexAuth` to the image and search component rows.
 * - Persists Fast Mode under plugin-owned `data/fast-mode.json`.
 * - Usage/search UI lives in the Client settings page; the search capability itself is a separate row.
 *
 * Codex chat transport and model execution remain owned by DSH's official `openai-codex` provider;
 * this module does not register a chat adapter.
 * @module dsh-codex-supplement/codex
 */

import { join } from 'node:path'

import { createDefaultSecretStore } from '../../shared/secret-store.mjs'
import { OAuthAccountStore } from '../../shared/account-store.mjs'
import { openaiFetch, resolveProxyConfig, installCodexServiceTierInjector } from '../../shared/proxy.mjs'
import { CodexAuthService } from './codex-auth-service.mjs'
import { CodexCredentialRecord, CODEX_CREDENTIAL_KEY } from './codex-credential-record.mjs'
import { FastModeStore, FAST_MODE_STORE_FILE } from './fast-mode-store.mjs'
import { CodexUsageTracker } from './usage.mjs'
import { FastModeRegistry, registerFastModeRoute } from './fast-mode.mjs'

const PROVIDER_NAME = 'ChatGPT'

const AUTH_PREFIX = '/plugins/dsh-codex-supplement'
const AUTH_PREFIX_CODEX = `${AUTH_PREFIX}/codex`

// 2026-11-09：搜索能力拆到独立 `codex-supplement-search` row（search-feature.mjs）；
// 本 base row 只保留 OAuth、用量、Fast Mode 与设置页依赖的服务。

// 2026-09-22 移除（保留说明 = 「消失的对象进回归清单」）：
// 原 `CodexFeaturesSettings = z.object({ fastModeModels: z.dict(z.boolean()).default({}),
// searchEnabled: z.boolean().default(false) })` —— settings 命名空间 `dsh-oauth` 的 schema。
// 死因：0.1.7-alpha.1 的 settings 服务没有 `register`，`mutate` 对非插件条目 id 直接抛
// 「Plugin entry … has no volatile fields」。Fast Mode 现由 fast-mode-store.mjs 持久化；
// 搜索开关随搜索组件拆到 search-store.mjs。

function sendJson(response, status, value) {
  return response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  }).end(JSON.stringify(value))
}

/** 读取 JSON 请求体（过大或不可解析时返回 undefined）。 */
async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk
    size += buffer.length
    if (size > maxBytes) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * 请求来源校验（2026-09-22 改为**同源语义**）。
 *
 * 起因：旧实现要求 Origin 必须解析成 localhost / 127.0.0.1 / [::1]，否则 403。
 * 但官方桌面端（Electron/Tauri 形态）的 Origin 是 `app://dsh` 这类**非 http(s) 特权源**
 * ——它是本地应用自身，不是跨站页面，旧实现把它 403 了（记录 §七 实测：
 * 加 `Origin: app://dsh` 后由 403 → 200）。
 *
 * 规则：
 *   1) 无 Origin（同源导航/原生请求）、或 `Origin: null` → 放行
 *   2) Origin 协议不是 http(s)（如 `app://dsh`、`file://`、webview 自定义协议）→ 放行
 *      （本地应用特权源，不构成跨站读写；真正的跨站页面必然是 http(s)）
 *   3) http(s) Origin → 必须与 Host 同源，且 `Sec-Fetch-Site` 不得是 `cross-site`
 *   4) 其余（Origin 无法解析等）→ 拒绝，并在响应体回报 origin / sec-fetch-site 便于定位
 */
function requestAllowed(request) {
  const origin = request.headers.origin
  const secFetchSite = request.headers['sec-fetch-site']
  const deny = () => false
  if (origin !== undefined && origin !== null && origin !== '' && origin !== 'null') {
    let parsed
    try {
      parsed = new URL(origin)
    } catch {
      return deny()
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const host = request.headers.host
      if (typeof host !== 'string' || host.length === 0) return deny()
      if (parsed.host !== host) return deny()
      if (secFetchSite === 'cross-site') return deny()
      return true
    }
    // 非 http(s) 特权源（app://dsh 等）→ 放行（本地应用自带源）
    return true
  }
  if (secFetchSite === 'cross-site') return deny()
  return true
}

/**
 * 把 codex provider 接入 dsh-oauth。返回 { authService }（其下已注册 openaiCodexAuth）。
 * @param {object} ctx - dsh 插件 fiber context（需要 llm / webServer）
 */
export function installCodex(ctx) {
  const DSH_HOME = process.env.DSH_HOME ?? join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.dsh')
  const secretStore = createDefaultSecretStore({ platform: process.platform })
  const accountStore = new OAuthAccountStore({ file: join(DSH_HOME, 'oauth-login', 'codex-accounts.json') })
  void accountStore.load().catch((e) => ctx.logger?.warn('codex account store: %s', e?.message ?? e))

  const authService = new CodexAuthService(ctx, { accountStore, secretStore, oauthConfig: {} })

  // 2026-09-22：token 唯一正源 = 官方 credential record「llm-pi-ai/openai-codex」。
  // 用 lazy 门面（每次调用现取 `ctx.get('credentials')`）：插件启动顺序与 credentials
  // 服务挂载顺序解耦，服务后到也能自动接上；服务不存在时 available()=false，全链路退化为
  // 旧 secret store 只读路径（fail-open，不抛错、不阻塞登录与对话）。
  const credentialRecord = new CodexCredentialRecord(ctx)
  authService.recordStore = credentialRecord

  // 网络出口：供应商域走系统代理（照 lib/index.js apply 的 autoProxy；openaiFetch 仅 OpenAI 域名走隧道）。
  const proxyUrl = resolveProxyConfig('').url
  const http = (url, init) => openaiFetch(url, init, proxyUrl)

  /* ----------------------------- Fast Mode 状态（search 已拆到独立 row） ----------------------------- */

  const fastMode = new FastModeRegistry()
  let fastModeWriteTail = Promise.resolve()
  let fastModeDisposed = false
  // 2026-09-22：settings 命名空间路径已死（settings.register 在 0.1.7-alpha.1 不存在），
  // 持久化改为插件自有文件 `data/fast-mode.json`（FastModeStore，原子写 + 失败回滚）。
  const fastModeStore = new FastModeStore({ logger: ctx.logger })

  const usageTracker = new CodexUsageTracker({
    readCredential: () => authService.credential(),
    http,
  })
  // The image row uses this to reject a known-unsupported Free plan before
  // sending a request; it shares the base status cache instead of fetching twice.
  authService.usageTracker = usageTracker

  /** 从自有存储重载 Fast Mode（文件缺失=全默认）。搜索状态由独立搜索组件行管理。 */
  function loadFeaturesFromStore() {
    const state = fastModeStore.snapshot()
    try {
      fastMode.replace(state.models)
    } catch (e) {
      ctx.logger?.warn('dsh-codex-supplement: codex fast mode store invalid: %s', e instanceof Error ? e.message : String(e))
    }
  }

  // 启动即读一次 `data/fast-mode.json`（异步；失败保持空态 = 全部关闭）
  void fastModeStore.load()
    .then(() => loadFeaturesFromStore())
    .catch((e) => ctx.logger?.warn('dsh-codex-supplement: codex fast mode store load failed: %s', e instanceof Error ? e.message : String(e)))

  /**
   * Fast mode 持久化（照旧插件 persistFastMode 语义：先改运行时镜像，写失败回滚）。
   * 2026-09-22 起写 `data/fast-mode.json`（FastModeStore 内部原子写 + 写队列），
   * 不再写 settings（该路径在 0.1.7-alpha.1 已不可用）。写入仍是串行的（fastModeWriteTail）。
   */
  const persistFastMode = (model, enabled) => {
    const next = fastModeWriteTail.catch(() => {}).then(async () => {
      if (fastModeDisposed) throw new Error('codex Fast Mode plugin is disposed')
      const previous = fastMode.isEnabled(model)
      fastMode.set(model, enabled)
      try {
        await fastModeStore.setModel(model, enabled)
      } catch (error) {
        fastMode.set(model, previous)
        throw error
      }
    })
    fastModeWriteTail = next
    return next
  }


  // 2026-09-22 移除：原 `settingsFiber = ctx.inject(['settings'], …)` 块
  // （settingsService.register(NS, CodexFeaturesSettings) + watch 重载 + detach effect）。
  // 死因：0.1.7-alpha.1 的 settings 服务没有 `register`；`mutate` 也只接受
  // 「插件条目 id + Config .volatile() 字段」，写命名空间 `dsh-oauth` 会抛
  // 「Plugin entry … has no volatile fields」。持久化改走 FastModeStore / SearchStore。

  // 路由（同源 webServer；POST 校验 method）
  const disposers = []
  const route = (path, method, fn) => disposers.push(ctx.webServer.register({ kind: 'exact', path, handler: async (req, res) => {
    if (method && req.method !== method) { sendJson(res, 405, { error: 'method mismatch' }); return }
    try {
      sendJson(res, 200, await fn(req))
    } catch (e) {
      sendJson(res, 500, { error: e?.message ?? String(e) })
    }
  } }))

  route(`${AUTH_PREFIX_CODEX}/status`, null, async () => {
    const status = await authService.status()
    // 快速路径：用量只回当前缓存（秒回），后台刷新；登录态 UI 不卡（2026-09-03 修延迟）。
    const usageResult = usageTracker.peek()
    void usageTracker.get().catch((e) => {
      ctx.logger?.warn('dsh-codex-supplement: codex usage background refresh failed: %s', e instanceof Error ? e.message : String(e))
    })
    // 普通模型目录和能力由官方 openai-codex provider 管理；这里仅查询用量/Fast Mode 状态。
    return {
      ...status,
      usage: usageResult.usage,
      usageError: usageResult.usageError,
      fastModeModels: fastMode.models(),
    }
  })
  route(`${AUTH_PREFIX_CODEX}/login`, 'POST', async () => {
    usageTracker.reset()
    return authService.startBrowserLogin()
  })
  route(`${AUTH_PREFIX_CODEX}/login-device`, 'POST', async () => {
    usageTracker.reset()
    return authService.startDeviceLogin()
  })
  route(`${AUTH_PREFIX_CODEX}/poll`, 'POST', () => authService.poll())
  route(`${AUTH_PREFIX_CODEX}/submit-code`, 'POST', async (req) => {
    const body = (await readJsonBody(req)) ?? {}
    return authService.submitCode(body.sessionId ?? authService.loginSessionId, body.code ?? '')
  })
  route(`${AUTH_PREFIX_CODEX}/cancel`, 'POST', () => authService.cancel())
  route(`${AUTH_PREFIX_CODEX}/logout`, 'POST', async (req) => {
    const accountId = new URL(req.url ?? '/', 'http://x').searchParams.get('accountId') || null
    usageTracker.reset()
    return authService.logout(accountId)
  })
  // 用量（照旧插件 status 的 30s 缓存语义；refresh=1 强制刷新）
  route(`${AUTH_PREFIX_CODEX}/usage`, null, async (req) => {
    const refresh = new URL(req.url ?? '/', 'http://x').searchParams.get('refresh') === '1'
    return usageTracker.get({ refresh })
  })
  // Fast mode（照旧插件 registerFastModeRoute；authorize 校验同源）
  disposers.push(registerFastModeRoute(ctx.webServer, fastMode, requestAllowed, persistFastMode))

  // Fast mode 的**实际生效机制**（2026-09-22 改走官方路由后）：
  // 对话请求现在由官方 `dsh-llm-pi-ai` 发出，本插件拿不到调用点、无法传 `serviceTier`
  // （官方包内实测无 `serviceTier`/`service_tier` 字样）。因此在 fetch 出口装一层注入器：
  // 只对官方 codex responses 端点（https://chatgpt.com/backend-api/codex/responses）
  // 且当前模型处于 Fast mode 时，把 `service_tier: 'priority'` 打进请求体；
  // 请求体可能是 zstd（pi-ai 默认压缩）或裸 JSON，两种都能改写。
  // 全链路 fail-open：任何一步失败都原样发包，绝不影响对话。
  // 未来官方 surface 出 serviceTier 后，本注入器可直接删除（见记录 §五）。
  try {
    disposers.push(installCodexServiceTierInjector(
      () => (modelId) => fastMode.isEnabled(modelId),
      { logger: ctx.logger },
    ))
  } catch (error) {
    ctx.logger?.warn('dsh-codex-supplement: codex service_tier 注入器安装失败（Fast mode 将不生效，其余功能不受影响）: %s',
      error instanceof Error ? error.message : String(error))
  }

  ctx.effect(() => () => {
    fastModeDisposed = true
    fastMode.clear()
    for (const d of disposers) d()
  }, 'dsh-codex-supplement: codex routes')

  // 同源语义见 requestAllowed 注释；403 响应体在 fast-mode.mjs 里回报 origin/sec-fetch-site。
  return { authService, providerId: 'codex', providerName: PROVIDER_NAME, credentialRecord, fastModeStore }
}

export const codexModuleConstants = Object.freeze({
  providerId: 'codex',
  providerName: PROVIDER_NAME,
  authPrefix: AUTH_PREFIX_CODEX,
  // 2026-09-22：原 `settingsNamespace: NS` 已移除（settings 路径失效，见文件头说明）。
  // 持久化文件位置与 token 正源记录 key 对外公开，便于诊断与回归核对。
  fastModeStoreFile: FAST_MODE_STORE_FILE,
  credentialRecordKey: CODEX_CREDENTIAL_KEY,
})
