/**
 * 生图工具的**参数/描述/输出 schema**（纯数据构造，不触碰工具系统）。
 *
 * 为什么单独成模块：`image-tool.js` 顶部要 `import { defineTool } from '@deepseek-ai/dsh-tools'`，
 * 而该包只存在于 DSH profile 的依赖树、不在本仓库的 `node_modules` 里 ⇒ 单测**无法**
 * import 工具模块，于是"工具长什么样"过去只能靠重启后在真机上肉眼看。
 *
 * 2026-11 重设（对齐 Codex 专有 Images 端点）：
 * - 顶层只有图像模型；不再有 Responses carrier / hosted `image_generation` 工具；
 * - 参数只保留端点接受的 `model` / `size` / `quality` / `background` / PNG-GIF；
 * - `complexity`、xhigh/max、SVG/WebP/JPEG、遮罩、压缩等开放 API 或旧 hosted-tool
 *   字段不再出现在 schema；没有 2.6 模型时 GIF 也不出现。
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
  const caps = selectionCapabilities(enabled)

  // 枚举只在真的有勾选时给出；一个都没勾时工具本就不会注册，这里只是不让 schema 变成空枚举。
  const modelParameter = {
    type: 'string',
    ...(enabled.length > 0 ? { enum: [...enabled] } : {}),
    description: `Image model to use.${enabled.length > 0 ? ` One of: ${enabled.join(', ')}.` : ''} Omit to use the configured default model (${effectiveDefault}).`,
  }

  const formats = ['png']
  if (caps.gif) formats.push('gif')

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
      enum: ['auto', 'low', 'medium', 'high'],
      description: `Rendering quality. The Codex Images endpoint accepts auto, low, medium and high. Default follows the selected model: ${effectiveQuality}. A value outside that range is rejected.`,
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
      description: `Output format. Default png.${caps.gif ? ' GPT Image 2.6 also supports gif; configure frames and frame_duration_ms.' : ''}`,
    },
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
    ? ` Enabled image models: ${describeImageModels(enabled)}. Choose one explicitly; if omitted, the configured default model (${effectiveDefault}) is used, and quality follows that model's profile.`
    : ''
  const capabilityNote = [
    caps.gif ? 'gif output' : '',
  ].filter(Boolean).join(', ')
  return `Generate or edit an image through the signed-in ChatGPT/Codex subscription, choosing the image model with the \`model\` parameter. This uses the dedicated Codex Images endpoint; there is no Responses carrier.${modelNote}`
    + (capabilityNote ? ` Enabled capability: ${capabilityNote}.` : '')
    + ' The Codex Images lane accepts model/size/quality/background and PNG or GIF; complexity, xhigh/max, SVG/WebP/JPEG, masks and compression are not supported and are rejected locally.'
    + ` ${outputNote}`
}
