/**
 * Codex 订阅生图的**图像模型目录**（工具 `model` 参数的可选值来源）。
 *
 * 官方依据（2026-11-09 取证的原始出处）：
 * 1. openai-python 的 Responses `ImageGeneration` tool 类型
 *    （`src/openai/types/responses/tool_param.py`）声明 hosted `image_generation`
 *    工具确有 `model` 字段，union 含 GPT Image 2.6 / 2.5 / 2 / 1.5 / 1-mini 与
 *    `chatgpt-image-latest`；`gpt-image-1` 已于 2026-10-23 下线。
 * 2. 同一类型声明 `complexity`（low | medium | high）、`output_format`
 *    （png | jpeg | webp | gif | svg）、`frame_count` / `frame_duration_ms`、
 *    `output_compression`、`moderation`、`input_fidelity`、`partial_images`、
 *    `input_image_mask`。2.6 起把“场景规划”与“像素渲染”拆成 complexity / quality
 *    两个参数；GIF 与 SVG 是 2.6 才支持的输出。
 * 3. 2.6 发布：GPT-Image-2.6 Flare（速度/排版）与 Sunburst（细节/一致性），
 *    2026-11-04 上线；2.5 仍是 Flare / Sunburst 两档，2026-09-08 快照可用。
 *
 * ⚠️ 明确边界（不要读成承诺）：
 * - 本目录说明“工具允许让模型参数选什么”，**不声称** ChatGPT/Codex OAuth 订阅端点
 *   （`chatgpt.com/backend-api/codex/*`）一定接受这些能力。2026-11-06 的独立取证显示
 *   OAuth 生图端点会**静默忽略** `model` / `complexity` / `size` / `output_format=svg`，
 *   并**拒绝** `output_format=gif`（400 GIF output is not enabled for this request）。
 *   配置页的“试生图”会原样显示上游状态与回传的实际字段，不替服务端圆场。
 * - 被拒绝时 adapter 原样抛出状态码与报文，**不静默回退**；未知 id 仍允许自填，
 *   但能力位（complexity / gif / svg）只对目录内模型给出提示。
 *
 * @module dsh-codex-supplement/image-models
 */

/** @typedef {'fast' | 'quality' | 'legacy'} ImageModelTier */
/** @typedef {{complexity:boolean, svg:boolean, gif:boolean, maxQuality:'high'|'xhigh'|'max'}} ImageModelCapabilities */

/**
 * 一个可选图像模型。
 * @typedef {object} ImageModelChoice
 * @property {string} id
 * @property {string} label
 * @property {ImageModelTier} tier
 * @property {string} note
 * @property {string} [released] 该 id 的发布/快照日期。
 * @property {boolean} [deprecated] 已下线，仅为兼容旧配置保留。
 * @property {ImageModelCapabilities} capabilities
 */

/** @type {ImageModelChoice[]} */
const CHOICES = [
  {
    id: 'gpt-image-2.6-flare',
    label: 'GPT Image 2.6 Flare',
    tier: 'fast',
    released: '2026-11-04',
    note: '2.6 快速档：低质量档最快约 6 秒，排版与日常生成优先。',
    capabilities: { complexity: true, svg: true, gif: true, maxQuality: 'high' },
  },
  {
    id: 'gpt-image-2.6-sunburst',
    label: 'GPT Image 2.6 Sunburst',
    tier: 'quality',
    released: '2026-11-04',
    note: '2.6 高质量档：细节、文字与多轮编辑一致性最好。',
    capabilities: { complexity: true, svg: true, gif: true, maxQuality: 'high' },
  },
  {
    id: 'gpt-image-2.5-flare',
    label: 'GPT Image 2.5 Flare',
    tier: 'fast',
    released: '2026-09-08',
    note: '2.5 快速档：低延迟；支持 xhigh / max 质量档。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'max' },
  },
  {
    id: 'gpt-image-2.5-sunburst',
    label: 'GPT Image 2.5 Sunburst',
    tier: 'quality',
    released: '2026-09-08',
    note: '2.5 高质量档：编辑精度优先；支持 xhigh / max 质量档。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'max' },
  },
  {
    id: 'gpt-image-2.5-flare-2026-09-08',
    label: 'GPT Image 2.5 Flare (2026-09-08)',
    tier: 'fast',
    released: '2026-09-08',
    note: 'Flare 的固定快照。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'max' },
  },
  {
    id: 'gpt-image-2.5-sunburst-2026-09-08',
    label: 'GPT Image 2.5 Sunburst (2026-09-08)',
    tier: 'quality',
    released: '2026-09-08',
    note: 'Sunburst 的固定快照。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'max' },
  },
  {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    tier: 'legacy',
    released: '2026-04-21',
    note: '前代；支持透明背景（预览）。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'high' },
  },
  {
    id: 'gpt-image-2-2026-04-21',
    label: 'GPT Image 2 (2026-04-21)',
    tier: 'legacy',
    released: '2026-04-21',
    note: 'GPT Image 2 的固定快照。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'high' },
  },
  {
    id: 'gpt-image-1.5',
    label: 'GPT Image 1.5',
    tier: 'legacy',
    released: '2025-12-17',
    note: '前代。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'high' },
  },
  {
    id: 'gpt-image-1-mini',
    label: 'GPT Image 1 Mini',
    tier: 'legacy',
    note: '低成本档；细节能力弱于 2 系。',
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'high' },
  },
  {
    id: 'chatgpt-image-latest',
    label: 'ChatGPT Image (latest)',
    tier: 'legacy',
    note: '跟随最新；具体能力随服务端变化。',
    capabilities: { complexity: true, svg: true, gif: true, maxQuality: 'high' },
  },
  {
    id: 'gpt-image-1',
    label: 'GPT Image 1 (已下线)',
    tier: 'legacy',
    note: '2026-10-23 已下线；仅为兼容旧配置保留，请改用 2.6 / 2.5。',
    deprecated: true,
    capabilities: { complexity: false, svg: false, gif: false, maxQuality: 'high' },
  },
]

/** 全部可选图像模型（冻结，供配置、工具与路由共用）。 */
export const IMAGE_MODEL_CHOICES = Object.freeze(CHOICES.map((choice) => Object.freeze({
  ...choice,
  capabilities: Object.freeze(choice.capabilities),
})))

/** 全部已知图像模型 id。 */
export const IMAGE_MODEL_IDS = Object.freeze(IMAGE_MODEL_CHOICES.map((choice) => choice.id))

/**
 * 出厂默认图像模型。
 * 取 2.6 快速档：默认应当是“最新且最不容易让人等太久”的那一档，
 * 需要精度时由调用方显式指定 Sunburst。
 */
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2.6-flare'

/** 出厂勾选（工具默认暴露 2.6 的快速版 + 高质量版）。 */
export const DEFAULT_IMAGE_MODELS = Object.freeze(['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'])

/** 模型 id 形状校验：官方 id 允许字母、数字、点、连字符。 */
const IMAGE_MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/

/**
 * 是否是形状合法的模型 id（**不**要求在已知目录内——订阅端点未公开枚举，
 * 官方随时可能新增 id，硬拦会把“自填可用”的路堵死）。
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidImageModelId(value) {
  return typeof value === 'string' && IMAGE_MODEL_ID_PATTERN.test(value)
}

/**
 * 该 id 是否在已知目录内。
 * @param {unknown} value
 * @returns {boolean}
 */
export function isKnownImageModel(value) {
  return typeof value === 'string' && IMAGE_MODEL_IDS.includes(value)
}

/**
 * 目录条目（含 label/档位说明）；未知 id 返回 undefined。
 * @param {unknown} value
 * @returns {ImageModelChoice|undefined}
 */
export function imageModelChoice(value) {
  return IMAGE_MODEL_CHOICES.find((choice) => choice.id === value)
}

/**
 * 某个模型 id 的能力位；未知 id 返回保守默认（不支持 2.6 专属输出）。
 * @param {unknown} value
 * @returns {ImageModelCapabilities}
 */
export function imageModelCapabilities(value) {
  return imageModelChoice(value)?.capabilities
    ?? { complexity: false, svg: false, gif: false, maxQuality: 'high' }
}

/** quality 档位由低到高；`auto` 始终可用。 */
const IMAGE_QUALITY_ORDER = Object.freeze(['auto', 'low', 'medium', 'high', 'xhigh', 'max'])

/**
 * 某个模型允许的 quality 档位。2.5 系到 xhigh/max，其余最高 high。
 * @param {unknown} value
 * @returns {string[]}
 */
export function imageModelQualityOptions(value) {
  const max = imageModelCapabilities(value).maxQuality
  const ceiling = IMAGE_QUALITY_ORDER.indexOf(max)
  return IMAGE_QUALITY_ORDER.filter((_, index) => index <= ceiling || index === 0)
}

/**
 * 某个模型允许的 complexity 档位；不支持 2.6 规划时返回空数组。
 * @param {unknown} value
 * @returns {string[]}
 */
export function imageModelComplexityOptions(value) {
  return imageModelCapabilities(value).complexity === true ? ['low', 'medium', 'high'] : []
}

/**
 * 给定勾选清单的合并能力（工具 schema 的选项由它决定）。
 * @param {readonly string[]} [ids]
 * @returns {{complexity:boolean, svg:boolean, gif:boolean, maxQuality:'high'|'xhigh'|'max'}}
 */
export function selectionCapabilities(ids) {
  const list = Array.isArray(ids) && ids.length > 0 ? ids : [...DEFAULT_IMAGE_MODELS]
  const caps = list.map((id) => imageModelCapabilities(id))
  return {
    complexity: caps.some((entry) => entry.complexity === true),
    svg: caps.some((entry) => entry.svg === true),
    gif: caps.some((entry) => entry.gif === true),
    maxQuality: caps.some((entry) => entry.maxQuality === 'max')
      ? 'max'
      : caps.some((entry) => entry.maxQuality === 'xhigh') ? 'xhigh' : 'high',
  }
}

/**
 * 给工具描述用的紧凑清单文本（例如 `gpt-image-2.6-flare（快速档）`）。
 * @param {readonly string[]} [ids] 缺省用官方目录全集。
 * @returns {string}
 */
export function describeImageModels(ids) {
  const list = Array.isArray(ids) && ids.length > 0 ? ids : IMAGE_MODEL_IDS
  return list
    .map((id) => {
      const choice = imageModelChoice(id)
      if (choice === undefined) return id
      const tier = choice.tier === 'fast' ? '快速档' : choice.tier === 'quality' ? '高质量档' : '前代'
      return `${id}（${tier}）`
    })
    .join('、')
}
