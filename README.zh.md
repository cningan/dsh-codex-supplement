# Codex Supplement

> [English](README.md) | 简体中文

一个面向 DeepSeek Harness（`dsh`）的单体插件包，把原 `dsh-oauth` 与 `dsh-multimedia` 中需要保留的 Codex 能力合并到 **`@cningan/dsh-codex-supplement`**。

## 功能

- ChatGPT/Codex OAuth 登录与退出，共用 DSH 官方 `llm-pi-ai/openai-codex` credential record；保留旧 Codex secret store 的一次性迁移。
- Codex 订阅用量/额度展示、可选 Codex 网络搜索，以及按模型启用的 Fast Mode。
- 通过 Responses `image_generation` 使用 Codex 订阅生图。图像模型由工具 `model` 参数逐次指定；内置目录以 GPT Image 2.6 Flare / Sunburst 为首，随后是 2.5（含带日期快照）与前代 id。2.6 增加规划复杂度 `complexity`、GIF/SVG 输出、遮罩与帧控制，工具 schema 会按已勾选模型的能力位裁剪。官方 Codex 对话模型仅作为 Responses carrier，两者不再混用。图片默认写入当前会话工作区的 `images/`，并附加到会话供模型后续查看。
- 一个包、三个组件行：裸包名 `codex-supplement` 是 base（OAuth 登录、用量、Fast Mode、日志与合并后的 Client 设置页）；`codex-supplement-image` 承载生图工具与试生图路由；`codex-supplement-search` 承载 Codex 搜索 provider。base 必须用裸包名，因为 `dsh-client-modules` 只对裸包名 row 发现 Client 模块；image/search 行依赖 base 提供的 `openaiCodexAuth` 服务。

不包含 Grok、Claude、Antigravity、API-key 图片适配器或视频生成。

## 使用方式

打开 **设置 → Codex 订阅**，页面现在按依赖分成清晰的卡片：账户（登录/设备码/账户列表）、用量额度、联网搜索（独立搜索组件行的状态与开关），以及下方的生图卡片（模型清单、质量/复杂度缺省、试生图）。生图区是一行一个模型的清单：可增行、删行、自填 id，或载入内置目录（全部候选，或只载入 2.6 两档）。清单即工具 `model` 参数的合法取值；顺序即优先级，第一行是不传 `model` 时的缺省档。清单为空则不注册生图工具。同一区还有请求级的**质量**与（2.6）**复杂度**缺省，单次调用仍可覆盖；`xhigh`/`max` 只有 GPT Image 2.5 支持，`1` / `1.5` / `2` 最高到 `high`。普通对话模型及其输入/输出能力只在官方 **Models → OpenAI Codex** 项中管理。

同一区还有**试生图**面板：用同一个 adapter 发一次最小请求（不写工作区、不注册工具），显示上游状态、耗时、端点实际回传的字段与内联预览。每次点击会真实消耗一张订阅图。Codex OAuth lane 在部分构建上会忽略 `model` / `size` / `complexity`，并拒绝 `gif`/`svg`；试生图就是用来实测你这版端点到底接受什么，而不是只相信开放 API 的 schema。

## 兼容性与安装

- 基线：支持 bundle/组件行的 DSH `0.2.x`；Node.js 22 或更新版本。
- 2026-11-09 在隔离的 DSH `0.2.2-rc.1` 运行时复核：三个组件行都正常挂载，`/codex/status`、`/codex/usage`、`/codex/fast-mode`、`/codex/search/status`、`/capabilities` 与 `POST /codex/test-image` 均可用，启用生图后工具完成注册，生成的 Client 模块出现在 Web boot entry 中。旧 profile 对 `codex-supplement` 的 `imageModels` / `imageQuality` / `imageOutputDir` 覆盖会由 base 行接住，并作为 image 行的迁移默认值，无需手改 YAML。
- 这是供 DSH 本地插件目录加载的 `@cningan` bundle。`package.json` 声明 bundle patch（两行）和合并后的 Web Client 模块。审阅源码后，通过 DSH bundle/plugin manager 安装；修改包文件后可能需要重启 Host。此包不发布到 npm。
- GitHub 源码历史与之前 OAuth 仓库的历史分离，以免携带被 GitHub push protection 拒绝的未清理旧提交。

## 构建与测试

单元测试和语法检查不需要安装第三方依赖：

```sh
npm run check
npm test
npm pack --dry-run
```

`npm run check` 会从 `src/client/` 重建 `lib/client.js`，并检查 Host、Client、构建脚本和测试的 JavaScript 语法。`npm pack --dry-run` 仅用于审阅发布文件清单，不会发布。

## 行为与数据说明

- 启用 Codex 搜索会把 DSH `web` provider 切换为 `openai-codex`，方式是在活动 Profile 的 `cordis.patch.yml` 写入带标记的块。关闭时只移除插件管理的标记块，不改动手写的 `web` override。启用前请先确认这一副作用符合预期。
- 官方 Codex credential record 与旧 token 的一次性迁移保留。Fast Mode/搜索状态仍保存在插件自己的 `data/` 目录，不会从旧插件自动迁移。旧的自定义模型清单不再读取；请在官方 **Models → OpenAI Codex** 项配置模型。
- 生图工具只有一个：`codex-generate-image`。参数与开放 API 的 `image_generation` 字段一一对应：`prompt`、`model`、`image`、`mask`、`size`、`quality`、`complexity`、`background`、`action`、`output_format`、`output_compression`、`moderation`、`input_fidelity`、`partial_images`，以及 2.6 GIF 用的 `frames` / `frame_duration_ms`。当没有任何已勾选模型声明对应能力时，`complexity` / `gif` / `svg` / 帧字段会从工具 schema 中消失。它的 `model` 参数从设置页清单取值，缺省用清单第一项；请求清单外的模型会被拒绝并列出合法值。旧配置里的 `codex-managed-image` 选择在读取时一次性迁移，该哨兵绝不会再发给上游。
- **已在真实订阅上实证（2026-09-24）**：订阅端点接受 `image_generation.model`——`gpt-image-2.5-flare` 与 `gpt-image-2.5-sunburst` 各通过工具出图一次。**独立证据（2026-11-06，openai/codex#59890）**：OAuth `/backend-api/codex/images/*` lane 会忽略 `model` / `complexity` / `size` 与 SVG 格式，并以 400 拒绝 GIF。本包走 Responses hosted-tool lane，行为可能相同；试生图会如实显示结果，被拒绝时原样报出状态码与模型 id，**不会静默换用别的模型**。
- 旧插件数据不会自动复制；移除旧插件目录前，应先将数据保存在活动插件目录之外。本包不发布 npm。

修改订阅生图请求字段、模型选择或兼容性判断前，请先读[插件规格](SPEC.md)、[image-generation architecture note](docs/image-generation.md) 和 [ADR 0001](docs/adr/0001-separate-responses-carrier-from-image-model.md)。

当前行为契约见 [SPEC.md](SPEC.md)；安全说明见 [SECURITY.md](SECURITY.md)，开发与发布边界见 [docs/release.md](docs/release.md)。
