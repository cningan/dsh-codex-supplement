# 更新日志

## 0.7.1 — 发布文档修正与文档漂移检查

- 修正发布文档：首个版本用安全密钥的浏览器授权，不再建议 `--auth-type=legacy`；补充 npm 异步生效与 `0.0.0-stage` 占位、Trusted Publishing、推送 workflow 所需的 GitHub `workflow` scope。
- `npm run check` 新增文档漂移检查：禁止再写入「不发布到 npm」「没有原地升级 API」等过期结论，并拦截没有警告语境的 `--auth-type=legacy`。
- 本版本首次由 GitHub Actions 的 OIDC（Trusted Publishing）发布。

## 0.7.0 — 改用 DSH 原生更新检查

- 移除设置页底部的版本行、GitHub Releases 更新检查与 `GET /plugins/dsh-codex-supplement/update-check`：插件不再自己判断新版本，版本显示与「检查更新 / 更新」由 DSH 插件页原生负责。
- 包名改为无 scope 的 `dsh-codex-supplement`，以 `publishConfig.access: public` 发布到 npm。只有以 registry 包名安装的插件才能被原生更新识别并原地升级；GitHub Release 的 `.tgz` 继续作为离线/固定版本安装方式，但只能卸载重装。
- 安装身份变更：旧 profile 里 `@cningan/dsh-codex-supplement` 的 URL 依赖需要先卸载，再按新包名安装。插件数据目录随包目录变化，Fast Mode/搜索开关等本地状态不会自动迁移（账户与官方 credential record 不受影响）。

## 0.6.2 — macOS 系统代理与跨平台说明

- macOS 系统代理现在会被读取（`scutil --proxy`）：Windows 走注册表，macOS 走 SystemConfiguration，Linux 仍看环境变量。Clash 的混合端口即使显示为 SOCKS 也按 HTTP 使用。这修复了「能登录但请求 403 unsupported_country_region_territory」。
- 账户列表显示套餐徽标；Free 套餐在账号行直接标注「需 Plus 或更高」。
- 生图设置的能力请求加了 10 秒超时，宿主或代理卡住时不会再永远显示「检查中…」。
- 新增 [docs/cross-platform.md](docs/cross-platform.md)：localhost/IPv6、系统代理、路径大小写、文件权限、换行、端口冲突、PATH、字体与剪贴板的检查清单；README 增加 macOS 常见问题与 Release 安装建议。

## 0.6.1 — macOS 登录回调与关闭态开关

- 修复 macOS 上「官方页面已授权但插件收不到回调」：回调地址写的是 `localhost`，而服务器原先只绑定 `127.0.0.1`；macOS 的 `localhost` 优先解析到 `::1`，回调因此打不到插件。现在 loopback 同时监听 IPv4 与 IPv6（任一成功即可），并在会话里暴露实际回调地址。
- 回调端口被占用（`EADDRINUSE`）时给出可操作诊断，而不是只报一条英文错误。
- 授权中新增「没收到回调？手动粘贴」入口：即使本机回调被防火墙或端口冲突挡住，也能把浏览器地址栏的完整回调地址粘回来完成登录。
- 修复生图工具开关关闭态：轨道与背景同色导致开关看起来是空框，现在关闭态用可见的灰色轨道并为滑块加阴影。

## 0.6.0 — 插件版本显示与更新检查

- 设置页底部新增版本行与「检查更新」：读取 GitHub Releases 最新 tag 与本包 `package.json` 版本比较，有新版本时给出可安装的 `.tgz` 地址与复制按钮。
- 新版路由 `GET /plugins/dsh-codex-supplement/update-check`（`refresh=1` 绕过 60 秒缓存）；GitHub 不可达时降级为错误文本，不影响登录与生图。
- 明确一点：DSH 的 bundle 没有原地升级 API，更新只能「卸载 → 用新地址重装」；插件只提示，不替用户执行安装。

## 0.5.2 — 修复 Images JSON 响应解析并补成功链路测试

- 修复一个会直接导致付费账号“请求成功但无图片”的问题：专有 Images 端点返回普通 JSON，旧代码却按 Responses 的 SSE 流解析。现在 Images 请求单独走 `res.json()`。
- 新增真实本地 HTTP mock 集成测试，覆盖设置页请求字段 → 路由解析 → adapter → `/codex/images/generations` 请求 → `data[].b64_json` 图片与 `effective` 字段解析。
- 测试保留三类证据：成功 JSON、非 SSE 解析、403 套餐错误。

## 0.5.1 — 设置页文案与 Images lane 对齐

- 设置页不再显示 `complexity` 提示；副标题改为 Codex Images API，模型缺省只编辑 quality。
- 模型 profile 的 quality 选项裁剪为 auto/low/medium/high，GIF 参数仅在有 2.6 模型时出现。

## 0.5.0 — 使用 Codex Images 端点并明确 Free 限制

- 生成/编辑迁移到当前 Codex CLI 的 `POST /backend-api/codex/images/generations` 与 `/images/edits`；不再依赖会在 Codex 后端被剥离的 Responses hosted `image_generation` 工具。
- 真实账号验证：`gpt-5.5`、`gpt-5.6-sol` 被 400 拒绝；Terra 的 hosted tool 只返回 SVG；强制工具返回 400；专有 Images 端点在 Free 账号返回 403。结论：ChatGPT Free 不包含 Codex 生图，需要 Plus 或更高套餐。
- Free 预检保留；即使 usage 暂时取不到，Images 端点的 403 也会被翻译成套餐提示。
- `complexity`、`xhigh`/`max`、SVG/WebP/JPEG、遮罩、压缩等 hosted-tool 字段在该端点不支持，适配器明确拒绝而不是静默忽略。

## 0.4.9 — 迁移到 Codex Images 端点（探针）

- 生成/编辑改走专有 Codex Images 端点；本版用于真实端点验证，Free 预检暂时旁路。

## 0.4.8 — Free 套餐预检与明确提示

- ChatGPT Free 官方不提供 Codex 生图。实测该账号在 Terra carrier 上返回 200 但只生成内联 SVG；强制 `image_generation` 则得到 400“tool not found”。这不是 carrier 问题，而是套餐能力缺失。
- 试生图与工具在发请求前读取 `wham/usage.planType`；`free` 直接返回可操作错误，不再浪费一次远程请求。
- 设置页在 Free 套餐下显示提示并禁用“生成”按钮；`/capabilities` 增加 `planType`。

## 0.4.7 — 强制调用 image_generation

- `tool_choice` 从 `auto` 改为 `{ type: "image_generation" }`。实测 Terra carrier 已返回 200，但 `auto` 时模型会直接输出内联 SVG 文本，完全不调用托管的生图工具。

## 0.4.6 — 修正无图诊断的文本遍历

- 0.4.5 的文本收集漏了 `content` 数组，导致仍只显示“API 未返回图片”；已补上并加回归测试。

## 0.4.5 — 诊断“200 但无图片”

- 当 Responses 返回 200 但没有 `image_generation_call` 时，错误信息附带响应里的可读文本（最多 800 字符），用于区分“套餐不支持生图”“模型被拒”“服务端只回了说明文字”等情况；不再只显示“API 未返回图片”。

## 0.4.4 — 使用 Free/Go 可用的 Terra carrier

- 试生图仍报 400 时确认：Free 账号不接受 `gpt-5.6-sol`，但 ChatGPT Free/Go 提供 `gpt-5.6-terra`。顶层 Responses carrier 改为 `gpt-5.6-terra`，覆盖 Free/Go 与付费账号。

## 0.4.3 — 修复 ChatGPT 账号的 carrier 400

- 修复试生图 400：`The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account`。顶层 Responses carrier 不再读取官方聊天模型选择，改为插件固定 carrier；`gpt-5.5` 是 API-only 模型。
- 设置页新增自定义导航图标，生图卡片增加模型行边框、统一图标按钮与可滚动的错误框；插件图标重绘渐变与高光。
- 收紧试生图错误展示，长错误不再撑开整页。

## 0.4.2 — 每模型缺省与显示元数据校正

- 完成 per-model 配置链：`defaultImageModel` 显式默认、`imageModelDefaults[model]` 保存每个模型的 quality/complexity；工具、试生图与 `/capabilities` 共用同一解析，显式非法档位本地拒绝。
- 设置页模型行支持 ★ 设为默认与 ⚙ 编辑该模型缺省；试生图选项随所选模型变化。
- 补充 `icon.svg` / `locale` 的包文件与 JSON 校验；收敛生图文案，试生图高级参数默认折叠。
- 修正生图开关在模型变更后不刷新注册状态的问题。

## 0.4.1 — 开关、图标与文案收敛

- 修复设置页显示 2.6、运行时却被 base 行旧配置迁移成 2.5 的不一致：image 行不再接收旧媒体字段。旧字段仍通过 base 的 schema 校验，但不再覆盖 image 行默认值。
- 设置页顶部增加生图工具开关；关闭工具只需点开关，不必禁用 `codex-supplement-image` 组件行。
- 重做插件图标（`icon.svg`），补齐 `locale/en.json` / `locale/zh.json` 的 Plugin Manager 标题与描述。
- 收敛设置页文案：模型、质量/复杂度说明改为短标签，试生图的高级参数默认折叠；长说明移入 `title` 提示。

## 0.4.0 — 三层组件与设置页重组

- 按依赖拆成三行：`codex-supplement`（base，裸包名：OAuth/用量/Fast Mode/日志/设置页）、`codex-supplement-image`（生图 + 试生图）、`codex-supplement-search`（搜索 provider 与开关）。base 必须使用裸包名，因为 DSH `dsh-client-modules` 只对裸包名 row 发现 Client 模块。
- 搜索从 base 模块拆到 `search-feature.mjs`，开关改存 `data/search.json`（一次性读取旧 `data/fast-mode.json` 的 `searchEnabled`）；base 的 `/codex/status` 不再混入搜索状态，新增 `/codex/search/status`。
- 设置页重组为分区卡片：base 的账户/用量/搜索，image 的模型清单与试生图分开；新增组件行状态徽标与“搜索行未启用”提示。

## 0.3.0 — 组件化与 GPT Image 2.6

- 图像模型目录更新到 GPT Image 2.6：新增 `gpt-image-2.6-flare` / `gpt-image-2.6-sunburst`，保留 2.5 两档与带日期快照、2 / 1.5 / 1-mini / `chatgpt-image-latest`；`gpt-image-1` 仅作为已下线兼容项保留，出厂勾选改为 2.6 两档。
- 工具 schema 重设为扁平、与开放 API 对齐：`output_format` / `output_compression` / `complexity` / `mask` / `frames` / `frame_duration_ms` / `moderation` / `input_fidelity` / `partial_images`。`complexity`、gif/svg 与帧字段按已勾选模型的能力位裁剪。
- 请求链贯通 2.6 字段：adapter 转发 `complexity`、`frame_count`、`frame_duration_ms`，支持 gif/svg MIME 与落盘扩展名，并读取上游回传的 `effective`（model / size / quality / output_format / complexity / revised_prompt）。
- 设置页新增**试生图**面板与 `POST /plugins/dsh-codex-supplement/codex/test-image`：复用同一 adapter 与 carrier，显示上游状态、耗时、实际回传字段与内联预览；不写工作区、不注册工具、不要求生图开关已打开。每次点击消耗一张真实订阅图。
- 设置页新增 2.6 复杂度缺省、模型能力徽标、只载入 2.6 两档的按钮，并更新 OAuth lane 的忽略/拒绝提示。
- 2026-11-09 在隔离 DSH `0.2.2-rc.1` 复核：两个组件行激活，四条路由 200，启用生图后工具注册，Client 模块进入 Web boot entry。

## 0.2.0 — 图像模型选择

- 订阅图像工具不再绑定单一的托管引擎。官方 `image_generation` 工具确实声明了 `model` 字段，因此所配置的 `imageModels` 列表决定允许的内容（空 = 不注册工具），工具自身的 `model` 参数按次选择档位。
- 设置面是单一列表：每行一个模型，可添加/移除/手输 id，或载入内置目录。列表顺序即优先级，调用省略 `model` 时第一行是缺省；独立的缺省档选择器因与描述和 enum 重复而移除。
- 新增一个请求级质量缺省（`imageQuality`，出厂 `auto`），单次调用仍可覆盖。质量保持全局而非按模型，因为它是请求参数；参数描述现在也写明各模型的档位上限（1 / 1.5 / 2 最高到 `high`，只有 2.5 支持 `xhigh`/`max`）。
- 随包发布一个以两个 GPT Image 2.5 档位为核心的图像模型目录——`gpt-image-2.5-flare`（快速）与 `gpt-image-2.5-sunburst`（高质量）——外加其带日期的快照与上一代 id。
- 转发其余已文档化的工具面（`action`、`size`、`quality`、`background`、`output_compression`、`moderation`、`input_fidelity`、`partial_images`、`input_image_mask`），并停止把 Responses carrier 与图像模型混为一谈。
- 把两个工具名合并为单一 `codex-generate-image`；删除已死的 `aspectRatio` 参数与 `codex-managed-image` 哨兵。旧的 `enableProviders`/`providerModelSelections` 只读取一次用于迁移，绝不转发上游。
- 被拒绝的图像模型改为报告其 HTTP 状态与 id，而不是笼统的失败，并且绝不静默替换为其他模型。
- 把工具 schema 拆分为无依赖模块，使工具形态（单一名称、`model` enum、没有已死的 `aspectRatio`）可以由离线测试覆盖，而不只是在 Host 重启后靠检查验证。
- 已对照真实订阅验证（2026-09-24）：Codex 端点接受 `image_generation.model`；`gpt-image-2.5-flare` 与 `gpt-image-2.5-sunburst` 各通过 `codex-generate-image` 产出一张 PNG。

## 0.1.0 — Codex Supplement 整合

- 把 Codex OAuth、用量/额度、搜索、Fast Mode 与 Codex 订阅图像生成整合进单一 `@cningan/dsh-codex-supplement` bundle。
- 保留官方 Codex credential record 共享与旧凭据迁移。
- 将 Client 输出精简为一个以包名为前缀的 Loader 模块。
- 移除非 Codex OAuth provider、通用 API-key 图像 provider、视频生成与已退役的 Codex 聊天 adapter。
- 移除重复的 OAuth 页面模型编辑器/发现/路由；官方 OpenAI Codex provider 拥有目录及输入/输出能力。不要迁移旧插件自定义模型列表；请在官方 Models 页配置模型。
