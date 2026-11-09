/**
 * 图像组件的配置 schema（纯 schema，不 import 工具系统）。
 *
 * 单独成模块是为了让 base row 继续接受旧 profile 里的媒体字段（只做校验），
 * 而不必加载 image 工具依赖。image row 始终使用这里的当前默认值。
 *
 * @module dsh-codex-supplement/image-config
 */

import z from '@deepseek-ai/schemastery'
import { DEFAULT_IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from './image-models.mjs'
import { DEFAULT_IMAGE_OUTPUT_DIR } from './image-output.mjs'

export const Config = z.object({
  /** 总开关：与"勾选至少一个图像模型"共同决定是否注册生图工具。 */
  enableImageGeneration: z.boolean().default(false).volatile(),
  /** 模型清单（设置页逐行编辑）。空数组 = 不暴露生图工具；顺序只影响展示。 */
  imageModels: z.array(z.string()).default([...DEFAULT_IMAGE_MODELS]).volatile(),
  /** 不传 model 时使用的默认模型；非法或未勾选时回落到清单首项。 */
  defaultImageModel: z.string().default(DEFAULT_IMAGE_MODEL).volatile(),
  /** 每个模型自己的缺省；quality 必须在模型能力内，complexity 仅 2.6 系有效。 */
  imageModelDefaults: z.dict(z.object({
    quality: z.string().default('auto'),
    complexity: z.string().default(''),
  })).default({}).volatile(),
  /** 缺省质量档（已弃用：请用 imageModelDefaults[model].quality）。 */
  imageQuality: z.string().default('').volatile(),
  /** 缺省复杂度（已弃用：请用 imageModelDefaults[model].complexity）。 */
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
