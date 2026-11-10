# Codex Supplement

> [English](README.md) | 简体中文

一个面向 DeepSeek Harness（`dsh`）的单体插件包，把原 `dsh-oauth` 与 `dsh-multimedia` 中需要保留的 Codex 能力合并到 **`dsh-codex-supplement`**。发布在 npm registry；安装了它的 profile 由 DSH 插件页原生负责版本显示与更新。

## 功能

- ChatGPT/Codex OAuth 登录与退出，共用 DSH 官方 `llm-pi-ai/openai-codex` credential record；保留旧 Codex secret store 的一次性迁移。
- Codex 订阅用量/额度展示、可选 Codex 网络搜索，以及按模型启用的 Fast Mode。
- 通过 Codex 专有的 Images 端点（`/backend-api/codex/images/generations` 与 `/images/edits`）使用订阅生图。图像模型由工具 `model` 参数逐次指定；内置目录以 GPT Image 2.6 Flare / Sunburst 为首，随后是 2.5（含带日期快照）与前代 id。Codex OAuth 通道接受 `model` / `size` / `quality` / `background` 与 PNG/GIF；`complexity`、`xhigh`/`max`、SVG/WebP/JPEG 与遮罩只属于开放 API。ChatGPT Free 会被端点以 HTTP 403 拒绝；缓存到套餐信息时插件会提前拦截。图片默认写入当前会话工作区的 `images/`，并附加到会话供模型后续查看。
- 一个包、三个组件行：裸包名 `codex-supplement` 是 base（OAuth 登录、用量、Fast Mode、日志与合并后的 Client 设置页）；`codex-supplement-image` 承载生图工具与试生图路由；`codex-supplement-search` 承载 Codex 搜索 provider。base 必须用裸包名，因为 `dsh-client-modules` 只对裸包名 row 发现 Client 模块；image/search 行依赖 base 提供的 `openaiCodexAuth` 服务。

不包含 Grok、Claude、Antigravity、API-key 图片适配器或视频生成。

## 使用方式

打开 **设置 → Codex 订阅**，页面现在按依赖分成清晰的卡片：账户（登录/设备码/账户列表）、用量额度、联网搜索（独立搜索组件行的状态与开关），以及生图卡片。生图卡包含工具开关、一行一个模型的清单与试生图：可增行、删行、自填 id；★ 设为显式默认模型；⚙ 编辑该模型自己的 quality / complexity 缺省。清单顺序只影响展示，空清单不注册工具。quality 选项与缺省跟随所选模型：2.5 可到 `xhigh`/`max`，1 / 1.5 / 2 与 2.6 最高 `high`；2.6 才有 complexity。试生图使用同一套按模型解析。普通对话模型及其输入/输出能力只在官方 **Models → OpenAI Codex** 项中管理。

同一区还有**试生图**面板：用同一个 adapter 发一次最小请求（不写工作区、不注册工具），显示上游状态、耗时、端点实际回传的字段与内联预览。每次点击会真实消耗一张订阅图。Codex OAuth lane 在部分构建上会忽略 `model` / `size` / `complexity`，并拒绝 `gif`/`svg`；试生图就是用来实测你这版端点到底接受什么，而不是只相信开放 API 的 schema。

## 兼容性与安装

- 基线：支持 bundle/组件行的 DSH `0.2.x`；Node.js 22 或更新版本。
- 安装地址用 npm 包名 `dsh-codex-supplement`（插件管理器「添加插件」里填包名）。只有以 registry 包名安装、且 Profile 依赖保存为 registry spec 时，插件页的「检查更新 / 更新」才会识别并原地升级。
- GitHub Release 的 `.tgz` 仍可用于离线或固定版本安装，但 URL 安装不参与原生更新检查，只能卸载重装。不要用 `github:` 简写：它要求本机有 git（macOS 需要 Xcode Command Line Tools），且容易因 GitHub 连接抖动超时。
- 更新走 DSH 插件页：每行显示已安装版本，有更新时按钮变为「更新到 x.y.z」；更新会先移除旧版再安装同名精确版本，未启用 HMR 时提示重启后生效。插件不再自带设置页更新检查。
- 2026-11-09 在隔离的 DSH `0.2.2-rc.1` 运行时复核：三个组件行都正常挂载，`/codex/status`、`/codex/usage`、`/codex/fast-mode`、`/codex/search/status`、`/capabilities` 与 `POST /codex/test-image` 均可用，启用生图后工具完成注册，生成的 Client 模块出现在 Web boot entry 中。设置页绑定 `codex-supplement-image` 行；base 行上的旧媒体字段仍通过校验以兼容旧 profile，但不再覆盖 image 行当前的 GPT Image 2.6 默认值。
- 这是供 DSH 本地插件目录加载的 bundle，发布在 npm registry。`package.json` 声明 bundle patch（三行）和合并后的 Web Client 模块。审阅源码后，通过 DSH bundle/plugin manager 安装；修改包文件后可能需要重启 Host。
- GitHub 源码历史与之前 OAuth 仓库的历史分离，以免携带被 GitHub push protection 拒绝的未清理旧提交。

## macOS 常见问题

- **登录页显示授权成功，但插件一直停在「授权中」**：macOS 的 `localhost` 优先解析到 IPv6 `::1`。0.6.1 起回调服务器同时监听 `127.0.0.1` 与 `::1`；若仍失败，点「没收到回调？手动粘贴」，把浏览器地址栏里 `localhost:1455/auth/callback?code=...&state=...` 整条粘进去提交即可完成登录。
- **回调端口被占用**：官方 Codex CLI 也可能占用 `1455`。关掉占用该端口的程序后重试，或直接用手动粘贴方式。
- **能登录但请求 403 `unsupported_country_region_territory`**：Node 不读系统代理。0.6.2 起会自动读取 macOS 系统代理（`scutil --proxy`）；如果你用的是 Clash 的「混合端口」，SOCKS 配置也会按 HTTP 使用。
- **不要用 `github:` 简写安装**：它需要本机 git，而 macOS 默认没有 Command Line Tools（会报 `xcode-select`）。用 npm 包名安装；离线场景再用 Release 的 `.tgz` 地址。

通用跨平台注意事项（路径、权限、换行、字体、剪贴板等）见 [docs/cross-platform.md](docs/cross-platform.md)。

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
- 生图工具只有一个：`codex-generate-image`。参数与 Codex Images 端点一致：`prompt`、`model`、`image`（编辑）、`size`、`quality`、`background`、`action`、`output_format`（png/gif，gif 仅 2.6），以及 GIF 用的 `frames` / `frame_duration_ms`。`complexity`、`xhigh`/`max`、SVG/WebP/JPEG、遮罩与压缩不被该 lane 接受，已从 schema 移除。它的 `model` 参数从设置页清单取值，缺省用显式默认模型；请求清单外的模型，或当前 lane 不支持的 quality/format，会被拒绝并列出合法值。旧配置里的 `codex-managed-image` 选择在读取时一次性迁移，该哨兵绝不会再发给上游。
- **已在真实账号上验证（2026-11-09）**：`gpt-5.5` 与 `gpt-5.6-sol` 返回 400；Terra 走旧 hosted tool 返回 200 但只有内联 SVG；强制工具返回 400；专有 Codex Images 端点在 ChatGPT Free 返回 403。Free 不包含 Codex 生图。付费套餐下，专有端点接受所选图像模型与上述字段。试生图会如实显示状态与错误，**不会静默换用别的模型**。
- 旧插件数据不会自动复制；移除旧插件目录前，应先将数据保存在活动插件目录之外。包以 `dsh-codex-supplement` 发布在 npm。

修改订阅生图请求字段、模型选择或兼容性判断前，请先读[插件规格](SPEC.md)、[image-generation architecture note](docs/image-generation.md) 和 [ADR 0002](docs/adr/0002-use-codex-images-endpoints.md)。

当前行为契约见 [SPEC.md](SPEC.md)；安全说明见 [SECURITY.md](SECURITY.md)，开发与发布边界见 [docs/release.md](docs/release.md)。

