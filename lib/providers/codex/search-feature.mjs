/**
 * Codex 联网搜索组件（独立 row）。
 *
 * 依赖 base row 的 `openaiCodexAuth` 服务，但**不要求它在 apply 时已经存在**：
 * 凭据在真正搜索时懒取，设置页/路由可以独立加载。搜索开关写自己的
 * `data/search.json`，并管理 profile 的 `web` 覆盖块（仅插件标记块）。
 *
 * @module dsh-codex-supplement/search-feature
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { openaiFetch, resolveProxyConfig } from '../../shared/proxy.mjs'
import { CodexSearchProvider } from './search.mjs'
import { SearchStore, SEARCH_STORE_FILE } from './search-store.mjs'

const AUTH_PREFIX = '/plugins/dsh-codex-supplement'
const AUTH_PREFIX_CODEX = `${AUTH_PREFIX}/codex`

const PROFILE_ROOT = process.env.DSH_PROFILE_DIR
  ? resolve(process.env.DSH_PROFILE_DIR)
  : join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')
const PROFILE_PATCH_PATH = join(PROFILE_ROOT, 'cordis.patch.yml')
const SEARCH_SWITCH_MARK = 'dsh-codex-supplement GPT 网络搜索开关（本块由 Codex Supplement 管理，请勿手改）'
const LEGACY_SEARCH_SWITCH_MARK = 'dsh-oauth GPT 网络搜索开关（本块由 dsh-oauth 插件管理，请勿手改）'

function sendJson(response, status, value) {
  return response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  }).end(JSON.stringify(value))
}

async function readJsonBody(req, maxBytes = 64 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) return undefined
    chunks.push(chunk)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

function requestAllowed(request) {
  const origin = request.headers.origin
  const secFetchSite = request.headers['sec-fetch-site']
  if (origin !== undefined && origin !== null && origin !== '' && origin !== 'null') {
    let parsed
    try { parsed = new URL(origin) } catch { return false }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const host = request.headers.host
      if (typeof host !== 'string' || host.length === 0) return false
      if (parsed.host !== host) return false
      return secFetchSite !== 'cross-site'
    }
    return true
  }
  return secFetchSite !== 'cross-site'
}

/**
 * 安装搜索组件：路由、开关持久化、provider 注册/注销、profile web 覆盖块。
 * @param {object} ctx plugin context（需要 webServer；provider 注册时再 inject web）
 */
export function installCodexSearch(ctx) {
  const store = new SearchStore()
  let enabled = false
  let active = false
  let fiber = null
  let disposed = false
  let writeTail = Promise.resolve()
  const disposers = []

  const http = (url, init) => openaiFetch(url, init, resolveProxyConfig('').url)

  const credential = () => {
    const auth = ctx.get('openaiCodexAuth')
    if (auth === undefined) throw new Error('Codex sign-in service is unavailable')
    return auth.credential()
  }

  async function ensureSearchPatchRow() {
    let raw
    try {
      raw = await readFile(PROFILE_PATCH_PATH, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        ctx.logger?.warn('dsh-codex-supplement-search: 读取 %s 失败: %s', PROFILE_PATCH_PATH,
          error instanceof Error ? error.message : String(error))
        return
      }
      raw = ''
    }
    if (raw.includes(SEARCH_SWITCH_MARK) || raw.includes(LEGACY_SEARCH_SWITCH_MARK)) return
    if (/^- id: web$/m.test(raw)) {
      ctx.logger?.warn(
        'dsh-codex-supplement-search: %s 已有手写 web 覆盖行，未自动写入；请手动把 searchProvider 设为 openai-codex 后重启',
        PROFILE_PATCH_PATH)
      return
    }
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const block = ['# ── ' + SEARCH_SWITCH_MARK + ' ──', '- id: web', '  config:', '    searchProvider: openai-codex'].join(eol)
    const tail = raw.length === 0 ? '' : raw.endsWith(eol) ? '' : eol
    try {
      await writeFile(PROFILE_PATCH_PATH, raw + tail + block + eol, 'utf8')
      ctx.logger?.info('dsh-codex-supplement-search: 已写入 web 搜索切换行（searchProvider=openai-codex）')
    } catch (error) {
      ctx.logger?.warn('dsh-codex-supplement-search: 写入 %s 失败: %s', PROFILE_PATCH_PATH,
        error instanceof Error ? error.message : String(error))
    }
  }

  async function removeSearchPatchRow() {
    let raw
    try {
      raw = await readFile(PROFILE_PATCH_PATH, 'utf8')
    } catch {
      return
    }
    if (!raw.includes(SEARCH_SWITCH_MARK) && !raw.includes(LEGACY_SEARCH_SWITCH_MARK)) return
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const kept = []
    let inBlock = false
    for (const line of raw.split(/\r?\n/)) {
      if (line.includes(SEARCH_SWITCH_MARK) || line.includes(LEGACY_SEARCH_SWITCH_MARK)) { inBlock = true; continue }
      if (inBlock) {
        const trimmed = line.trim()
        if (trimmed === '- id: web' || trimmed === 'config:' || /^searchProvider:.+$/.test(trimmed)) continue
        inBlock = false
      }
      kept.push(line)
    }
    const next = kept.join(eol)
    try {
      await writeFile(PROFILE_PATCH_PATH, next.length > 0 && !next.endsWith(eol) ? next + eol : next, 'utf8')
      ctx.logger?.info('dsh-codex-supplement-search: 已移除 web 搜索切换行')
    } catch (error) {
      ctx.logger?.warn('dsh-codex-supplement-search: 写回 %s 失败: %s', PROFILE_PATCH_PATH,
        error instanceof Error ? error.message : String(error))
    }
  }

  async function reconcile() {
    if (active === enabled) return
    active = enabled
    const previous = fiber
    fiber = null
    if (previous !== null) {
      try { await previous.dispose?.() } catch { /* ignore */ }
    }
    if (!enabled) {
      try { await removeSearchPatchRow() } catch { /* logged inside */ }
      return
    }
    const next = ctx.inject(['web'], (webCtx) => webCtx.web.registerSearchProvider(new CodexSearchProvider({
      credentials: credential,
      http,
      model: 'gpt-5.6-sol',
      mode: 'cached',
      contextSize: 'medium',
      maxOutputTokens: 10_000,
      resolveRequestId: () => {
        try {
          const agents = webCtx.get('agents')
          return String(agents?.currentInitiator?.()?.session?.id ?? 'dsh-codex-supplement-search')
        } catch {
          return 'dsh-codex-supplement-search'
        }
      },
    })))
    fiber = next
    try { await ensureSearchPatchRow() } catch { /* logged inside */ }
    void Promise.resolve(next).catch((error) => {
      if (fiber === next) { fiber = null; active = false }
      ctx.logger?.error('dsh-codex-supplement-search: provider failed to activate')
      ctx.logger?.error(error)
    })
  }

  async function setEnabled(next) {
    if (disposed) throw new Error('search component is disposed')
    const task = writeTail.then(async () => {
      enabled = next
      try {
        await store.setEnabled(next)
      } catch (error) {
        ctx.logger?.warn('dsh-codex-supplement-search: 写入 %s 失败（本次会话仍生效）: %s',
          SEARCH_STORE_FILE, error instanceof Error ? error.message : String(error))
      }
      await reconcile()
      return next
    })
    writeTail = task.then(() => undefined, () => undefined)
    return task
  }

  const route = (path, method, fn) => disposers.push(ctx.webServer.register({
    kind: 'exact',
    path,
    handler: async (req, res) => {
      if (!requestAllowed(req)) { sendJson(res, 403, { error: 'origin not allowed' }); return }
      if (method !== null && req.method !== method) { sendJson(res, 405, { error: 'method mismatch' }); return }
      try {
        sendJson(res, 200, await fn(req))
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  route(`${AUTH_PREFIX_CODEX}/search/status`, 'GET', async () => ({ enabled, available: true }))
  route(`${AUTH_PREFIX_CODEX}/search`, 'POST', async (req) => {
    const body = (await readJsonBody(req)) ?? {}
    if (typeof body.enabled !== 'boolean') throw new Error('invalid input: enabled must be a boolean')
    await setEnabled(body.enabled)
    return { enabled }
  })

  void store.load().then((state) => {
    if (disposed) return
    enabled = state.enabled === true
    return reconcile()
  }).catch((error) => {
    ctx.logger?.warn('dsh-codex-supplement-search: store load failed: %s',
      error instanceof Error ? error.message : String(error))
  })

  ctx.effect(() => () => {
    disposed = true
    for (const dispose of disposers) {
      try { dispose() } catch { /* ignore */ }
    }
    const current = fiber
    fiber = null
    if (current !== null) void current.dispose?.()
  }, 'dsh-codex-supplement: search component')
}
