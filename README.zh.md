# Codex Supplement

> [English](README.md) | 简体中文

一个面向 DeepSeek Harness（`dsh`）的单体插件包，把原 `dsh-oauth` 与 `dsh-multimedia` 中需要保留的 Codex 能力合并到 **`@local/dsh-codex-supplement`**。

## 功能

- ChatGPT/Codex OAuth 登录与退出，共用 DSH 官方 `llm-pi-ai/openai-codex` credential record；保留旧 Codex secret store 的一次性迁移。
- Codex 订阅用量/额度展示、可选 Codex 网络搜索，以及按模型启用的 Fast Mode。
- 通过 Responses `image_generation` 使用 Codex 订阅生图。图像模型由工具 `model` 参数逐次指定（内置目录含 GPT Image 2.5 的 `gpt-image-2.5-flare` 快速档与 `gpt-image-2.5-sunburst` 高质量档）。官方 Codex 对话模型仅作为 Responses carrier，两者不再混用。图片默认写入当前会话工作区的 `images/`，并附加到会话供模型后续查看。
- 一个 Host 插件行、一个 Client Loader 模块：`@local/dsh-codex-supplement`。

不包含 Grok、Claude、Antigravity、API-key 图片适配器或视频生成。

## 使用方式

打开 **设置 → Codex 订阅**，即可登录、启用 Codex 搜索、查看用量/额度并配置订阅生图。生图区是一行一个模型的清单：可增行、删行、自填 id，或载入内置目录。清单即工具 `model` 参数的合法取值；顺序即优先级，第一行是不传 `model` 时的缺省档。清单为空则不注册生图工具。普通对话模型及其输入/输出能力只在官方 **Models → OpenAI Codex** 项中管理。在 Codex 对话中，输入框工具栏提供额度入口与 Fast Mode 开关。

## 兼容性与安装

- 基线：DSH `0.1.7-rc.1`；Node.js 22 或更新版本。
- 这是供 DSH 本地插件目录加载的 `@local` bundle。`package.json` 声明 bundle patch 和合并后的 Web Client 模块。审阅源码后，通过 DSH bundle/plugin manager 安装；修改包文件后可能需要重启 Host。此包不发布到 npm。
- 不发布到 npm。GitHub 源码历史与之前 OAuth 仓库的历史分离，以免携带被 GitHub push protection 拒绝的未清理旧提交。

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
- 生图工具只有一个：`codex-generate-image`。它的 `model` 参数从设置页清单取值，缺省用清单第一项；请求清单外的模型会被拒绝并列出合法值。旧配置里的 `codex-managed-image` 选择在读取时一次性迁移，该哨兵绝不会再发给上游。
- **已在真实订阅上实证（2026-09-24）**：订阅端点**接受** `image_generation.model`——`gpt-image-2.5-flare` 与 `gpt-image-2.5-sunburst` 各通过工具出图一次。但端点仍无公开 schema（官方契约取自 API-key SDK），将来收紧仍有可能：被拒绝时插件原样报出状态码与模型 id，**不会静默换用别的模型**。
- 旧插件数据不会自动复制；移除旧插件目录前，应先将数据保存在活动插件目录之外。本包不发布 npm。

架构见 [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md)，安全说明见 [SECURITY.md](SECURITY.md)，开发与发布边界见 [docs/release.md](docs/release.md)。
