/**
 * “试生图”请求解析（纯函数，可离线单测）。
 *
 * 配置页只需要一次最小请求：给定 prompt、模型与少量渲染选项，走与工具完全相同的
 * adapter 出口，把上游状态、耗时和回传字段原样带回来。它**不写工作区、不注册工具**，
 * 也不要求“启用图片生成工具”开关已打开——诊断应当能在启用前做。
 *
 * 与工具执行的区别只在“请求来源”：这里不接受对话模型生成的任意 args，
 * 只接受设置页明确列出的字段，并强制模型必须落在已勾选清单内。
 *
 * @module dsh-codex-supplement/test-request
 */

import { resolveDefaultImageModel, resolveModelProfile } from './model-selection.mjs'

/** 设置页单次测试的最大提示词长度。 */
export const TEST_PROMPT_MAX_LENGTH = 8_000

/** 测试结果回传预览图的最大字节数（超过则只回字节数与媒体类型）。 */
export const TEST_PREVIEW_MAX_BYTES = 3 * 1024 * 1024

const FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'svg'])
const QUALITIES = new Set(['auto', 'low', 'medium', 'high', 'xhigh', 'max'])
const COMPLEXITIES = new Set(['low', 'medium', 'high'])
const BACKGROUNDS = new Set(['auto', 'transparent', 'opaque'])
const ACTIONS = new Set(['auto', 'generate', 'edit'])
const MODERATIONS = new Set(['auto', 'low'])
const FIDELITIES = new Set(['low', 'high'])

const pickEnum = (value, allowed) => typeof value === 'string' && allowed.has(value) ? value : undefined
const pickInt = (value, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : undefined

/** 标准尺寸或受约束的 WIDTHxHEIGHT；非法尺寸直接忽略（不阻断测试）。 */
function pickSize(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === 'auto') return 'auto'
  const match = /^(\d{2,5})x(\d{2,5})$/.exec(trimmed)
  if (match === null) return undefined
  const width = Number(match[1])
  const height = Number(match[2])
  if (width < 256 || height < 256 || width > 3840 || height > 2160) return undefined
  return trimmed
}

/**
 * 解析一次试生图请求。
 * @param {object} input
 * @param {Record<string, unknown>} input.body 设置页提交的 JSON。
 * @param {object} input.config 当前配置快照（`snapshotConfig` 产物）。
 * @param {readonly string[]} input.selectedModels 已勾选模型清单。
 * @returns {{request: object, requested: object, profile: object}}
 * @throws {Error} 提示词为空、模型未启用等可操作错误。
 */
export function resolveTestImageRequest({ body, config, selectedModels }) {
  const input = body !== null && typeof body === 'object' ? body : {}
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
  if (prompt.length === 0) throw new Error('A non-empty prompt is required')
  if (prompt.length > TEST_PROMPT_MAX_LENGTH) {
    throw new Error(`Prompt must be at most ${TEST_PROMPT_MAX_LENGTH} characters`)
  }

  const allowed = Array.isArray(selectedModels) ? selectedModels.filter((id) => typeof id === 'string' && id.length > 0) : []
  if (allowed.length === 0) {
    throw new Error('No image model is enabled: enable at least one model before testing')
  }
  const requestedModel = typeof input.model === 'string' && input.model.length > 0 ? input.model : undefined
  if (requestedModel !== undefined && !allowed.includes(requestedModel)) {
    throw new Error(`Image model "${requestedModel}" is not enabled. Enabled models: ${allowed.join(', ')}`)
  }
  const imageModel = requestedModel ?? resolveDefaultImageModel({
    defaultModel: config?.defaultImageModel,
    selectedModels: allowed,
  })
  const profile = resolveModelProfile({
    model: imageModel,
    defaultsByModel: config?.imageModelDefaults,
  })

  const requestedQuality = pickEnum(input.quality, QUALITIES)
  if (requestedQuality !== undefined && !profile.qualityOptions.includes(requestedQuality)) {
    throw new Error(`Quality "${requestedQuality}" is not supported by ${imageModel}. Supported: ${profile.qualityOptions.join(', ')}.`)
  }
  const quality = requestedQuality ?? profile.quality
  const requestedComplexity = pickEnum(input.complexity, COMPLEXITIES)
  if (requestedComplexity !== undefined && !profile.complexityOptions.includes(requestedComplexity)) {
    throw new Error(`Complexity "${requestedComplexity}" is not supported by ${imageModel}. Supported: ${profile.complexityOptions.join(', ') || 'model default'}.`)
  }
  const complexity = profile.complexityOptions.length > 0
    ? (requestedComplexity ?? profile.complexity)
    : undefined

  const outputFormat = pickEnum(input.output_format, FORMATS) ?? 'png'
  const size = pickSize(input.size)
  const background = pickEnum(input.background, BACKGROUNDS)
  const action = pickEnum(input.action, ACTIONS)
  const outputCompression = pickInt(input.output_compression, 0, 100)
  const moderation = pickEnum(input.moderation, MODERATIONS)
  const inputFidelity = pickEnum(input.input_fidelity, FIDELITIES)
  const partialImages = pickInt(input.partial_images, 0, 3)
  const frameCount = pickInt(input.frames, 1, 120)
  const frameDurationMs = pickInt(input.frame_duration_ms, 20, 10_000)

  const request = {
    prompt,
    imageModel,
    quality,
    outputFormat,
    ...(complexity === undefined ? {} : { complexity }),
    ...(size === undefined ? {} : { size }),
    ...(background === undefined ? {} : { background }),
    ...(action === undefined ? {} : { action }),
    ...(outputCompression === undefined ? {} : { outputCompression }),
    ...(moderation === undefined ? {} : { moderation }),
    ...(inputFidelity === undefined ? {} : { inputFidelity }),
    ...(partialImages === undefined ? {} : { partialImages }),
    ...(frameCount === undefined ? {} : { frameCount }),
    ...(frameDurationMs === undefined ? {} : { frameDurationMs }),
  }

  return {
    request,
    requested: {
      model: imageModel,
      quality,
      ...(complexity === undefined ? {} : { complexity }),
      output_format: outputFormat,
      ...(size === undefined ? {} : { size }),
      ...(background === undefined ? {} : { background }),
    },
    profile,
  }
}

/**
 * 把 adapter 的 base64 图片包成设置页能直接渲染的结果；大图不回传预览。
 * @param {readonly {data:string, mimeType:string}[]} images
 * @returns {{mediaType:string, bytes:number, dataUrl?:string}[]}
 */
export function toPreviewImages(images) {
  return images.map((image) => {
    const bytes = Math.floor((image.data.length * 3) / 4)
    const previewable = bytes <= TEST_PREVIEW_MAX_BYTES
    return {
      mediaType: image.mimeType,
      bytes,
      ...(previewable ? { dataUrl: `data:${image.mimeType};base64,${image.data}` } : {}),
    }
  })
}
