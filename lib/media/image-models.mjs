/**
 * Codex 订阅生图的**图像模型目录**（工具 `model` 参数的可选值来源）。
 *
 * 为什么这个模块存在：原实现把图像引擎锁成单一哨兵值 `codex-managed-image`、
 * 并把 `capabilities.models` 硬编码为空数组，等于对外声称"订阅生图不能选模型"。
 * 官方契约其实**明确有 `model` 字段**，所以这里把可选集合落成数据，供配置勾选、
 * 工具参数校验与能力路由三处共用（单一正源）。
 *
 * 官方依据（2026-09-24 取证的原始出处）：
 * 1. openai-python 的 Responses `ImageGeneration` tool 类型
 *    （`src/openai/types/responses/tool_param.py`，由官方 OpenAPI spec 生成）
 *    声明 hosted `image_generation` 工具确有 `model` 字段，union 取值为
 *    `gpt-image-1` / `gpt-image-1-mini` / `gpt-image-1.5` / `gpt-image-2` /
 *    `gpt-image-2-2026-04-21` / `gpt-image-2.5-flare` / `gpt-image-2.5-flare-2026-09-08` /
 *    `gpt-image-2.5-sunburst` / `gpt-image-2.5-sunburst-2026-09-08` /
 *    `chatgpt-image-latest`，默认 `gpt-image-1`。
 * 2. 同一类型的 `quality` 为 `low|medium|high|xhigh|max|auto`（2.5 两档支持 `xhigh`/`max`）；
 *    `size` 对 2 系与 2.5 系支持任意 `WIDTHxHEIGHT`（宽高均为 16 的倍数、比例 1:3~3:1、
 *    上限 3840x2160），另有 `1024x1024`/`1024x1536`/`1536x1024`/`auto`。
 * 3. 档位定位：官方 image-generation 指南的模型选择段写明
 *    “Choose **Sunburst** for workflows where editing precision matters most, and
 *    **Flare** for fast, high-quality everyday image generation.”
 *    即 Flare = 快速档，Sunburst = 高质量档。
 *
 * ⚠️ 明确边界（不要读成承诺）：本目录说明"工具允许让模型参数选什么"，
 * **不声称** ChatGPT/Codex OAuth 订阅端点（`chatgpt.com/backend-api/codex/responses`）
 * 一定接受这些 id。该端点没有公开 schema，是否接受只能实测；被拒绝时由
 * `adapters/openai-codex.js` 原样抛出状态码与报文，**不静默回退到别的模型**
 * （静默回退会让用户以为选中的档位生效了）。
 *
 * @module dsh-codex-supplement/image-models
 */

/** @typedef {'fast' | 'quality' | 'legacy'} ImageModelTier */

/** 一个可选图像模型。 */
const CHOICES = [
  {
    id: 'gpt-image-2.5-flare',
    label: 'GPT Image 2.5 Flare',
    tier: 'fast',
    note: '快速档：低延迟的日常生成，适合试稿与迭代。',
  },
  {
    id: 'gpt-image-2.5-sunburst',
    label: 'GPT Image 2.5 Sunburst',
    tier: 'quality',
    note: '高质量档：精度优先，编辑与细节保真更强，单张更慢。',
  },
  {
    id: 'gpt-image-2.5-flare-2026-09-08',
    label: 'GPT Image 2.5 Flare (2026-09-08)',
    tier: 'fast',
    note: 'Flare 的固定快照。',
  },
  {
    id: 'gpt-image-2.5-sunburst-2026-09-08',
    label: 'GPT Image 2.5 Sunburst (2026-09-08)',
    tier: 'quality',
    note: 'Sunburst 的固定快照。',
  },
  {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    tier: 'legacy',
    note: '前代。',
  },
  {
    id: 'gpt-image-1.5',
    label: 'GPT Image 1.5',
    tier: 'legacy',
    note: '前代。',
  },
  {
    id: 'gpt-image-1',
    label: 'GPT Image 1',
    tier: 'legacy',
    note: '前代；官方默认值。',
  },
  {
    id: 'chatgpt-image-latest',
    label: 'ChatGPT Image (latest)',
    tier: 'legacy',
    note: '跟随最新。',
  },
]

/** 全部可选图像模型（冻结，供配置、工具与路由共用）。 */
export const IMAGE_MODEL_CHOICES = Object.freeze(CHOICES.map((choice) => Object.freeze(choice)))

/** 全部已知图像模型 id。 */
export const IMAGE_MODEL_IDS = Object.freeze(IMAGE_MODEL_CHOICES.map((choice) => choice.id))

/**
 * 出厂默认图像模型。
 * 取快速档：默认应当是"最不容易让人等太久"的那一档，需要精度时由调用方显式指定。
 */
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare'

/** 出厂勾选（工具默认暴露这两个，正是"快速版 + 高质量版"）。 */
export const DEFAULT_IMAGE_MODELS = Object.freeze(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'])

/** 模型 id 形状校验：官方 id 允许字母、数字、点、连字符。 */
const IMAGE_MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/

/**
 * 是否是形状合法的模型 id（**不**要求在已知目录内——订阅端点未公开枚举，
 * 官方随时可能新增 id，硬拦会把"自填可用"的路堵死）。
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
 * @returns {{id:string,label:string,tier:ImageModelTier,note:string}|undefined}
 */
export function imageModelChoice(value) {
  return IMAGE_MODEL_CHOICES.find((choice) => choice.id === value)
}

/**
 * 给工具描述用的紧凑清单文本（例如 `gpt-image-2.5-flare（快速档）`）。
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
