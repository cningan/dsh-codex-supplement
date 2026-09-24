/**
 * Codex 订阅生图的模型选择解析（纯函数，可离线单测）。
 *
 * 2026-09-24 重构（用户裁定"重新构建生图工具"）：
 * 原实现把"图像引擎由订阅服务端管理"读成了"不能选模型"——它只认一个哨兵值
 * `codex-managed-image`，并把 `capabilities.models` 写死为空数组。但官方
 * Responses `image_generation` tool 明确有 `model` 字段（依据见 `image-models.mjs`），
 * 所以选择被拆成两层，各管一件事：
 *
 *   · **配置层**（`imageModels`）：用户勾选"允许用哪些图像模型"——决定工具是否注册、
 *     以及工具 `model` 参数的合法取值集合。没勾就不暴露。
 *   · **调用层**（工具 `model` 参数）：在一次调用里指明这回想用哪一档，缺省用配置的
 *     默认档。工具本身不绑定任何模型。
 *
 * 订阅服务端仍是图像引擎；这里只是**声明想用哪一档**，不承诺端点一定接受某个 id
 * （被拒绝时 adapter 如实报错，不静默回退）。
 *
 * @module dsh-codex-supplement/model-selection
 */

import {
  DEFAULT_IMAGE_MODELS,
  DEFAULT_IMAGE_MODEL,
  isValidImageModelId,
} from './image-models.mjs'

/** 本插件唯一支持的图像 provider id。 */
export const CODEX_PROVIDER_ID = 'openai-codex-oauth'

/**
 * 旧实现的哨兵值。**只用于一次性迁移**：老配置里
 * `providerModelSelections['openai-codex-oauth'].models` 含它，等价于
 * "订阅管理默认引擎"，迁移成出厂勾选。
 * 绝不再作为模型 id 发给上游。
 */
export const LEGACY_MANAGED_IMAGE_CHOICE = 'codex-managed-image'

/** @param {unknown} value */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

/** 去重（保序）。 */
function dedupe(values) {
  return [...new Set(values)]
}

/**
 * 解析配置里"允许使用的图像模型"清单。
 *
 * 四种输入各自有确切含义，不可混为一谈（这是旧实现踩过的坑）：
 * - `models` 是数组（含空数组）⇒ **以它为准**；空数组 = 用户主动不暴露任何模型。
 * - `models` 为 undefined ⇒ 配置字段缺失（例如宿主尚未重启、schema 未生效）；
 *   此时看旧字段能否迁移，迁不出来就给出厂勾选，**不要**当成"用户关了"。
 * @param {object} input
 * @param {unknown} input.models 配置的 `imageModels`。
 * @param {unknown} [input.legacySelections] 旧 `providerModelSelections`。
 * @param {unknown} [input.legacyEnabled] 旧 `enableProviders` 是否含本 provider。
 * @returns {string[]} 合法的图像模型 id（保序去重）。
 */
export function resolveSelectedImageModels({ models, legacySelections, legacyEnabled }) {
  if (Array.isArray(models)) {
    return dedupe(models.filter(isValidImageModelId))
  }
  // 旧配置可能表达过"显式关闭"——那必须继续关闭，不能因字段缺失而重新打开。
  if (legacySelectionState({ legacySelections, legacyEnabled }) === 'off') return []
  return [...DEFAULT_IMAGE_MODELS]
}

/**
 * 旧配置表达的选择状态。
 *
 * `enableProviders` 是数组、由调用方转成布尔，所以 `false` 既可能是"没配"
 * 也可能是"配了别的 provider"——两种都不算显式关闭，归 `unset`。
 * @param {object} input
 * @param {unknown} [input.legacySelections]
 * @param {unknown} [input.legacyEnabled]
 * @returns {'on'|'off'|'unset'}
 */
export function legacySelectionState({ legacySelections, legacyEnabled }) {
  if (legacySelections !== null && typeof legacySelections === 'object') {
    const entry = legacySelections[CODEX_PROVIDER_ID]
    if (entry !== null && typeof entry === 'object' && Array.isArray(entry.models)) {
      return entry.models.includes(LEGACY_MANAGED_IMAGE_CHOICE) ? 'on' : 'off'
    }
  }
  return legacyEnabled === true ? 'on' : 'unset'
}

/**
 * 解析本次请求实际使用的图像模型。
 *
 * 优先级：工具 `model` 参数 > 配置默认档 > 勾选清单首个。
 * 请求的 id 必须落在勾选清单内——这正是"勾选决定暴露"的落点：清单外的 id
 * 直接拒绝并列出合法值，而不是悄悄换一个模型发出去。
 * @param {object} input
 * @param {unknown} input.requested 工具 `model` 参数。
 * @param {readonly string[]} input.selectedModels 配置勾选的清单。
 * @param {unknown} input.defaultModel 配置的默认档。
 * @returns {{model: string}} 本次要声明的图像模型。
 * @throws {Error} 清单为空，或请求的 id 不在清单内。
 */
export function resolveImageModelForRequest({ requested, selectedModels, defaultModel }) {
  const allowed = Array.isArray(selectedModels) ? selectedModels.filter(isValidImageModelId) : []
  if (allowed.length === 0) {
    throw new Error(
      'No image model is enabled: select at least one model in Settings → Codex Subscription → image generation.',
    )
  }
  if (isNonEmptyString(requested)) {
    if (!allowed.includes(requested)) {
      throw new Error(
        `Image model "${requested}" is not enabled. Enabled models: ${allowed.join(', ')}. `
        + 'Enable it in Settings → Codex Subscription → image generation first.',
      )
    }
    return { model: requested }
  }
  if (isNonEmptyString(defaultModel) && allowed.includes(defaultModel)) {
    return { model: defaultModel }
  }
  return { model: allowed[0] }
}

/**
 * 配置里的默认图像模型；非法或未勾选时回落到清单首个，清单为空则给出厂默认。
 * @param {object} input
 * @param {unknown} input.defaultModel
 * @param {readonly string[]} input.selectedModels
 * @returns {string}
 */
export function resolveDefaultImageModel({ defaultModel, selectedModels }) {
  const allowed = Array.isArray(selectedModels) ? selectedModels : []
  if (isNonEmptyString(defaultModel) && allowed.includes(defaultModel)) return defaultModel
  if (allowed.length > 0) return allowed[0]
  return DEFAULT_IMAGE_MODEL
}

/**
 * 解析 Responses carrier（承载 `image_generation` 工具的 Codex 对话模型）。
 *
 * carrier 与图像模型是两件事：前者是"谁来跑这次 Responses 请求"，后者是
 * "服务端用哪个图像引擎"。所以这里只接受官方默认模型选择提供的值，
 * 且必须形状合法；拿不到就返回 undefined，由 adapter 用它自己的已知可用兜底。
 * @param {object} input
 * @param {unknown} input.officialCodexDefaultModel 官方 `agentDefaultModel` 当前选择（provider 为 openai-codex 时）。
 * @returns {string|undefined}
 */
export function resolveCarrierModel({ officialCodexDefaultModel }) {
  return isValidImageModelId(officialCodexDefaultModel) ? officialCodexDefaultModel : undefined
}

/**
 * 校验 adapter 确实是 Codex 订阅图像 adapter。
 * @param {{id?:unknown, auth?:unknown}} [adapter]
 * @throws {Error} 不是本插件支持的 adapter。
 */
export function assertCodexImageAdapter(adapter) {
  if (adapter?.id !== CODEX_PROVIDER_ID || adapter?.auth !== 'oauth') {
    throw new Error('Only the Codex subscription image adapter is supported')
  }
}
