# Codex 订阅图像生成

本说明描述包当前的图像生成能力及其模型边界。源码与测试仍是权威；本文档解释各部分如何拼合。共享词汇在[上下文词汇表](../CONTEXT.md)中定义。

## 范围与能力

本包暴露一个图像工具 `codex-generate-image`，用于 ChatGPT/Codex 订阅支撑的 Responses `image_generation` 流程。它支持生成与编辑，可带可选参考图。它不是 OpenAI API-key Images 端点、通用多 provider adapter 或视频功能。包 README 列出了受支持的产品面与排除项。

该功能仅在启用图像生成且至少选定一个图像模型时注册。设置列表就是工具的图像模型允许清单：其顺序决定缺省，调用方可在每次请求中选择列表中的其他模型。空列表表示没有图像工具。内置缺省列表是 GPT Image 2.5 Flare 与 Sunburst；当前目录与标签位于 `lib/media/image-models.mjs`，不在本说明中。

工具接受 prompt、可选的图像模型选择、size、quality、background、action、输出格式与可选参考图。生成的文件保存到当前会话工作区之下（缺省 `images/`）；工具结果报告文件元数据与路径，图像通过 Host 附件机制传递。参见 `lib/media/image-tool-schema.mjs`、`lib/media/image-tool.js` 与 `lib/media/image-output.mjs`。

## 四个不同的模型/请求概念

| 概念 | 属主与请求位置 | 含义 |
|---|---|---|
| DSH Codex 聊天模型选择 | 官方 DSH `openai-codex` provider 与 Models UI | 拥有对话模型标识及其输入/输出能力。本插件不维护第二套聊天模型目录。 |
| Responses carrier | 顶层 Responses 请求字段 `model` | 携带请求/工具调用的 Codex 对话模型。当前官方 Codex 选择提供它；若该选择不可用，adapter 有代码自带的 fallback。它不是图像引擎。 |
| 图像生成模型 | 托管 `image_generation` 工具内部的 `model` | 为本次工具调用选择图像引擎。它来自插件选定的图像模型列表，或允许的单次覆盖。 |
| 图像质量 | `image_generation` 内部的 `quality` | 独立的生成控件，缺省为 `auto`，除非另有配置或覆盖。它既不是聊天模型也不是图像模型 ID。 |

`model` 这个词出现在两个不同的请求对象中。其角色来自来源与位置，而不是 ID 的拼写：carrier 取自官方 Codex 选择，写在请求顶层；图像模型取自本包的图像选择，写在工具声明内部。不要把图像 ID 挪进顶层字段，不要从 carrier 推导图像引擎，也不要把图像模型名换算成质量值。

## 请求与输出流程

1. `lib/media/index.js` 拥有图像生成启用标志、选定的图像模型列表、请求级质量缺省与输出目录设置。
2. `lib/media/image-tool.js` 把当前官方 Codex 选择解析为 carrier，并独立地把请求的图像模型对照选定的允许清单解析。请求未选定的图像模型会被拒绝并列合法值；代码不会静默选择替身。
3. `lib/media/adapters/openai-codex.js` 构造 Responses 请求，其顶层 `model` 是 carrier，`tools` 项是 `image_generation`。图像模型只写入该工具的 `model` 字段。quality、size、action、background 与输出格式仍是工具级控件。
4. adapter 解析返回的图像生成事件。执行/输出层保存图像字节，并通过工具结果与附件处理返回路径/元数据。

carrier/图像区分在 `test/codex-carrier.test.mjs` 中断言；允许清单/缺省解析由 `test/model-selection.test.mjs` 覆盖；面向用户的工具契约由 `test/image-tool-schema.test.mjs` 覆盖。

## 兼容性证据与边界

OpenAI Python SDK 生成的 Responses `ImageGeneration` 工具类型暴露了工具级 `model` 字段。这是公开 OpenAI Responses 工具形态的证据；它不是独立的 Codex 订阅网关已发布的 schema。订阅端点没有公开 schema。包 README 于 2026-09-24 记录的真实订阅检查，为两个内置缺省 `gpt-image-2.5-flare` 与 `gpt-image-2.5-sunburst` 产出了 PNG 输出。请把这当作带日期的实证兼容性证据，而不是对每个目录/自定义 ID 或未来网关版本可用的保证。

目录有意允许语法合法的自定义 ID，以免新支持的 ID 被过时的本地 enum 挡住。这并不代表远程支持。如果订阅端点拒绝请求的模型，adapter 会上报响应状态与模型 ID；它绝不静默替换为其他模型。目录在 `lib/media/image-models.mjs`；请求构造与错误行为在 `lib/media/adapters/openai-codex.js`。

`quality` 是带包级缺省的请求级值，不是按模型设置。工具描述提醒 GPT Image 1 / 1.5 / 2 最高到 `high`，而 GPT Image 2.5 还支持 `xhigh` 与 `max`。当前实现不会静默降级或本地拒绝网关行为未确立的模型/质量组合；远程拒绝保持可见。只有在获得新的端点证据时才重新审视这一点；若契约变化，请更新相关测试。

## 参考

- [包规格与代码地图](../SPEC.md)
- [面向用户的包 README](../README.md)
- [图像生成工具 schema](../lib/media/image-tool-schema.mjs)
- [模型目录](../lib/media/image-models.mjs)
- [模型选择](../lib/media/model-selection.mjs)
- [工具执行](../lib/media/image-tool.js) 与[输出处理](../lib/media/image-output.mjs)
- [Codex Responses adapter](../lib/media/adapters/openai-codex.js)
- [carrier/图像模型测试](../test/codex-carrier.test.mjs)
- OpenAI [Responses 图像生成指南](https://developers.openai.com/api/docs/guides/tools-image-generation) 与 SDK 生成的 [Responses 图像工具类型](https://github.com/openai/openai-python/blob/main/src/openai/types/responses/tool_param.py)。SDK 类型与订阅网关行为是两套独立的证据来源。
