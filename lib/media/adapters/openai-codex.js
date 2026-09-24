/**
 * openai-codex（ChatGPT/GPT 订阅）OAuth 图片生成 adapter。
 *
 * 参考开放源码：openhanako `_research_src/openhanako_img_adapters/openai-codex.ts`
 * （OAuth 订阅生图，走 OpenAI Responses API 的 `image_generation` 工具。
 *  protocolId = `openai-codex-responses-image`）——**照抄该 adapter 的协议形态**：
 * `{base}/codex/responses` 端点、SSE 流式响应解析、`image_generation_call.result` /
 * `b64_json` 收集、`chatgpt-account-id` + `OpenAI-Beta` + `originator` 头。
 *
 * ═══ 两个 `model` 不是一回事（曾经混用，2026-09-24 拆开）═══
 * - Responses **顶层** `model` 是承载 `image_generation` 工具的 Codex 对话模型
 *   （carrier；本模块的 `carrierModel`）。
 * - hosted `image_generation` **工具内**的 `model` 是图像引擎档位
 *   （例如 `gpt-image-2.5-flare` / `gpt-image-2.5-sunburst`；本模块的 `imageModel`）。
 * 旧实现只支持前者，并把"服务端管理引擎"误读成"不能声明引擎"。官方契约
 * （openai-python 的 `ImageGeneration` tool 类型，见 `image-models.mjs`）里工具
 * 确有 `model` 字段，故这里把后者也如实透传。
 *
 * Codex Supplement adaptation boundary：
 * - 凭据不再经 `provider:credentials`，而是**消费 `openaiCodexAuth` 服务**：
 *   `credential(signal)` → `{ access, accountId, ... }`；`http(url, init)` → 走代理出口。
 *   - `access`    → `Authorization: Bearer <access>`
 *   - `accountId` → `chatgpt-account-id` 头
 * - 本模块**只做协议**（请求构造 / 响应解析），不持有 token、不存文件；保存交给上层工具。
 *
 * 已知边界：
 * - 订阅端点（`chatgpt.com/backend-api/codex/responses`）没有公开 schema，
 *   官方 SDK 的 tool 契约来自 API-Key 路径。**是否接受工具内 `model` 只能实测**；
 *   被拒绝时本模块原样抛出状态码与报文，**绝不静默换模型**——静默回退会让用户
 *   以为自己选的档位生效了。
 * - `originator` 头 openhanako 用 `'pi'`；dsh-openai-auth 的 OAuth 流程用
 *   `'deepseek-harness'`。此处保留 openhanako 默认 `'pi'` 并做成可配项，跨端差异待实测确认。
 * @module dsh-codex-supplement/adapters/openai-codex
 */

import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_IMAGE_MODEL, IMAGE_MODEL_CHOICES } from '../image-models.mjs'

/** 能力位提供的 adapter id（与 openhanako 对齐）。 */
export const OPENAI_CODEX_ADAPTER_ID = 'openai-codex-oauth'
/** 执行协议 id（custom 供应商可复用）。 */
export const OPENAI_CODEX_RESPONSES_IMAGE_PROTOCOL = 'openai-codex-responses-image'
/** 展示名。 */
export const OPENAI_CODEX_DISPLAY_NAME = 'OpenAI GPT Image（ChatGPT 订阅 · OAuth）'
/** 默认 Codex 后端 base_url（ChatGPT 订阅网关）。 */
export const DEFAULT_CODEX_BASE_URL = 'https://chatgpt.com/backend-api'
/** Codex Responses carrier fallback. Last known-good value before c9f2ee5. */
export const DEFAULT_RESPONSES_MODEL = 'gpt-5.5'

/** 输出格式 → MIME。 */
const FORMAT_TO_MIME = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/** 官方 `image_generation` 支持的质量档（2.5 两档另支持 xhigh/max）。 */
export const IMAGE_QUALITIES = Object.freeze(['auto', 'low', 'medium', 'high', 'xhigh', 'max'])
/**
 * The default quality is global while model ceilings differ. Preserve explicit
 * user choice: do not silently downgrade or locally block unverified combinations.
 * The current support boundary is documented in SPEC.md and docs/image-generation.md.
 */
export const DEFAULT_IMAGE_QUALITY = 'auto'
/** 官方支持的标准尺寸；2 系与 2.5 系另接受任意 `WIDTHxHEIGHT`。 */
export const IMAGE_SIZES = Object.freeze(['auto', '1024x1024', '1536x1024', '1024x1536'])
/** 官方背景档。 */
export const IMAGE_BACKGROUNDS = Object.freeze(['auto', 'transparent', 'opaque'])
/** 官方动作档：generate = 文生图，edit = 图生图，auto = 由服务端判断。 */
export const IMAGE_ACTIONS = Object.freeze(['auto', 'generate', 'edit'])

/**
 * 归一化 Codex Responses 端点。
 * @param {string} [baseUrl]
 * @returns {string}
 */
function resolveCodexResponsesUrl(baseUrl) {
  const raw = (baseUrl || DEFAULT_CODEX_BASE_URL).replace(/\/+$/, '')
  if (raw.endsWith('/codex/responses')) return raw
  if (raw.endsWith('/codex')) return `${raw}/responses`
  return `${raw}/codex/responses`
}

/** 本地图片文件 → data URL（仅在确实传了本地绝对路径的图生图使用）。 */
function localImageToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath)
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext] || 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

/** 规范化输入图片：本地绝对路径且存在 → data URL；其余原样透传（http URL / 已编码 data URL）。 */
function normalizeImages(image) {
  if (!image) return []
  const images = Array.isArray(image) ? image : [image]
  return images
    .map((img) => {
      if (typeof img === 'string' && path.isAbsolute(img) && fs.existsSync(img)) {
        return localImageToDataUrl(img)
      }
      return img
    })
    .filter(Boolean)
}

/**
 * 从 Responses / SSE 输出里收集图片结果（base64 字符串）。
 * 递归遍历 `output`（或 `response.output`、`data`），收集：
 *   - `{ type: 'image_generation_call', result: '<base64>' }`
 *   - 任何 `{ b64_json: '<base64>' }`
 */
function collectImageResults(data) {
  const results = []
  const seen = new Set()
  const visited = new WeakSet()
  const pushResult = (value) => {
    if (seen.has(value)) return
    seen.add(value)
    results.push(value)
  }
  const visit = (value) => {
    if (!value) return
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (typeof value !== 'object') return
    if (visited.has(value)) return
    visited.add(value)
    if (value.type === 'image_generation_call' && typeof value.result === 'string') {
      pushResult(value.result)
      return
    }
    if (typeof value.b64_json === 'string') {
      pushResult(value.b64_json)
      return
    }
    for (const child of Object.values(value)) visit(child)
  }
  visit(data?.output || data?.response?.output || data)
  return results
}

/** 读取响应体：优先流式（SSE），否则 json/text。 */
async function readResponsePayload(res) {
  if (res.body && typeof res.body.getReader === 'function') {
    return readStreamingPayload(res.body)
  }
  if (typeof res.json === 'function') return res.json()
  if (typeof res.text === 'function') {
    const text = await res.text()
    return text ? JSON.parse(text) : {}
  }
  return {}
}

/** 解析 SSE 事件流，返回 `{ output: events[] }`。 */
async function readStreamingPayload(body) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const events = []
  let buffer = ''

  const consumeBlock = (block) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()
    if (!data || data === '[DONE]') return
    try {
      events.push(JSON.parse(data))
    } catch {
      // 忽略无法解析的行
    }
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: !done })
    let sep
    while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(buffer[sep] === '\r' ? sep + 4 : sep + 2)
      consumeBlock(block)
    }
    if (done) break
  }
  buffer += decoder.decode()
  if (buffer.trim()) consumeBlock(buffer)

  return { output: events }
}

/**
 * 从响应里取出可读错误信息（错误体可能不是 JSON，也可能是 SSE 片段）。
 * @param {Response} res
 * @returns {Promise<string>}
 */
async function readErrorDetail(res) {
  try {
    const err = await res.json()
    if (typeof err?.error?.message === 'string') return err.error.message
    if (typeof err?.detail === 'string') return err.detail
    if (typeof err?.message === 'string') return err.message
  } catch {
    // 错误体不可读时状态码为准
  }
  return ''
}

/**
 * 提交一次 codex OAuth 图片生成请求（纯协议，无副作用）。
 * @param {object} opts
 * @param {string} opts.prompt 图片提示词。
 * @param {{access:string, accountId:string}} opts.credential
 *   OAuth 凭据（access=订阅 token，accountId=ChatGPT 账号 id）。
 * @param {(url:string, init?:object)=>Promise<Response>} opts.http
 *   网络出口（openaiCodexAuth.http，走代理）。
 * @param {AbortSignal} [opts.signal] 中止信号（透传给 http）。
 * @param {string} [opts.carrierModel] Responses 顶层 carrier（Codex 对话模型）。
 * @param {string} [opts.imageModel] `image_generation.model`（图像引擎档位）。
 * @param {string} [opts.action] `generate` | `edit` | `auto`。
 * @param {string} [opts.outputFormat] 输出格式 png | jpeg | webp（默认 png）。
 * @param {string} [opts.size] 尺寸（`1024x1024`、任意 `WIDTHxHEIGHT`、或 `auto`）。
 * @param {string} [opts.quality] 质量（low|medium|high|xhigh|max|auto）。
 * @param {string} [opts.background] 背景（auto|transparent|opaque）。
 * @param {number} [opts.outputCompression] 输出压缩（0-100）。
 * @param {string} [opts.moderation] 审核档（auto|low）。
 * @param {string} [opts.inputFidelity] 输入保真（high|low）。
 * @param {number} [opts.partialImages] 流式部分图数量（0-3）。
 * @param {object} [opts.inputImageMask] 局部重绘遮罩 `{ file_id?, image_url? }`。
 * @param {string} [opts.baseUrl] 后端 base_url。
 * @param {string} [opts.originator] 请求来源标识（默认 'pi'，见文件头注）。
 * @param {string|string[]} [opts.image] 可选输入图片（data URL / http URL / 本地绝对路径，用于图生图）。
 * @returns {Promise<{images:Array<{data:string, mimeType:string}>, carrierModel:string, imageModel?:string}>}
 *   图片为 base64 字符串 + MIME；保存交给上层。
 */
export async function openaiCodexResponsesImageSubmit(opts) {
  const {
    prompt,
    credential,
    http,
    signal,
    carrierModel,
    imageModel,
    action,
    outputFormat,
    size,
    quality,
    background,
    outputCompression,
    moderation,
    inputFidelity,
    partialImages,
    inputImageMask,
    baseUrl,
    originator,
    image,
  } = opts || {}
  if (!credential?.access) throw new Error('OpenAI Codex 未登录（缺少订阅凭据）')
  if (!credential?.accountId) throw new Error('OpenAI Codex 未登录（缺少 ChatGPT 账号 id），请重新登录')

  const format = outputFormat || 'png'
  const request = http || globalThis.fetch

  // hosted image_generation 工具声明：只带上确实传了的字段，避免用默认值覆盖服务端默认。
  const tool = { type: 'image_generation', output_format: format }
  if (imageModel) tool.model = imageModel
  if (action) tool.action = action
  if (size) tool.size = size
  if (quality) tool.quality = quality
  if (background) tool.background = background
  if (outputCompression !== undefined) tool.output_compression = outputCompression
  if (moderation) tool.moderation = moderation
  if (inputFidelity) tool.input_fidelity = inputFidelity
  if (partialImages !== undefined) tool.partial_images = partialImages
  if (inputImageMask) tool.input_image_mask = inputImageMask

  const content = [{ type: 'input_text', text: prompt }]
  for (const imageUrl of normalizeImages(image)) {
    content.push({ type: 'input_image', image_url: imageUrl })
  }

  const body = {
    model: carrierModel || DEFAULT_RESPONSES_MODEL,
    store: false,
    stream: true,
    instructions: 'Generate or edit the requested image and return the image result.',
    input: [{ role: 'user', content }],
    tools: [tool],
    tool_choice: 'auto',
    parallel_tool_calls: false,
  }

  const res = await request(resolveCodexResponsesUrl(baseUrl), {
    method: 'POST',
    ...(signal === undefined ? {} : { signal }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credential.access}`,
      'chatgpt-account-id': credential.accountId,
      'OpenAI-Beta': 'responses=experimental',
      'originator': originator || 'pi',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await readErrorDetail(res)
    const base = `Codex image request failed: ${res.status}`
    let message = detail ? `${base}: ${detail}` : base
    if (imageModel !== undefined && imageModel !== '') {
      message += ` [image model: ${imageModel}]`
      if (res.status === 400 || res.status === 404 || res.status === 422) {
        message += ' — the Codex subscription endpoint may not accept this image model id;'
          + ' pick another enabled model or check the id.'
      }
    }
    throw new Error(message)
  }

  const data = await readResponsePayload(res)
  const images = collectImageResults(data)
  if (images.length === 0) throw new Error('API 未返回图片')

  const mimeType = FORMAT_TO_MIME[format] || 'image/png'
  return {
    images: images.map((item) => ({ data: item, mimeType })),
    carrierModel: body.model,
    ...(imageModel ? { imageModel } : {}),
  }
}

/**
 * Codex OAuth adapter 元数据（供设置页与能力路由做能力展示用）。
 *
 * 与旧版的区别：`capabilities.models` **不再写死为空数组**——官方工具确有 `model`
 * 字段，这里如实公开可选目录；`defaultImageModel` 才是图像引擎的默认档，
 * `defaultResponsesModel` 是 carrier 的兜底（两者语义不同，不要混用）。
 */
export const openaiCodexResponsesImageAdapter = Object.freeze({
  id: OPENAI_CODEX_ADAPTER_ID,
  protocolId: OPENAI_CODEX_RESPONSES_IMAGE_PROTOCOL,
  name: OPENAI_CODEX_DISPLAY_NAME,
  types: Object.freeze(['image']),
  auth: 'oauth',
  defaultResponsesModel: DEFAULT_RESPONSES_MODEL,
  defaultImageModel: DEFAULT_IMAGE_MODEL,
  /** @deprecated 用 `defaultResponsesModel`；保留字段名以兼容既有消费方。 */
  defaultModel: DEFAULT_RESPONSES_MODEL,
  modelRole: 'codex-carrier',
  capabilities: Object.freeze({
    protocols: Object.freeze([OPENAI_CODEX_RESPONSES_IMAGE_PROTOCOL]),
    sizes: IMAGE_SIZES,
    formats: Object.freeze(['png', 'jpeg', 'webp']),
    qualities: IMAGE_QUALITIES,
    backgrounds: IMAGE_BACKGROUNDS,
    actions: IMAGE_ACTIONS,
    inputs: Object.freeze(['text', 'image']),
    outputs: Object.freeze(['image']),
    supportsEdit: true,
    /** 官方可选图像模型目录（不在其中的 id 也可自填，端点未公开枚举）。 */
    models: IMAGE_MODEL_CHOICES,
  }),
})

/**
 * 可选的登录状态查询（供宿主/设置页用）：只读凭据是否存在 + 账号 id，
 * 不触发用量/模型查询。
 * @param {{credential:(signal?:AbortSignal)=>Promise<object|undefined>}} auth openaiCodexAuth 服务
 * @returns {Promise<{loggedIn:boolean, accountId?:string, error?:string}>}
 */
export async function checkOAuthStatus(auth) {
  try {
    const credential = await auth?.credential?.()
    return {
      loggedIn: credential !== undefined,
      ...(credential?.accountId ? { accountId: credential.accountId } : {}),
    }
  } catch (error) {
    return { loggedIn: false, error: error instanceof Error ? error.message : String(error) }
  }
}
