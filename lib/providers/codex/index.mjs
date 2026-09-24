/**
 * Codex (ChatGPT subscription) Host module for Codex Supplement.
 *
 * `installCodex(ctx)` owns Codex-specific account and adjacent features:
 * - Uses the DSH official credential record `llm-pi-ai/openai-codex` as the shared token source.
 * - Provides OAuth/login, usage/quota, Codex search, and Fast Mode; model catalog/capabilities stay with official `openai-codex`.
 * - Provides `openaiCodexAuth` to the subscription image tool in this same bundle.
 * - Persists Fast Mode/search flags under plugin-owned `data/fast-mode.json`.
 * - Manages the marked `web` search-provider override and recognizes the former `dsh-oauth` marker on removal.
 *
 * Codex chat transport and model execution remain owned by DSH's official `openai-codex` provider;
 * this module does not register a chat adapter.
 * @module dsh-codex-supplement/codex
 */

import { join, dirname, resolve } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { createDefaultSecretStore } from '../../shared/secret-store.mjs'
import { OAuthAccountStore } from '../../shared/account-store.mjs'
import { openaiFetch, resolveProxyConfig, installCodexServiceTierInjector } from '../../shared/proxy.mjs'
import { CodexAuthService } from './codex-auth-service.mjs'
import { CodexCredentialRecord, CODEX_CREDENTIAL_KEY } from './codex-credential-record.mjs'
import { FastModeStore, FAST_MODE_STORE_FILE } from './fast-mode-store.mjs'
import { CodexSearchProvider } from './search.mjs'
import { CodexUsageTracker } from './usage.mjs'
import { FastModeRegistry, registerFastModeRoute } from './fast-mode.mjs'

const PROVIDER_NAME = 'ChatGPT'

const AUTH_PREFIX = '/plugins/dsh-codex-supplement'
const AUTH_PREFIX_CODEX = `${AUTH_PREFIX}/codex`

// 2026-09-22：原 `const NS = 'dsh-oauth'`（settings 命名空间）已移除——0.1.7-alpha.1 起
// settings 服务没有 register，且 mutate 只认「插件条目 id + Config .volatile() 字段」，
// 该命名空间无法再注册/写入。状态改存插件自有文件 `data/fast-mode.json`（fast-mode-store.mjs）。
// 对象消失=进回归清单：见 README「已知限制」与 ARCHITECTURE_MAP 的 2026-09-22 变更段。

/**
 * profile 级用户 patch 层路径。优先使用 DSH 注入的 `DSH_PROFILE_DIR`；仅在隔离测试/旧宿主
 * 未提供该变量时，才按插件位于 `profiles/<name>/plugins/dsh-codex-supplement` 的相对层级回退。
 * 用户 patch 层按插件行 id 覆盖 bundle 层，`cordis.patch.yml` 由 DSH watcher 负责热重组。
 */
const PROFILE_ROOT = process.env.DSH_PROFILE_DIR
  ? resolve(process.env.DSH_PROFILE_DIR)
  : join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')
const PROFILE_PATCH_PATH = join(PROFILE_ROOT, 'cordis.patch.yml')
/** 搜索开关写入块的唯一标记。删除时按行过滤「标记行 + 本块已知的三种行」，绝不触碰手改/无标记行。 */
const SEARCH_SWITCH_MARK = 'dsh-codex-supplement GPT 网络搜索开关（本块由 Codex Supplement 管理，请勿手改）'
const LEGACY_SEARCH_SWITCH_MARK = 'dsh-oauth GPT 网络搜索开关（本块由 dsh-oauth 插件管理，请勿手改）'

// 2026-09-22 移除（保留说明 = 「消失的对象进回归清单」）：
// 原 `CodexFeaturesSettings = z.object({ fastModeModels: z.dict(z.boolean()).default({}),
// searchEnabled: z.boolean().default(false) })` —— settings 命名空间 `dsh-oauth` 的 schema。
// 死因：0.1.7-alpha.1 的 settings 服务没有 `register`，`mutate` 对非插件条目 id 直接抛
// 「Plugin entry … has no volatile fields」。两字段的持久化改由 fast-mode-store.mjs 承担
// （`data/fast-mode.json` 的 `models` / `searchEnabled`），语义不变。

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

  /* ----------------------------- 增强能力状态（search / usage / fast-mode） ----------------------------- */

  const fastMode = new FastModeRegistry()
  let searchEnabled = false
  let searchFiber = null
  let searchActive = false
  let fastModeWriteTail = Promise.resolve()
  let fastModeDisposed = false
  // 2026-09-22：settings 命名空间路径已死（settings.register 在 0.1.7-alpha.1 不存在），
  // 持久化改为插件自有文件 `data/fast-mode.json`（FastModeStore，原子写 + 失败回滚）。
  const fastModeStore = new FastModeStore({ logger: ctx.logger })

  const usageTracker = new CodexUsageTracker({
    readCredential: () => authService.credential(),
    http,
  })

  /** 从自有存储重载增强能力（fastMode.replace + searchEnabled 读取）；文件缺失=全默认。 */
  function loadFeaturesFromStore() {
    const state = fastModeStore.snapshot()
    try {
      fastMode.replace(state.models)
    } catch (e) {
      ctx.logger?.warn('dsh-codex-supplement: codex fast mode store invalid: %s', e instanceof Error ? e.message : String(e))
    }
    // 默认关（文件未显式存过 → false）：官方 DeepSeek 搜索保持不变；只有用户显式开（true）才切 GPT 搜索
    const next = state.searchEnabled === true
    // 初始（searchActive=false）或变化时都要 reconcile，确保 provider 注册/注销
    if (next !== searchEnabled || searchActive !== searchEnabled) {
      searchEnabled = next
      void reconcileSearch()
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

  /**
   * 在 profile 补丁写入 web 搜索覆盖块（幂等）。⚠️ 机制澄清（2026-09-03 调查）：
   * dsh 的搜索 provider 选择只看 cordis `web` 行 config.searchProvider（启动固定），
   * settings 命名空间 `web` 无任何消费者——旧插件照抄的 settings.mutate('web', ...) 是死路径，
   * 因此改为直接管理 profile cordis.patch.yml（官方文档：用户 patch 层按 id 覆盖 bundle 行，
   * 文件被 watchUserPatches 热监视）。绝不触碰无本插件标记的手写 web 行。
   */
  async function ensureSearchPatchRow() {
    let raw
    try {
      raw = await readFile(PROFILE_PATCH_PATH, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        ctx.logger?.warn('dsh-codex-supplement: 读取 %s 失败，本次未写入搜索切换行: %s', PROFILE_PATCH_PATH,
          error instanceof Error ? error.message : String(error))
        return
      }
      raw = ''
    }
    if (raw.includes(SEARCH_SWITCH_MARK) || raw.includes(LEGACY_SEARCH_SWITCH_MARK)) return
    // 顶层 `- id: web`（insert 块内为缩进两格，不匹配）：已有手写 web 行 → 不重复写，提示手动改
    if (/^- id: web$/m.test(raw)) {
      ctx.logger?.warn(
        'dsh-codex-supplement: %s 已有手写的 web 覆盖行（无本插件标记），未自动写入；请手动将 searchProvider 设为 openai-codex 后重启',
        PROFILE_PATCH_PATH)
      return
    }
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const block = ['# ── ' + SEARCH_SWITCH_MARK + ' ──', '- id: web', '  config:', '    searchProvider: openai-codex'].join(eol)
    const tail = raw.length === 0 ? '' : raw.endsWith(eol) ? '' : eol
    try {
      await writeFile(PROFILE_PATCH_PATH, raw + tail + block + eol, 'utf8')
      ctx.logger?.info('dsh-codex-supplement: 已在 %s 写入 web 搜索切换行（searchProvider=openai-codex；一般即刻生效，重启为确定路径）', PROFILE_PATCH_PATH)
    } catch (error) {
      ctx.logger?.warn('dsh-codex-supplement: 写入 %s 失败: %s', PROFILE_PATCH_PATH, error instanceof Error ? error.message : String(error))
    }
  }

  /** 移除本插件写入的搜索覆盖块（仅限标记块内的已知行；其余内容原样保留）。 */
  async function removeSearchPatchRow() {
    let raw
    try {
      raw = await readFile(PROFILE_PATCH_PATH, 'utf8')
    } catch {
      return
    }
    if (!raw.includes(SEARCH_SWITCH_MARK) && !raw.includes(LEGACY_SEARCH_SWITCH_MARK)) return
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const lines = raw.split(/\r?\n/)
    const kept = []
    let inBlock = false
    for (const line of lines) {
      if (line.includes(SEARCH_SWITCH_MARK) || line.includes(LEGACY_SEARCH_SWITCH_MARK)) { inBlock = true; continue }
      if (inBlock) {
        const trimmed = line.trim()
        // 本块已知的三种行 → 删除；其他内容 → 退出块并保留
        if (trimmed === '- id: web' || trimmed === 'config:' || /^searchProvider:.+$/.test(trimmed)) continue
        inBlock = false
      }
      kept.push(line)
    }
    const next = kept.join(eol)
    try {
      await writeFile(PROFILE_PATCH_PATH, next.length > 0 && !next.endsWith(eol) ? next + eol : next, 'utf8')
      ctx.logger?.info('dsh-codex-supplement: 已从 %s 移除 web 搜索切换行（恢复官方 DeepSeek 搜索）', PROFILE_PATCH_PATH)
    } catch (error) {
      ctx.logger?.warn('dsh-codex-supplement: 写回 %s 失败: %s', PROFILE_PATCH_PATH, error instanceof Error ? error.message : String(error))
    }
  }

  /** 搜索 provider 热注册 + web 覆盖行管理：开启=写补丁行并注册 provider，关闭=撤补丁行并注销。 */
  async function reconcileSearch() {
    if (searchActive === searchEnabled) return
    searchActive = searchEnabled
    const previous = searchFiber
    searchFiber = null
    if (previous !== null) {
      try { await previous.dispose?.() } catch { /* 忽略 */ }
    }
    if (!searchEnabled) {
      try { await removeSearchPatchRow() } catch (e) {
        ctx.logger?.warn('dsh-codex-supplement: 搜索覆盖行移除失败: %s', e instanceof Error ? e.message : String(e))
      }
      return
    }
    const fiber = ctx.inject(['web'], (webCtx) => {
      return webCtx.web.registerSearchProvider(new CodexSearchProvider({
        credentials: () => authService.credential(),
        http,
        // 搜索默认模型对齐旧插件 searchModel（gpt-5.6-sol；pi-ai 5.6 全系 supportsToolSearch）
        model: 'gpt-5.6-sol',
        mode: 'cached',
        contextSize: 'medium',
        maxOutputTokens: 10_000,
        resolveRequestId: () => {
          // 照旧插件取当前发起者 session id；services 缺失时回退插件名。
          try {
            const agents = webCtx.get('agents')
            return String(agents?.currentInitiator?.()?.session?.id ?? 'dsh-codex-supplement')
          } catch {
            return 'dsh-codex-supplement'
          }
        },
      }))
    })
    searchFiber = fiber
    try { await ensureSearchPatchRow() } catch (e) {
      ctx.logger?.warn('dsh-codex-supplement: 搜索覆盖行写入失败: %s', e instanceof Error ? e.message : String(e))
    }
    void Promise.resolve(fiber).catch((error) => {
      if (searchFiber === fiber) { searchFiber = null; searchActive = false }
      ctx.logger?.error('dsh-codex-supplement: optional codex search provider failed to activate')
      ctx.logger?.error(error)
    })
  }

  /** 开关（设置卡/路由调用）：持久化（data/fast-mode.json）+ 刷新注册。 */
  async function setSearchEnabled(enabled) {
    searchEnabled = enabled
    try {
      await fastModeStore.setSearchEnabled(enabled)
    } catch (error) {
      ctx.logger?.warn('dsh-codex-supplement: 搜索开关写入 data/fast-mode.json 失败（本次会话仍生效，重启丢失）: %s',
        error instanceof Error ? error.message : String(error))
    }
    await reconcileSearch()
  }

  // 2026-09-22 移除：原 `settingsFiber = ctx.inject(['settings'], …)` 块
  // （settingsService.register(NS, CodexFeaturesSettings) + watch 重载 + detach effect）。
  // 死因：0.1.7-alpha.1 的 settings 服务没有 `register`；`mutate` 也只接受
  // 「插件条目 id + Config .volatile() 字段」，写命名空间 `dsh-oauth` 会抛
  // 「Plugin entry … has no volatile fields」。上面 loadFeaturesFromStore / persistFastMode
  // / setSearchEnabled 已全部改走 FastModeStore，本块无替代物可留，故整体删除。

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
    // 普通模型目录和能力由官方 openai-codex provider 管理；这里仅查询用量/搜索/Fast Mode 状态。
    return {
      ...status,
      usage: usageResult.usage,
      usageError: usageResult.usageError,
      search: { enabled: searchEnabled },
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
  // 搜索开关（照旧插件 enableSearch 热切换）
  route(`${AUTH_PREFIX_CODEX}/search`, 'POST', async (req) => {
    const body = (await readJsonBody(req)) ?? {}
    if (typeof body.enabled !== 'boolean') throw new Error('invalid input: enabled must be a boolean')
    await setSearchEnabled(body.enabled)
    return { enabled: searchEnabled }
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
    const fiber = searchFiber
    searchFiber = null
    if (fiber !== null) void fiber.dispose?.()
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
