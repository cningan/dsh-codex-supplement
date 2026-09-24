/**
 * dsh-codex 网络出口（代理隧道）。
 *
 * 为什么存在：OpenAI 的授权/token/用量/搜索/图片端点对部分地区直连 IP 返回
 * 403 unsupported_country_region_territory（已实测），而本机浏览器能完成授权
 * ——因为浏览器走 Windows 系统代理（HKCU Internet Settings，如 127.0.0.1:7897），
 * dsh 主进程的 Node fetch 不读系统代理，直连即被封锁。
 *
 * 上游参考结论：dsh-codex-oauth 自建 PKCE 与 dsh-codex-connect 所用的
 * pi-ai 内置 OAuth（models.login）全部在 Node 进程里做 token 交换，且均无
 * 任何代理处理——它们假设直连可用。本模块为「直连被封锁」的环境补上代理出口，
 * 协议逻辑仍与上游一致（吸收战略：上游没有的才自造）。
 *
 * 实现：
 * - 代理检测：显式配置 > Windows 注册表系统代理 > 环境变量 HTTPS_PROXY/HTTP_PROXY
 * - 传输：HTTP CONNECT 隧道（node:https 自定义 Agent，纯内置模块，零依赖）
 * - openaiFetch：fetch 兼容出口，仅 OpenAI 域名走隧道，其余走原生 fetch
 * - installFetchProxy：为 llm-pi-ai 的 openai-codex SSE 传输补代理（pi-ai 的
 *   SSE/WebSocket 传输无代理配置项；配合 profile 的 transport: 'sse' 使用）
 * - installCodexServiceTierInjector（2026-09-22 新增）：Fast mode 的 `service_tier:
 *   'priority'` 注入。codex 对话改走官方 llm-pi-ai 的 openai-codex 路由后，插件无法在
 *   调用点传参（官方包内无 serviceTier 入口），故在 fetch 出口按「端点 + body.model
 *   命中 Fast mode 注册表」注入；请求体可能是 zstd（pi-ai 默认压缩）或裸 JSON。全 fail-open。
 *
 * 迁移路线：若 pi-ai 官方为 codex provider 的 SSE/WebSocket 传输提供代理配置，
 * 可移除 installFetchProxy 全局补丁（届时删本文件的补丁说明并同步架构代码地图）；
 * 若官方 surface 出 serviceTier 入口，可移除 installCodexServiceTierInjector
 * （单行回退：删 index.mjs 里的安装调用 + 本段）。插件自有请求保留 openaiFetch 显式出口。
 * @module dsh-codex/proxy
 */

import { execFileSync } from 'node:child_process'
import { connect as netConnect } from 'node:net'
import tls from 'node:tls'
import https from 'node:https'
import { Readable } from 'node:stream'

/** 模块加载时捕获的真 fetch（installFetchProxy 恢复与 openaiFetch 直连都用它，避免递归）。 */
const originalFetch = globalThis.fetch

/** OpenAI/Codex 服务域名（裸域 + 子域后缀）；非 OpenAI 供应商不进入本插件代理范围。 */
const OPENAI_HOSTS = new Set(['openai.com', 'chatgpt.com', 'oaistatic.com'])
const OPENAI_HOST_SUFFIXES = ['.openai.com', '.chatgpt.com', '.oaistatic.com']

/** 判断目标主机是否属于 OpenAI 系列域名（裸域也要匹配：chatgpt.com 不以 .chatgpt.com 结尾）。 */
export function isOpenAITarget(url) {
  if (typeof url === 'string') {
    try { url = new URL(url) } catch { return false }
  }
  const host = (url.hostname ?? '').toLowerCase()
  return OPENAI_HOSTS.has(host) || OPENAI_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

/**
 * 读取 Windows 系统代理（与浏览器同源：HKCU Internet Settings）。
 * @returns {{ url: string, source: string } | undefined}
 */
export function detectSystemProxyUrl() {
  if (process.platform === 'win32') {
    try {
      const stdout = execFileSync(
        'reg',
        ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'],
        { encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] },
      )
      const lines = stdout.split(/\r?\n/)
      const valueOf = (name) => {
        const needle = name.toLowerCase()
        for (const line of lines) {
          if (!line.toLowerCase().includes(needle)) continue
          const match = line.match(/REG_(?:DWORD|SZ|EXPAND_SZ)\s+(.+)$/i)
          if (match !== null) return match[1].trim()
        }
        return undefined
      }
      const enabled = valueOf('ProxyEnable')
      if (enabled !== '0x1' && enabled !== '1') return undefined
      const server = valueOf('ProxyServer')
      if (typeof server !== 'string' || server.length === 0) return undefined
      // 形如 "https=host:port;http=host:port" 时优先 https 项；否则取裸值
      const httpsEntry = server.split(';').find((part) => /^https=/i.test(part))
      const plainEntry = server.split(';').find((part) => !/^[a-z]+=/i.test(part))
      const selected = httpsEntry !== undefined
        ? httpsEntry.replace(/^https=/i, '')
        : plainEntry ?? server
      if (typeof selected !== 'string' || selected.length === 0) return undefined
      return { url: /^https?:\/\//i.test(selected) ? selected : `http://${selected}`, source: 'auto' }
    } catch {
      // 注册表不可读时落到环境变量
    }
  }
  const envUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY
  if (typeof envUrl === 'string' && envUrl.length > 0) {
    return { url: /^https?:\/\//i.test(envUrl) ? envUrl : `http://${envUrl}`, source: 'env' }
  }
  return undefined
}

/**
 * 解析代理配置。
 * - 空字符串 → 自动检测（注册表 → 环境变量）
 * - 'direct' / 'off' / 'none' → 强制直连
 * - 其它 → 视为代理 URL（http/https）
 * @returns {{ url: string | undefined, source: string }}
 */
export function resolveProxyConfig(configured) {
  const raw = typeof configured === 'string' ? configured.trim() : ''
  const lowered = raw.toLowerCase()
  if (lowered === 'direct' || lowered === 'off' || lowered === 'none') {
    return { url: undefined, source: 'off' }
  }
  if (raw !== '') {
    if (!/^https?:\/\//i.test(raw)) throw new Error(`invalid proxy URL: ${raw}`)
    return { url: raw, source: 'config' }
  }
  return detectSystemProxyUrl() ?? { url: undefined, source: 'off' }
}

/** HTTP CONNECT 隧道 Agent（仅 https 目标）。 */
class ConnectTunnelAgent extends https.Agent {
  constructor(proxyUrl) {
    super({ keepAlive: false })
    this.proxyUrl = typeof proxyUrl === 'string' ? new URL(proxyUrl) : proxyUrl
  }

  createConnection(options, callback) {
    const proxy = this.proxyUrl
    const proxyPort = Number(proxy.port) || 8080
    const targetHost = options.host ?? options.hostname
    const targetPort = options.port ?? 443
    const socket = netConnect({ host: proxy.hostname, port: proxyPort })
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      socket.destroy()
      callback(error)
    }
    socket.once('error', fail)
    socket.setTimeout(15_000, () => fail(new Error(`Proxy CONNECT to ${targetHost}:${targetPort} timed out`)))
    socket.once('connect', () => {
      socket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n\r\n`)
    })
    let head = ''
    const onData = (chunk) => {
      head += chunk.toString('latin1')
      const end = head.indexOf('\r\n\r\n')
      if (end === -1) return
      socket.removeListener('data', onData)
      const statusLine = head.slice(0, head.indexOf('\r\n'))
      if (!/^HTTP\/1\.[01] 2\d\d/.test(statusLine)) {
        fail(new Error(`Proxy CONNECT failed: ${statusLine}`))
        return
      }
      if (settled) return
      settled = true
      socket.setTimeout(0)
      const rest = head.slice(end + 4)
      if (rest.length > 0) socket.unshift(Buffer.from(rest, 'latin1'))
      const tlsSocket = tls.connect({ socket, servername: targetHost })
      callback(null, tlsSocket)
    }
    socket.on('data', onData)
  }
}

const agentCache = new Map()

function getAgent(proxyUrl) {
  let agent = agentCache.get(proxyUrl)
  if (agent === undefined) {
    agent = new ConnectTunnelAgent(proxyUrl)
    agentCache.set(proxyUrl, agent)
  }
  return agent
}

/** 读取 Web 流为文本或 ArrayBuffer（有界性由调用方负责）。 */
async function collect(stream, kind) {
  const reader = stream.getReader()
  const chunks = []
  let length = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    chunks.push(value)
  }
  reader.releaseLock()
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return kind === 'buffer' ? bytes.buffer : new TextDecoder().decode(bytes)
}

/** redirect: 'manual' 时返回的 opaque 响应（对齐 undici fetch 语义）。 */
function opaqueRedirect() {
  return {
    type: 'opaqueredirect',
    status: 0,
    ok: false,
    headers: new Headers(),
    body: null,
    async text() { return '' },
    async json() { throw new TypeError('fetch failed') },
    async arrayBuffer() { return new ArrayBuffer(0) },
  }
}

/** 连接层可安全重试的错误（TLS 握手前失败 = 请求字节未到达服务器，重发无副作用）。 */
const RETRYABLE_CONNECT_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'EPIPE',
  'ENETUNREACH', 'EHOSTUNREACH', 'ENOTFOUND',
])

function isRetryableConnectError(error) {
  if (error === null || typeof error !== 'object') return false
  if (typeof error.code === 'string' && RETRYABLE_CONNECT_CODES.has(error.code)) return true
  return /disconnected before secure TLS|socket disconnected|CONNECT timed out|CONNECT failed/i.test(error.message ?? '')
}

/** 单次 https 请求（经 CONNECT 隧道），返回 fetch 兼容的响应对象。 */
function oneRequest(target, method, headersInit, body, signal, proxyUrl, attempt = 0) {
  return new Promise((resolve, reject) => {
    const requestHeaders = new Headers(headersInit)
    // https.request 不识别 Headers 实例（实测 content-type 会丢，OpenAI 会把
    // form body 当 JSON 解析返回 400 invalid_json）——统一转普通对象。
    let payload
    if (body !== undefined && body !== null) {
      payload = typeof body === 'string' ? body : body instanceof URLSearchParams ? body.toString() : body
      if (
        !requestHeaders.has('content-length')
        && (typeof payload === 'string' || payload instanceof Uint8Array || payload instanceof ArrayBuffer)
      ) {
        requestHeaders.set('content-length', Buffer.byteLength(payload))
      }
    }
    const headers = {}
    for (const [name, value] of requestHeaders.entries()) headers[name] = value
    let responseReceived = false
    const req = https.request(target, { method, headers, agent: getAgent(proxyUrl) }, (res) => {
      responseReceived = true
      const responseHeaders = new Headers()
      for (const [name, value] of Object.entries(res.headers)) {
        if (value === undefined) continue
        if (Array.isArray(value)) {
          for (const item of value) responseHeaders.append(name, item)
        } else {
          responseHeaders.append(name, String(value))
        }
      }
      const stream = Readable.toWeb(res)
      resolve({
        status: res.statusCode ?? 0,
        ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
        type: 'basic',
        headers: responseHeaders,
        body: stream,
        async text() { return collect(stream, 'text') },
        async json() { return JSON.parse(await collect(stream, 'text')) },
        async arrayBuffer() { return collect(stream, 'buffer') },
      })
    })
    req.on('error', (error) => {
      // 响应未开始且连接层失败（含 TLS 握手前断开）→ 安全重试，最多 2 次
      if (!responseReceived && !signal?.aborted && attempt < 2 && isRetryableConnectError(error)) {
        const timer = setTimeout(() => {
          oneRequest(target, method, headersInit, body, signal, proxyUrl, attempt + 1).then(resolve, reject)
        }, 200 * (attempt + 1))
        if (signal?.aborted) {
          clearTimeout(timer)
          reject(error)
        }
        return
      }
      reject(error)
    })
    if (signal !== undefined && signal !== null) {
      const abort = () => req.destroy(signal.reason instanceof Error ? signal.reason : new Error('This operation was aborted'))
      if (signal.aborted) {
        abort()
        return
      }
      signal.addEventListener('abort', abort, { once: true })
    }
    if (payload !== undefined && payload !== null) {
      req.write(payload)
    }
    req.end()
  })
}

/** OpenAI/Codex 域代理出口；其他主机和未配置代理时原样使用 Node fetch。 */
export async function openaiFetch(input, init = {}, proxyUrl) {
  if (!proxyUrl) return originalFetch(input, init)
  let url
  try {
    url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(String(input))
  } catch {
    return originalFetch(input, init)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return originalFetch(input, init)
  if (!isOpenAITarget(url)) return originalFetch(input, init)
  return proxyRequest(url, init, proxyUrl)
}

async function proxyRequest(url, init, proxyUrl) {
  let { method = 'GET', headers, body, signal, redirect = 'follow' } = init
  let target = url
  for (let hop = 0; hop < 6; hop++) {
    const response = await oneRequest(target, method, headers, body, signal, proxyUrl)
    const status = response.status
    if (status < 300 || status >= 400) return response
    if (redirect === 'error') throw new TypeError('fetch failed')
    if (redirect === 'manual') {
      try { await response.body?.cancel() } catch { /* ignore */ }
      return opaqueRedirect()
    }
    const location = response.headers.get('location')
    try { await response.body?.cancel() } catch { /* ignore */ }
    if (location === null || location === undefined) return response
    target = new URL(location, target)
    if (method !== 'GET' && method !== 'HEAD') {
      method = 'GET'
      body = undefined
      headers = undefined
    }
  }
  throw new TypeError('fetch failed (too many redirects)')
}

/**
 * 全局 fetch 补丁：仅当代理激活时，把 OpenAI 域名的 https 请求改走隧道，
 * 其余请求原样转交原生 fetch。用于 llm-pi-ai 的 openai-codex SSE 传输
 * （pi-ai 无代理配置项）。返回恢复函数。
 */
export function installFetchProxy(proxyUrl) {
  const original = originalFetch
  const wrapped = (input, init) => {
    if (!proxyUrl) return original(input, init)
    let url
    try {
      url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(String(input))
    } catch {
      return original(input, init)
    }
    if (url.protocol === 'https:' && isOpenAITarget(url)) return proxyRequest(url, init ?? {}, proxyUrl)
    return original(input, init)
  }
  globalThis.fetch = wrapped
  return () => {
    if (globalThis.fetch === wrapped) globalThis.fetch = original
  }
}

/* ═══════════════════════ Fast mode：service_tier 注入补丁（2026-09-22） ═══════════════════════ */

/**
 * 官方 codex 对话端点（llm-pi-ai 的 openai-codex provider，transport: sse）。
 * 插件自有的 `/backend-api/codex/chat/completions` 恒 404（已退役），不再属于目标。
 */
const CODEX_RESPONSES_HOST = 'chatgpt.com'
const CODEX_RESPONSES_PATH = '/backend-api/codex/responses'

/** 为什么必须打全局补丁（而不是改插件代码）：对话请求由官方 provider 发出，插件没有调用点。
 *  对话请求由**官方 llm-pi-ai** 发出，插件无法在调用点传参；Codex Supplement 不注册聊天适配器，
 *  而官方 dsh-llm-pi-ai 目前没有把 `serviceTier` 透到 provider 的入口。
 *  官方一旦支持，删除本段 + index.mjs 里的 installCodexServiceTierInjector 调用即可（单行回退）。 */

/** 目标 URL 判定：仅 chatgpt.com 的 codex responses 端点。 */
function isCodexResponsesUrl(url) {
  if (url.protocol !== 'https:') return false
  if (url.hostname !== CODEX_RESPONSES_HOST) return false
  const path = url.pathname.replace(/\/+$/, '')
  return path === CODEX_RESPONSES_PATH
}

/** 拿到 pi-ai 用的同一个 node:zlib zstd API（bun/node 专用；浏览器无 → null）。 */
function loadNodeZlib() {
  if (typeof process === 'undefined' || !(process.versions?.node || process.versions?.bun)) return null
  try {
    return process.getBuiltinModule?.('node:zlib') ?? null
  } catch {
    return null
  }
}

/** 任意 BufferSource → Uint8Array（不改原对象）。 */
function toBytes(value) {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  return null
}

/** 按 content-encoding 解出请求体文本；无法处理（流式/未知编码/zstd 失败）→ null（fail-open）。 */
function decodeBodyText(bytes, contentEncoding) {
  const encoding = typeof contentEncoding === 'string' ? contentEncoding.trim().toLowerCase() : ''
  if (encoding === '' || encoding === 'identity') return new TextDecoder().decode(bytes)
  if (encoding !== 'zstd') return null
  const zlib = loadNodeZlib()
  if (!zlib || typeof zlib.zstdDecompressSync !== 'function') return null
  try {
    return new TextDecoder().decode(toBytes(zlib.zstdDecompressSync(bytes)) ?? new Uint8Array())
  } catch {
    return null
  }
}

/** 文本 → 请求体字节（保持原 content-encoding；zstd 再压缩不可用 → null = 放弃注入）。 */
function encodeBodyText(text, contentEncoding) {
  const encoding = typeof contentEncoding === 'string' ? contentEncoding.trim().toLowerCase() : ''
  if (encoding === 'zstd') {
    const zlib = loadNodeZlib()
    if (!zlib || typeof zlib.zstdCompressSync !== 'function') return null
    try {
      return toBytes(zlib.zstdCompressSync(text))
    } catch {
      return null
    }
  }
  return new TextEncoder().encode(text)
}

/** 大小写不敏感地取 header（Headers / 普通对象 / 数组三种形态）。 */
function readHeader(headers, name) {
  if (!headers) return undefined
  if (typeof headers.get === 'function') {
    const value = headers.get(name)
    return value === null ? undefined : value
  }
  const wanted = name.toLowerCase()
  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (Array.isArray(entry) && String(entry[0]).toLowerCase() === wanted) return entry[1]
    }
    return undefined
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return typeof value === 'string' ? value : undefined
  }
  return undefined
}

/** 大小写不敏感地删 header（就地删；Headers 形态用 delete）。 */
function removeHeader(headers, name) {
  if (!headers) return
  if (typeof headers.delete === 'function') {
    headers.delete(name)
    return
  }
  const wanted = name.toLowerCase()
  if (Array.isArray(headers)) {
    for (let index = headers.length - 1; index >= 0; index -= 1) {
      const entry = headers[index]
      if (Array.isArray(entry) && String(entry[0]).toLowerCase() === wanted) headers.splice(index, 1)
    }
    return
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) delete headers[key]
  }
}

/**
 * 在**不改动原始 init 对象**的前提下，返回带 `service_tier: 'priority'` 的 { url, init }。
 *
 * 判定（全部 fail-open，宁可不加速也不改坏请求）：仅 POST + 目标端点 + body 是
 * 可解析的 JSON（或 zstd 压缩后的 JSON）+ `service_tier` 尚未是 priority + body.model
 * 命中 Fast mode。任一步不确定 → null。
 * @returns {{url:URL, init:object, model:string}|null} null = 不注入（fail-open）
 */
function codexServiceTierTarget(url, init, isFastMode) {
  if (typeof init.method !== 'string' || init.method.toUpperCase() !== 'POST') return null
  if (!isCodexResponsesUrl(url)) return null
  const bytes = toBytes(init.body)
  if (bytes === null) return null
  const contentEncoding = readHeader(init.headers, 'content-encoding')
  const text = decodeBodyText(bytes, contentEncoding)
  if (text === null || text.length === 0) return null
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null
  if (body.service_tier === 'priority') return null
  const model = typeof body.model === 'string' ? body.model : ''
  if (isFastMode(model) !== true) return null
  const encoded = encodeBodyText(JSON.stringify({ ...body, service_tier: 'priority' }), contentEncoding)
  if (encoded === null) return null
  const headers = new Headers(init.headers ?? undefined)
  // 长度由 fetch 自行计算；显式长度已失效，删掉避免与服务端校验冲突。
  removeHeader(headers, 'content-length')
  return { init: { ...init, body: encoded, headers }, model }
}

/**
 * 全局 fetch 补丁：官方 codex 对话请求命中 Fast mode 时注入 `service_tier: 'priority'`。
 *
 * 现状（2026-09-22 实测）：旧实现只在**插件自有**路由的请求体里注入，改走官方
 * llm-pi-ai 的 `openai-codex` 路由后该注入点失效，故改为在 fetch 出口打补丁。
 *
 * 行为契约（全部 fail-open）：
 *   - 只认 **POST** 到 `https://chatgpt.com/backend-api/codex/responses`
 *   - `isFastMode(modelId)` 为真才动手（model 取自请求体，与 host 侧 Fast mode 注册表同源）
 *   - 已经是 `service_tier: 'priority'` → 原样放行
 *   - 请求体是流（ReadableStream）/未知 content-encoding / 非 JSON / zstd 解压或再压缩失败
 *     / body.model 不是字符串 / headers 形态不认识 → 原样放行（绝不改坏对话请求）
 *   - 绝不改动调用方的 init 对象（复制后再改）
 *   - **单实例**：同一时刻只允许一层注入器；重复安装（含不同谓词）会先卸掉上一层再装新的，
 *     避免层层套娃；同一 `isFastMode` 重复安装返回同一 disposer。
 *   - 返回的 disposer 可安全多次调用，且只在 fetch 仍是自己那一层时才恢复
 *     （兼容 installFetchProxy 等其它包装）
 *
 * @param {() => ((modelId: string) => boolean) | ((modelId: string) => boolean)} isFastMode
 *   谓词或返回谓词的工厂（工厂形态避免安装时依赖尚未装载的注册表）
 * @param {{logger?: object, enabled?: boolean}} [options]
 * @returns {() => void} 卸载函数
 */
/** 已安装的 (isFastMode → disposer) 表：同一谓词重复安装即幂等（WeakMap 不阻止回收）。 */
const serviceTierInstallations = new WeakMap()

export function installCodexServiceTierInjector(isFastMode, { logger = null, enabled = true } = {}) {
  if (typeof isFastMode !== 'function' || enabled !== true) return () => {}
  const existing = serviceTierInstallations.get(isFastMode)
  if (existing !== undefined && globalThis.__dshOauthServiceTierDispose === existing) return existing
  // 已有旧包装（换谓词重装/重复安装的极端情形）：先卸载，避免层层套娃
  try { globalThis.__dshOauthServiceTierDispose?.() } catch { /* 忽略 */ }

  const predicate = () => {
    try {
      const value = isFastMode()
      return typeof value === 'function' ? value : () => false
    } catch {
      return () => false
    }
  }
  const previous = globalThis.fetch
  const wrapped = (input, init) => {
    try {
      if (init === undefined || init === null || typeof init !== 'object') return previous(input, init)
      let url
      if (input instanceof URL) url = input
      else if (typeof input === 'string') url = new URL(input)
      else if (input && typeof input === 'object' && typeof input.url === 'string') url = new URL(input.url)
      else return previous(input, init)
      const target = codexServiceTierTarget(url, init, predicate())
      if (target === null) return previous(input, init)
      logger?.info?.('dsh-codex-supplement: Fast mode 已为 %s 注入 service_tier=priority（官方 openai-codex 路由）', target.model)
      return previous(input, target.init)
    } catch (error) {
      // 注入失败绝不改坏请求：退回原样调用
      logger?.warn?.('dsh-codex-supplement: service_tier 注入失败（原样请求）: %s', error instanceof Error ? error.message : String(error))
      return previous(input, init)
    }
  }
  globalThis.fetch = wrapped
  const dispose = () => {
    if (serviceTierInstallations.get(isFastMode) === dispose) serviceTierInstallations.delete(isFastMode)
    if (globalThis.fetch === wrapped) globalThis.fetch = previous
    if (globalThis.__dshOauthServiceTierDispose === dispose) {
      globalThis.__dshOauthServiceTierDispose = null
      globalThis.__dshOauthServiceTierPredicate = null
    }
  }
  globalThis.__dshOauthServiceTierDispose = dispose
  globalThis.__dshOauthServiceTierPredicate = predicate
  serviceTierInstallations.set(isFastMode, dispose)
  return dispose
}

export const codexServiceTierConstants = Object.freeze({
  host: CODEX_RESPONSES_HOST,
  path: CODEX_RESPONSES_PATH,
  serviceTier: 'priority',
})
