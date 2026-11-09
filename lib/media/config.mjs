/**
 * 图像组件的配置 schema（纯 schema，不 import 工具系统）。
 *
 * 单独成模块是为了让 base row 能接住旧媒体配置，而不必加载 image 工具依赖
 * （`@deepseek-ai/dsh-tools`、附件、fs 等）。base 只把旧字段作为迁移值转交。
 *
 * @module dsh-codex-supplement/image-config
 */

import z from '@deepseek-ai/schemastery'
import { DEFAULT_IMAGE_MODELS } from './image-models.mjs'
import { DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'
import { DEFAULT_IMAGE_QUALITY } from './adapters/openai-codex.js'

export const Config = z.object({
  /** 总开关：与"勾选至少一个图像模型"共同决定是否注册生图工具。 */
  enableImageGeneration: z.boolean().default(false).volatile(),
  /** 模型清单（设置页逐行编辑）。空数组 = 不暴露生图工具；顺序即优先级，第一个是缺省档。 */
  imageModels: z.array(z.string()).default([...DEFAULT_IMAGE_MODELS]).volatile(),
  /** 缺省质量档（工具调用不传 `quality` 时使用）。出厂 `auto` = 服务端按提示词自决。 */
  imageQuality: z.string().default(DEFAULT_IMAGE_QUALITY).volatile(),
  /** 缺省复杂度（2.6 起；空串 = 交给模型默认，不上送）。 */
  imageComplexity: z.string().default('').volatile(),
  /** 生成结果另存目录（相对会话工作区）。 */
  imageOutputDir: z.string().default(DEFAULT_IMAGE_OUTPUT_DIR).volatile(),
  // ── 以下两项是旧配置形态，**只用于一次性迁移读取**，不再是选择的正源 ──
  /** @deprecated 用 `imageModels`；仅用于识别旧配置是否启用过订阅引擎。 */
  enableProviders: z.array(z.string()).default([]).volatile(),
  /** @deprecated 用 `imageModels`；仅用于识别旧配置是否显式关闭过。 */
  providerModelSelections: z.dict(z.object({
    models: z.array(z.string()).default([]),
    defaultModel: z.string().default(''),
  })).default({}).volatile(),
})

export const MEDIA_CONFIG_DEFAULTS = Object.freeze({
  enableImageGeneration: false,
  imageModels: Object.freeze([...DEFAULT_IMAGE_MODELS]),
  imageQuality: DEFAULT_IMAGE_QUALITY,
  imageComplexity: '',
  imageOutputDir: DEFAULT_IMAGE_OUTPUT_DIR,
  enableProviders: Object.freeze([]),
  providerModelSelections: Object.freeze({}),
})
