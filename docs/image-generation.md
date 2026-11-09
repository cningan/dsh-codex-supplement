# Codex 订阅图像生成

本说明描述包当前的图像生成能力及其模型边界。源码与测试仍是权威；本文档解释各部分如何拼合。共享词汇在[上下文词汇表](../CONTEXT.md)中定义。

## 范围与能力

本包暴露一个图像工具 `codex-generate-image`，使用 ChatGPT/Codex 订阅的**专有 Images 端点**：

- 生成：`POST /backend-api/codex/images/generations`
- 编辑：`POST /backend-api/codex/images/edits`

它不再使用 Responses 的 hosted `image_generation` 工具。Codex 后端会剥离该工具：`tool_choice: auto` 时模型可能只返回文本/内联 SVG，强制 `tool_choice` 则返回 400。专有 Images 端点由当前 Codex CLI 使用，响应形如 `{created, data:[{b64_json}], size, quality, background}`。

该功能仅在启用图像生成且至少选定一个图像模型时注册。设置列表是工具的图像模型允许清单；`defaultImageModel` 显式决定不传 `model` 时的缺省，清单顺序只影响展示。每个启用模型通过 `imageModelDefaults[model]` 保存自己的 quality / complexity，解析时先选模型、再读该模型 profile。空列表表示没有图像工具。内置缺省列表是 GPT Image 2.6 Flare 与 Sunburst；当前目录与标签位于 `lib/media/image-models.mjs`，不在本说明中。

Codex Images 端点实际接受 `model` / `size` / `quality` / `background` / `n` 与 PNG（默认）或 GIF 输出；`quality` 仅 `auto/low/medium/high`，GIF 用 `frame_count` / `frame_duration_ms`。`complexity`、`xhigh`/`max`、SVG/WebP/JPEG、遮罩、压缩、审核、输入保真与部分图属于开放 API 或旧 hosted-tool 形态，本 lane 不支持；适配器会本地拒绝，避免把无效字段发给上游。

生成的文件保存到当前会话工作区之下（缺省 `images/`）；工具结果报告文件元数据、请求模型与上游回传的 `effective` 字段，图像通过 Host 附件机制传递。参见 `lib/media/image-tool-schema.mjs`、`lib/media/image-tool.js` 与 `lib/media/image-output.mjs`。

设置页另有试生图面板与 `POST /plugins/dsh-codex-supplement/codex/test-image`。它复用同一 Images adapter，只发一次最小请求，不写工作区、不注册工具；响应包含 `ok`、`ms`、`requested`、`effective`、`carrier` 与 `images`（超过 3 MiB 不回传 `dataUrl`）。每次点击会真实消耗一张订阅图，因此它适合用来判断当前 OAuth 构建到底接受哪些字段，而不是作为无副作用的健康检查。ChatGPT Free 会被 `planType` 预检拦截；预检不可用时，端点返回的 403 会被翻译成套餐提示。

## 模型与请求概念

| 概念 | 属主与请求位置 | 含义 |
|---|---|---|
| DSH Codex 聊天模型选择 | 官方 DSH `openai-codex` provider 与 Models UI | 拥有对话模型标识及其输入/输出能力。本插件不维护第二套聊天模型目录。 |
| 图像生成模型 | 请求顶层 `model` | Codex Images 端点的图像引擎。它来自插件选定的图像模型列表，或允许的单次覆盖。 |
| 图像质量 | 请求 `quality` | 独立的生成控件，缺省为 `auto`。Codex lane 接受 auto/low/medium/high。 |
| 场景复杂度 | 请求 `complexity` | 开放 API / 旧 hosted-tool 的规划强度；Codex Images 端点不接受，插件本地拒绝。 |

这里只有一个 `model`：图像模型。旧的 Responses carrier 已移除，不再从官方聊天模型选择推导任何字段。

## 请求与输出流程

1. `codex-supplement` base row 提供 `openaiCodexAuth` 与设置页；`codex-supplement-image` 行（`lib/media/index.js`）拥有生图启用标志、模型清单、显式默认模型、每个模型的 quality/complexity 缺省与输出目录设置。base 行上的旧媒体字段仍通过校验，但不再覆盖 image 行。
2. `lib/media/image-tool.js` 把请求的图像模型对照选定的允许清单解析；未选定的模型会被拒绝并列合法值。读取套餐并拒绝已知的 Free 账号。
3. `lib/media/adapters/openai-codex.js` 构造专有 Images 请求。生成与编辑分别发到 `/images/generations`、`/images/edits`；编辑把参考图写成 `images: [{image_url}]`。
4. adapter 解析 `data[].b64_json` 与顶层 `effective` 字段。执行/输出层保存图像字节，并通过工具结果与附件处理返回路径/元数据。
5. 试生图路由复用第 2–4 步，但不经过工具注册/工作区写入；它把 `requested`、`effective`、耗时与预览直接回给设置页。

外部行为由 `test/codex-carrier.test.mjs` 断言（Images 生成/编辑请求、403 文案、宿主字段拒绝），并由 `test/codex-images-integration.test.mjs` 用本地真实 HTTP mock 跑通“设置页请求 → 路由解析 → adapter → JSON 图片解析”的成功链路；允许清单/缺省解析由 `test/model-selection.test.mjs` 覆盖；面向用户的工具契约由 `test/image-tool-schema.test.mjs` 覆盖。

## 兼容性证据与边界

2026-11-09 的真实 ChatGPT Free 账号验证：

- `gpt-5.5` → 400（API-only，ChatGPT 账号不支持）
- `gpt-5.6-sol` → 400（Free 不支持 Sol）
- `gpt-5.6-terra` + hosted tool `auto` → 200，但响应只有内联 SVG，无 `image_generation_call`
- 强制 hosted `image_generation` → 400 `Tool choice 'image_generation' not found in 'tools' parameter`
- 专有 `POST /backend-api/codex/images/generations` → 403 Forbidden

结论：ChatGPT Free 不包含 Codex 生图，需要 Plus 或更高套餐。官方 Codex 定价页也明确把生图排除在 Free 之外。升级后，专有 Images 端点应接受选定的 2.6 模型与基础字段；2.6 的 `complexity`、SVG 等增强仍不在该 lane 的契约内。

目录有意允许语法合法的自定义 ID，以免新支持的 ID 被过时的本地 enum 挡住。这并不代表远程支持。如果端点拒绝请求的模型或格式，adapter 会上报响应状态与模型 ID；它绝不静默替换为其他模型。目录在 `lib/media/image-models.mjs`；请求构造与错误行为在 `lib/media/adapters/openai-codex.js`。

## 参考

- [包规格](../SPEC.md)
- [面向用户的包 README](../README.md)
- [图像生成工具 schema](../lib/media/image-tool-schema.mjs)
- [模型目录](../lib/media/image-models.mjs)
- [模型选择](../lib/media/model-selection.mjs)
- [工具执行](../lib/media/image-tool.js) 与[输出处理](../lib/media/image-output.mjs)
- [试生图请求解析](../lib/media/test-request.mjs)
- [Codex Images adapter](../lib/media/adapters/openai-codex.js)
- [carrier/Images 测试](../test/codex-carrier.test.mjs)
- Codex 源码：[`ImagesClient`](https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/endpoint/images.rs) 与 [`ImageGenerationRequest`](https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/images.rs)
