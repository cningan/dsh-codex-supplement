# Codex Supplement

> [English](README.md) | 简体中文

一个面向 DeepSeek Harness（`dsh`）的单体插件包，把原 `dsh-oauth` 与 `dsh-multimedia` 中需要保留的 Codex 能力合并到 **`@local/dsh-codex-supplement`**。

## 功能

- ChatGPT/Codex OAuth 登录与退出，共用 DSH 官方 `llm-pi-ai/openai-codex` credential record；保留旧 Codex secret store 的一次性迁移。
- Codex 订阅用量/额度展示、可选 Codex 网络搜索，以及按模型启用的 Fast Mode。
- 通过 Responses `image_generation` 使用 Codex 订阅生图。官方 Codex 模型仅作为 Responses carrier；不会把 GPT Image ID 当作 carrier model。图片默认写入当前会话工作区的 `images/`，并附加到会话供模型后续查看。
- 一个 Host 插件行、一个 Client Loader 模块：`@local/dsh-codex-supplement`。

不包含 Grok、Claude、Antigravity、API-key 图片适配器或视频生成。

## 使用方式

打开 **设置 → Codex 订阅登录** 完成授权并管理搜索/模型列表。在 Codex 对话中，输入框工具栏提供额度入口与 Fast Mode 开关。打开 **设置 → Codex 订阅生图**，启用图片工具并选择订阅管理的图像引擎。

## 兼容性与安装

- 基线：DSH `0.1.7-rc.1`；Node.js 22 或更新版本。
- 这是供 DSH 本地插件目录加载的 `@local` bundle。`package.json` 声明 bundle patch 和合并后的 Web Client 模块。审阅源码后，通过 DSH bundle/plugin manager 安装。本次开发没有安装到或改动任何活动 Profile。
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
- 官方 Codex credential record 与旧 token 的一次性迁移保留。Fast Mode/搜索状态和自定义模型目录等插件数据保存在插件自己的 `data/` 目录；换到新插件目录时本版本不会自动迁移这些文件。按需重新启用 Fast Mode/搜索；依赖自定义模型列表的用户需要另行审慎迁移。
- 本次工作没有改动活动 Profile、重启 Host 或发布 npm 包。

架构见 [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md)，安全说明见 [SECURITY.md](SECURITY.md)，开发与发布边界见 [docs/release.md](docs/release.md)。
