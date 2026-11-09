# Codex 订阅图像生成

本说明描述包当前的图像生成能力及其模型边界。源码与测试仍是权威；本文档解释各部分如何拼合。共享词汇在[上下文词汇表](../CONTEXT.md)中定义。

## 范围与能力

本包暴露一个图像工具 `codex-generate-image`，用于 ChatGPT/Codex 订阅支撑的 Responses `image_generation` 流程。它支持生成与编辑，可带可选参考图。它不是 OpenAI API-key Images 端点、通用多 provider adapter 或视频功能。包 README 列出了受支持的产品面与排除项。

该功能仅在启用图像生成且至少选定一个图像模型时注册。设置列表是工具的图像模型允许清单；`defaultImageModel` 显式决定不传 `model` 时的缺省，清单顺序只影响展示。每个启用模型通过 `imageModelDefaults[model]` 保存自己的 quality / complexity，解析时先选模型、再读该模型 profile。空列表表示没有图像工具。内置缺省列表是 GPT Image 2.6 Flare 与 Sunburst；当前目录与标签位于 `lib/media/image-models.mjs`，不在本说明中。

工具接受 `prompt`、`model`、`image`（可选参考图）、`mask`、`size`、`quality`、`complexity`、`background`、`action`、`output_format`、`output_compression`、`moderation`、`input_fidelity`、`partial_images`，以及 2.6 GIF 用的 `frames` / `frame_duration_ms`。当已勾选模型没有 2.6 能力位时，`complexity` / `frames` / `frame_duration_ms` 不出现，`output_format` 也只到 png/jpeg/webp。生成的文件保存到当前会话工作区之下（缺省 `images/`）；工具结果报告文件元数据、请求模型与上游回传的 `effective` 字段，图像通过 Host 附件机制传递。参见 `lib/media/image-tool-schema.mjs`、`lib/media/image-tool.js` 与 `lib/media/image-output.mjs`。

设置页另有试生图面板与 `POST /plugins/dsh-codex-supplement/codex/test-image`。它复用同一 adapter 与当前 carrier，只发一次最小请求，不写工作区、不注册工具；响应包含 `ok`、`ms`、`requested`、`effective`、`carrier` 与 `images`（超过 3 MiB 不回传 `dataUrl`）。每次点击会真实消耗一张订阅图，因此它适合用来判断当前 OAuth 构建到底接受哪些字段，而不是作为无副作用的健康检查。

## 五个不同的模型/请求概念

| 概念 | 属主与请求位置 | 含义 |
|---|---|---|
| DSH Codex 聊天模型选择 | 官方 DSH `openai-codex` provider 与 Models UI | 拥有对话模型标识及其输入/输出能力。本插件不维护第二套聊天模型目录。 |
| Responses carrier | 顶层 Responses 请求字段 `model` | 携带请求/工具调用的 Codex 对话模型。本插件固定为 ChatGPT 账号可用的 `gpt-5.6-terra`；它不是图像引擎，也不跟随官方聊天模型选择。 |
| 图像生成模型 | 托管 `image_generation` 工具内部的 `model` | 为本次工具调用选择图像引擎。它来自插件选定的图像模型列表，或允许的单次覆盖。 |
| 图像质量 | `image_generation` 内部的 `quality` | 独立的生成控件，缺省为 `auto`，除非另有配置或覆盖。它既不是聊天模型也不是图像模型 ID。 |
| 场景复杂度 | `image_generation` 内部的 `complexity` | GPT Image 2.6 起的规划强度（low / medium / high），与渲染质量解耦；省略 = 模型默认。 |

`model` 这个词出现在两个不同的请求对象中。其角色来自来源与位置，而不是 ID 的拼写：carrier 由本插件固定为 `gpt-5.6-terra`，写在请求顶层；图像模型取自本包的图像选择，写在工具声明内部。不要把图像 ID 挪进顶层字段，不要从 carrier 推导图像引擎，也不要把图像模型名换算成质量值。

## 请求与输出流程

1. `codex-supplement` base row 提供 `openaiCodexAuth` 与设置页；`codex-supplement-image` 行（`lib/media/index.js`）拥有生图启用标志、模型清单、显式默认模型、每个模型的 quality/complexity 缺省与输出目录设置。base 行上的旧媒体字段仍通过校验，但不再覆盖 image 行。
2. `lib/media/image-tool.js` 使用固定的 ChatGPT-account carrier，并独立地把请求的图像模型对照选定的允许清单解析。请求未选定的图像模型会被拒绝并列合法值；代码不会静默选择替身。
3. `lib/media/adapters/openai-codex.js` 构造 Responses 请求，其顶层 `model` 是 carrier，`tools` 项是 `image_generation`。图像模型只写入该工具的 `model` 字段；quality、complexity、size、action、background、输出格式、压缩、审核、输入保真、部分图、GIF 帧与遮罩仍是工具级控件。
4. adapter 解析返回的图像生成事件与 `image_generation_call` 上的实际字段（`effective`）。执行/输出层保存图像字节，并通过工具结果与附件处理返回路径/元数据。
5. 试生图路由复用第 2–4 步，但不经过工具注册/工作区写入；它把 `requested`、`effective`、耗时与预览直接回给设置页。

carrier/图像区分在 `test/codex-carrier.test.mjs` 中断言；允许清单/缺省解析由 `test/model-selection.test.mjs` 覆盖；面向用户的工具契约由 `test/image-tool-schema.test.mjs` 覆盖。

## 兼容性证据与边界

OpenAI Python SDK 生成的 Responses `ImageGeneration` 工具类型暴露了工具级 `model`、`complexity`、`output_format`（含 gif/svg）、`frame_count`、`frame_duration_ms`、`output_compression`、`moderation`、`input_fidelity`、`partial_images` 与 `input_image_mask` 等字段。这是公开 OpenAI Responses 工具形态的证据；它不是独立的 Codex 订阅网关已发布的 schema。订阅端点没有公开 schema。包 README 于 2026-09-24 记录的真实订阅检查，为两个 2.5 内置缺省产出了 PNG 输出。2026-11-06 的独立报告（openai/codex#59890）显示 OAuth `/backend-api/codex/images/*` lane 会忽略 `model` / `complexity` / `size` / SVG，并以 400 拒绝 GIF；本包使用 Responses hosted-tool lane，不能假定行为不同。因此请把目录与试生图当作“可实测的候选”，而不是对每个目录/自定义 ID 或未来网关版本可用的保证。

目录有意允许语法合法的自定义 ID，以免新支持的 ID 被过时的本地 enum 挡住。这并不代表远程支持。如果订阅端点拒绝请求的模型或格式，adapter 会上报响应状态、模型 ID 与格式提示；它绝不静默替换为其他模型。目录在 `lib/media/image-models.mjs`；请求构造与错误行为在 `lib/media/adapters/openai-codex.js`。

`quality` 与 `complexity` 属于所选图像模型的 profile，不是一份全局请求级缺省。显式参数可以覆盖，但必须落在该模型的能力位内；模型 profile 中的非法值在解析时被裁掉并回落到模型默认。工具描述提醒 GPT Image 1 / 1.5 / 2 最高到 `high`，GPT Image 2.5 还支持 `xhigh` 与 `max`，而 2.6 把场景规划拆到 `complexity`。当前实现不会静默换成另一个档位；远程拒绝保持可见。只有在获得新的端点证据时才重新审视这一点；若契约变化，请更新相关测试。

## 参考

- [包规格](../SPEC.md)
- [面向用户的包 README](../README.md)
- [图像生成工具 schema](../lib/media/image-tool-schema.mjs)
- [模型目录](../lib/media/image-models.mjs)
- [模型选择](../lib/media/model-selection.mjs)
- [工具执行](../lib/media/image-tool.js) 与[输出处理](../lib/media/image-output.mjs)
- [试生图请求解析](../lib/media/test-request.mjs)
- [Codex Responses adapter](../lib/media/adapters/openai-codex.js)
- [carrier/图像模型测试](../test/codex-carrier.test.mjs)
- OpenAI [Responses 图像生成指南](https://developers.openai.com/api/docs/guides/tools-image-generation) 与 SDK 生成的 [Responses 图像工具类型](https://github.com/openai/openai-python/blob/main/src/openai/types/responses/tool_param.py)。SDK 类型与订阅网关行为是两套独立的证据来源。

