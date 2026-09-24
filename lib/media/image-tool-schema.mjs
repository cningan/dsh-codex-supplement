/**
 * 生图工具的**参数/描述/输出 schema**（纯数据构造，不触碰工具系统）。
 *
 * 为什么单独成模块：`image-tool.js` 顶部要 `import { defineTool } from '@deepseek-ai/dsh-tools'`，
 * 而该包只存在于 DSH profile 的依赖树、不在本仓库的 `node_modules` 里 ⇒ 单测**无法**
 * import 工具模块，于是"工具长什么样"过去只能靠重启后在真机上肉眼看。
 *
 * 把 schema 抽成纯函数后，以下都变成离线可断言的事实（重启前即可回归）：
 * - 只有一个工具名，且参数里**存在** `model`
 * - `model` 的枚举正好等于配置勾选清单，缺省值明确写在描述里
 * - 已删除的死参数 `aspectRatio` 不会再出现
 * - 官方 `image_generation` 的其余字段（quality/size/background/action/format）都在
 *
 * @module dsh-codex-supplement/image-tool-schema
 */

import { DEFAULT_IMAGE_MODEL, describeImageModels } from './image-models.mjs'
import { IMAGE_ACTIONS, IMAGE_BACKGROUNDS, IMAGE_QUALITIES, IMAGE_SIZES } from './adapters/openai-codex.js'

/**
 * 唯一的生图工具名。旧实现同时注册 `codex-generate-image` 与 `media-image-codex`
 * 两个名字；按用户 2026-09-24 裁定合并为**单个生图工具**，保留语义最清晰的这个。
 */
export const IMAGE_TOOL_NAME = 'codex-generate-image'

/** 工具输出的 JSON schema（files + 用了哪个图像模型 / 哪个 carrier）。 */
export function buildImageToolOutputSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      files: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: { type: 'string', required: true },
            bytes: { type: 'integer', required: true },
            mediaType: { type: 'string', required: true },
          },
        },
      },
      model: { type: 'string' },
      carrier: { type: 'string' },
      summary: { type: 'string', required: true },
    },
  }
}

/** 工具结果的文本渲染（路径清单，不发图片内容）。 */
export function renderImageToolOutput(_args, value) {
  return [{
    type: 'text',
    text: [
      value?.summary ?? 'Generated image.',
      ...(Array.isArray(value?.files) && value.files.length > 0
        ? ['Files:', ...value.files.map((file) => `- ${file.path} (${file.bytes} bytes) ${file.mediaType}`)]
        : []),
    ].join('\n'),
  }]
}

/**
 * 工具参数 schema。
 * @param {object} input
 * @param {readonly string[]} [input.models] 设置页勾选的图像模型（工具 `model` 的合法取值）。
 * @param {string} [input.defaultModel] 不传 `model` 时使用的档位。
 * @returns {Record<string, object>} 参数名 → schema。
 */
export function buildImageToolParameters({ models, defaultModel } = {}) {
  const enabled = Array.isArray(models) ? models.filter((id) => typeof id === 'string' && id.length > 0) : []
  const fallback = enabled[0] ?? DEFAULT_IMAGE_MODEL
  const effectiveDefault = typeof defaultModel === 'string' && defaultModel.length > 0 ? defaultModel : fallback
  // 枚举只在真的有勾选时给出；一个都没勾时工具本就不会注册，这里只是不让 schema 变成空枚举。
  const modelParameter = {
    type: 'string',
    ...(enabled.length > 0 ? { enum: [...enabled] } : {}),
    description: `Image model to use.${enabled.length > 0 ? ` One of: ${enabled.join(', ')}.` : ''} Defaults to ${effectiveDefault}. Omit to use the default.`,
  }
  return {
    prompt: {
      type: 'string',
      required: true,
      description: 'Detailed image-generation or edit prompt.',
    },
    model: modelParameter,
    size: {
      type: 'string',
      description: `Output size. Standard values: ${IMAGE_SIZES.join(', ')}. GPT Image 2 / 2.5 also accept an arbitrary \`WIDTHxHEIGHT\` (both divisible by 16, aspect ratio between 1:3 and 3:1, maximum 3840x2160, e.g. 1536x864).`,
    },
    quality: {
      type: 'string',
      enum: [...IMAGE_QUALITIES],
      description: 'Rendering quality. GPT Image 2.5 (flare/sunburst) additionally supports xhigh and max.',
    },
    background: {
      type: 'string',
      enum: [...IMAGE_BACKGROUNDS],
      description: 'Background handling. Use transparent with png or webp output.',
    },
    action: {
      type: 'string',
      enum: [...IMAGE_ACTIONS],
      description: 'Whether to generate a new image or edit the provided reference image(s). Default auto.',
    },
    format: {
      type: 'string',
      enum: ['png', 'jpeg', 'webp'],
      description: 'Output format. Default png.',
    },
    image: {
      type: 'string',
      description: 'Optional reference image as a local absolute path, HTTP URL, or data URL. Providing one selects the edit path.',
    },
  }
}

/**
 * 工具描述。勾选的模型与默认档写进描述，模型在没有工具 schema 细节时也能选对档。
 * @param {object} input
 * @param {readonly string[]} [input.models]
 * @param {string} [input.defaultModel]
 * @param {string} input.outputNote 输出落盘位置说明（由调用方提供，含可配置项名）。
 * @returns {string}
 */
export function buildImageToolDescription({ models, defaultModel, outputNote } = {}) {
  const enabled = Array.isArray(models) ? models.filter((id) => typeof id === 'string' && id.length > 0) : []
  const fallback = enabled[0] ?? DEFAULT_IMAGE_MODEL
  const effectiveDefault = typeof defaultModel === 'string' && defaultModel.length > 0 ? defaultModel : fallback
  const modelNote = enabled.length > 0
    ? ` Enabled image models: ${describeImageModels(enabled)}. Default: ${effectiveDefault}.`
    : ''
  return `Generate or edit an image through the signed-in ChatGPT/Codex subscription, choosing the image model with the \`model\` parameter. The Codex chat model is only the Responses carrier; the image model is a separate hosted \`image_generation\` setting.${modelNote} ${outputNote}`
}
