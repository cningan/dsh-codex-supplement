/**
 * 生图工具的**参数/描述/输出 schema**（纯数据构造，不触碰工具系统）。
 *
 * 为什么单独成模块：`image-tool.js` 顶部要 `import { defineTool } from '@deepseek-ai/dsh-tools'`，
 * 而该包只存在于 DSH profile 的依赖树、不在本仓库的 `node_modules` 里 ⇒ 单测**无法**
 * import 工具模块，于是"工具长什么样"过去只能靠重启后在真机上肉眼看。
 *
 * 2026-11 重设（对齐 openai-python 的 ImageGeneration tool 字段）：
 * - 参数名与官方一致：`output_format` / `output_compression` / `frame_count` 语义，
 *   工具面用更短的 `frames` / `frame_duration_ms`；
 * - 新增 `complexity`（2.6 起把"场景规划"与"像素渲染"拆开）与 `mask`（局部重绘）；
 * - `output_format` 增加 gif / svg（2.6 能力位），但**明确告知**订阅 OAuth lane
 *   可能忽略或拒绝这些字段；试生图会原样回显上游结果；
 * - 能力位由配置勾选清单决定：没有 2.6 模型时 complexity / gif / svg 不出现在 schema，
 *   避免模型调用一个只会被服务端忽略的参数。
 *
 * @module dsh-codex-supplement/image-tool-schema
 */

import {
  DEFAULT_IMAGE_MODEL,
  describeImageModels,
  selectionCapabilities,
} from './image-models.mjs'
import {
  DEFAULT_IMAGE_QUALITY,
  IMAGE_ACTIONS,
  IMAGE_BACKGROUNDS,
  IMAGE_COMPLEXITIES,
  IMAGE_QUALITIES,
  IMAGE_SIZES,
} from './adapters/openai-codex.js'

/**
 * 唯一的生图工具名。旧实现同时注册 `codex-generate-image` 与 `media-image-codex`
 * 两个名字；按用户 2026-09-24 裁定合并为**单个生图工具**，保留语义最清晰的这个。
 */
export const IMAGE_TOOL_NAME = 'codex-generate-image'

/** 工具输出的 JSON schema（files + 请求的模型 + 上游回传的实际字段）。 */
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
      /** 上游回传的实际生效字段；OAuth 端点可能不回传。 */
      effective: {
        type: 'object',
        additionalProperties: false,
        properties: {
          model: { type: 'string' },
          size: { type: 'string' },
          quality: { type: 'string' },
          background: { type: 'string' },
          output_format: { type: 'string' },
          complexity: { type: 'string' },
          revised_prompt: { type: 'string' },
        },
      },
      summary: { type: 'string', required: true },
    },
  }
}

/** 工具结果的文本渲染（路径清单，不发图片内容）。 */
export function renderImageToolOutput(_args, value) {
  const effective = value?.effective
  return [{
    type: 'text',
    text: [
      value?.summary ?? 'Generated image.',
      effective !== undefined && typeof effective === 'object'
        ? `Effective: ${Object.entries(effective).map(([key, item]) => `${key}=${item}`).join(', ')}`
        : 'Effective: the endpoint returned no model/size metadata.',
      ...(Array.isArray(value?.files) && value.files.length > 0
        ? ['Files:', ...value.files.map((file) => `- ${file.path} (${file.bytes} bytes) ${file.mediaType}`)]
        : []),
    ].join('\n'),
  }]
}

/**
 * 工具参数 schema。
 *
 * 颗粒度取舍（2026-11）：**扁平、与官方字段一一对应**，不做再分组的嵌套对象。
 * 理由：模型调用工具时最常见的错误是层级/必填放错；官方 `image_generation`
 * 本身就是一组扁平可选字段，直接映射最不容易错。稀有字段（gif / svg / mask）
 * 只在能力位允许时出现，保持模型面前的工具面尽量小。
 *
 * @param {object} input
 * @param {readonly string[]} [input.models] 设置页勾选的图像模型（工具 `model` 的合法取值）。
 * @param {string} [input.defaultModel] 不传 `model` 时使用的档位。
 * @param {string} [input.defaultQuality] 不传 `quality` 时使用的质量档。
 * @param {string} [input.defaultComplexity] 不传 `complexity` 时使用的复杂度（空 = 模型默认）。
 * @returns {Record<string, object>} 参数名 → schema。
 */
export function buildImageToolParameters({ models, defaultModel, defaultQuality, defaultComplexity } = {}) {
  const enabled = Array.isArray(models) ? models.filter((id) => typeof id === 'string' && id.length > 0) : []
  const fallback = enabled[0] ?? DEFAULT_IMAGE_MODEL
  const effectiveDefault = typeof defaultModel === 'string' && defaultModel.length > 0 ? defaultModel : fallback
  const effectiveQuality = typeof defaultQuality === 'string' && defaultQuality.length > 0 ? defaultQuality : DEFAULT_IMAGE_QUALITY
  const effectiveComplexity = typeof defaultComplexity === 'string' && defaultComplexity.length > 0
    ? defaultComplexity
    : ''
  const caps = selectionCapabilities(enabled)

  // 枚举只在真的有勾选时给出；一个都没勾时工具本就不会注册，这里只是不让 schema 变成空枚举。
  const modelParameter = {
    type: 'string',
    ...(enabled.length > 0 ? { enum: [...enabled] } : {}),
    description: `Image model to use.${enabled.length > 0 ? ` One of: ${enabled.join(', ')}.` : ''} Omit to use the configured default model (${effectiveDefault}).`,
  }

  const formats = ['png', 'jpeg', 'webp']
  if (caps.gif) formats.push('gif')
  if (caps.svg) formats.push('svg')

  const parameters = {
    prompt: {
      type: 'string',
      required: true,
      description: 'Detailed image-generation or edit prompt.',
    },
    model: modelParameter,
    image: {
      type: 'string',
      description: 'Optional reference image as a local absolute path, HTTP URL, or data URL. Providing one selects the edit path.',
    },
    size: {
      type: 'string',
      description: `Output size. Recommended values: ${IMAGE_SIZES.join(', ')}. GPT Image 2 / 2.5 / 2.6 also accept an arbitrary \`WIDTHxHEIGHT\` (both divisible by 16, aspect ratio between 1:3 and 3:1, maximum 3840x2160, e.g. 1536x864). The Codex OAuth lane is known to ignore this field and return its own size.`,
    },
    quality: {
      type: 'string',
      enum: [...IMAGE_QUALITIES],
      description: `Rendering quality, independent of planning complexity. GPT Image 1 / 1.5 / 2 cap at high; GPT Image 2.5 (flare/sunburst) also supports xhigh and max; GPT Image 2.6 separates planning into complexity. Default follows the selected model: ${effectiveQuality}. A value outside that model's range is rejected.`,
    },
    background: {
      type: 'string',
      enum: [...IMAGE_BACKGROUNDS],
      description: 'Background handling. Use transparent with png or webp output; jpeg cannot carry transparency.',
    },
    action: {
      type: 'string',
      enum: [...IMAGE_ACTIONS],
      description: 'Whether to generate a new image or edit the provided reference image(s). Default auto.',
    },
    output_format: {
      type: 'string',
      enum: formats,
      description: `Output format. Default png.${caps.gif || caps.svg ? ' gif and svg are GPT Image 2.6 outputs; the Codex OAuth lane may reject or ignore them.' : ''}`,
    },
  }

  // 2.6 能力位：复杂度、GIF 参数、SVG 都只在有对应模型时出现。
  if (caps.complexity) {
    parameters.complexity = {
      type: 'string',
      enum: [...IMAGE_COMPLEXITIES],
      description: `Planning effort, independent of rendering quality (GPT Image 2.6+). Use low for quick edits; medium/high for scenes with many elements or constraints. Default follows the selected model: ${effectiveComplexity || 'model default'}. The Codex OAuth lane may ignore it.`,
    }
  }
  if (caps.gif) {
    parameters.frames = {
      type: 'integer',
      description: 'GIF frame count. Only with output_format=gif; default 9.',
    }
    parameters.frame_duration_ms = {
      type: 'integer',
      description: 'GIF frame duration in milliseconds. Only with output_format=gif; default 200.',
    }
  }

  parameters.output_compression = {
    type: 'integer',
    description: 'Compression level 0-100 for jpeg/webp output. Default 100. Not supported for gif.',
  }
  parameters.moderation = {
    type: 'string',
    enum: ['auto', 'low'],
    description: 'Content-moderation level. Default auto.',
  }
  parameters.input_fidelity = {
    type: 'string',
    enum: ['low', 'high'],
    description: 'How closely an edit follows the input image style/features. Default low; GPT Image 1-mini does not support it.',
  }
  parameters.partial_images = {
    type: 'integer',
    description: 'Number of partial images in streaming mode (0-3). Default 0. Not supported for gif.',
  }
  parameters.mask = {
    type: 'string',
    description: 'Optional inpainting mask as a local absolute path, HTTP URL, or data URL. Transparent pixels mark the editable area.',
  }

  return parameters
}

/**
 * 工具描述。勾选的模型、能力位与 OAuth 边界写进描述，模型在没有工具 schema 细节时也能选对档。
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
  const caps = selectionCapabilities(enabled)
  const modelNote = enabled.length > 0
    ? ` Enabled image models: ${describeImageModels(enabled)}. Choose one explicitly; if omitted, the configured default model (${effectiveDefault}) is used, and quality/complexity follow that model's profile.`
    : ''
  const capabilityNote = [
    caps.complexity ? 'complexity (2.6 planning effort)' : '',
    caps.gif ? 'gif output' : '',
    caps.svg ? 'svg output' : '',
  ].filter(Boolean).join(', ')
  return `Generate or edit an image through the signed-in ChatGPT/Codex subscription, choosing the image model with the \`model\` parameter. The Codex chat model is only the Responses carrier; the image model is a separate hosted \`image_generation\` setting.${modelNote}`
    + (capabilityNote ? ` Enabled 2.6 capabilities: ${capabilityNote}.` : '')
    + ' The Codex OAuth lane is known to ignore model/size/complexity and reject gif on some builds; report whatever the endpoint returns instead of assuming the request took effect.'
    + ` ${outputNote}`
}
