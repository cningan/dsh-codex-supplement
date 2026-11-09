# Codex Supplement 规格

遵循统一规格模板（问题陈述 / 方案 / 用户故事 / 实现决策 / 测试决策 / 范围外 / 备注）。行为契约、决定与兼容性证据都在本文件内；源码与测试是行为事实，本文档滞后时以源码与测试为准。

## 问题陈述

在 DeepSeek Harness（dsh）环境中使用 ChatGPT/Codex 订阅的用户，官方 DSH 只覆盖 Codex 对话本身：账户侧登录、用量/额度、可选的网络搜索、按模型的 Fast Mode 与订阅生图能力缺失，并且这些能力原本散落在旧包（dsh-oauth、dsh-multimedia）中，无法在当前本地插件目录里统一维护。

## 方案

一个面向 dsh 本地插件目录的单包、三组件 bundle `@cningan/dsh-codex-supplement`：裸包名 row `codex-supplement` 是 base（Codex OAuth 登录/登出、订阅用量/额度、按模型 Fast Mode、日志与设置页），子路径 row `codex-supplement-image` 承载订阅图像生成，子路径 row `codex-supplement-search` 承载 Codex 搜索 provider。image/search 依赖 base 提供的 `openaiCodexAuth` 服务，但可独立启用/禁用。与官方 Codex 对话共用共享 credential record；图像模型按次由工具 `model` 参数从设置清单选取，官方 Codex 对话模型仅作为 Responses carrier，二者绝不混用。裸包名 row 是 DSH `dsh-client-modules` 的硬约束：Client 模块发现只接受裸包名，子路径 row 不会进入 Web boot graph。本包不发布到 npm。

## 用户故事

1. 作为 DSH 用户，我想在设置页用 Codex 账户登录/登出，以便使用订阅能力。
2. 作为 Codex 订阅用户，我想查看用量与额度，以便掌握配额消耗。
3. 作为 Codex 订阅用户，我想可选地启用 Codex 网络搜索，以便在对话中获得检索结果。
4. 作为多模型用户，我想按模型启用 Fast Mode，以便只对匹配的模型加速（service_tier: priority）。
5. 作为订阅生图用户，我想通过工具 `codex-generate-image` 生成/编辑图像，以便在会话中产出图像供后续查看。
6. 作为订阅生图用户，我想按调用选择图像模型（内置目录以 `gpt-image-2.6-flare` 快速档与 `gpt-image-2.6-sunburst` 高质量档为首，并保留 2.5 / 前代），以便在速度、质量与最新能力之间选择。
7. 作为订阅生图用户，我想设置请求级质量与 2.6 复杂度缺省并允许单次覆盖，以便控制输出档位与场景规划强度。
8. 作为订阅生图用户，我想在设置页点一次“试生图”，看到端点是否返图、实际回传的模型/尺寸与耗时，以便在 OAuth lane 静默忽略字段或用 400 拒绝 GIF 时不被误导。
9. 作为维护者，我想让工具拒绝允许清单外的模型并原文报告状态与模型 id，以便不被静默替换误导。
10. 作为维护者，我想让生成的图像写入当前会话工作区（缺省 `images/`）并通过 Host 附件机制交付，以便模型可查看而结果只含路径。
11. 作为维护者，我想把 Host 能力拆成 `codex-supplement`（base，裸包名）、`codex-supplement-image` 与 `codex-supplement-search` 三个组件行，以便按依赖分层启用：base 提供登录/用量/Fast Mode/设置页，image 与 search 分别依赖它。
12. 作为升级用户，我想让旧 profile 对 `codex-supplement` 的媒体配置继续生效，以便组件重排后不用手改 YAML。
12. 作为维护者，我想让旧插件数据（凭据、Fast Mode/搜索状态、legacy 图像模型选择）能一次性迁移，以便平滑过渡且不把哨兵上送。
13. 作为维护者，我想让启用/关闭搜索只增删插件自己的带标记 Profile 块，以便不改动手写的 web override。
14. 作为维护者，我想让凭证、Profile 配置、会话与生成的媒体都不进入源码/包产物，以便仓库只含契约。

## 实现决策

- **单包三组件**：`cordis.patch.yml` 插入 `codex-supplement`（裸包名 → `lib/index.js`，base）、`codex-supplement-image`（`./image`）与 `codex-supplement-search`（`./search`）。base 放裸包名 row 是刻意的：`dsh-client-modules` 的 `exactPackageSpecifier()` 只接受裸包名，子路径 row 的 Client 模块会被跳过，设置页随之消失。base 只提供 `openaiCodexAuth`、用量、Fast Mode、日志与 UI；image/search 各自注册自己的工具/路由，并声明依赖 base 的 `openaiCodexAuth`，因此 base 缺失时子组件不会挂载。
- **旧配置迁移**：base 的 Config 仍是完整媒体 schema，旧 profile 的 `imageModels` / `imageQuality` / `imageOutputDir` 等继续通过校验。base 把它们作为 `codexSupplementLegacyMedia` 服务暴露；image 行仅在自身字段仍为默认值时采用旧值，用户一旦在 image 行显式配置就以 image 行为准。
- **凭据共享**：主要来源为官方 credential record（`llm-pi-ai/openai-codex`），与官方 Codex 对话 provider 共用；旧 secret-store 凭据仅在记录缺失时一次性播种。凭据不进源码仓库。
- **数据位置**：账户元数据、Fast Mode 与搜索标志保存在插件自有数据目录；本地状态文件不进入包文件清单并被 Git 忽略。
- **搜索开关**：启用时向活动 Profile 的 `cordis.patch.yml` 写入带标记的 web override 以选择 `openai-codex`；关闭时只移除插件管理的带标记块（含可识别的旧 dsh-oauth 标记），手写 override 一律不动。这是刻意的 Profile 副作用，启用前需评估。
- **Fast Mode 注入**：对匹配的 Codex Responses 请求注入 `service_tier: priority`；注入是 fail-open——解析或改写失败时原请求继续，最多是不生效，不会阻塞对话。
- **图像工具注册**：仅当 `enableImageGeneration` 为 true 且至少选定一个图像模型时注册单一工具 `codex-generate-image`；`imageModels` 列表即 `model` 参数的允许清单，列表顺序即缺省；请求清单外的模型被拒绝并列出合法值。`enableImageGeneration` 缺省 false，`imageQuality` 缺省 `auto`，`imageComplexity` 缺省空串（= 模型默认），输出目录 `imageOutputDir` 缺省 `images`。
- **工具 schema 扁平且与开放 API 对齐**：参数为 `prompt`、`model`、`image`、`mask`、`size`、`quality`、`complexity`、`background`、`action`、`output_format`、`output_compression`、`moderation`、`input_fidelity`、`partial_images`，2.6 GIF 再加 `frames` / `frame_duration_ms`。不做嵌套分组：模型调用工具时层级/必填放错是最常见的失败，官方字段本身就是扁平集合。能力位按已勾选模型裁剪：没有 2.6 模型时 `complexity` / `frames` / `frame_duration_ms` 不出现，`output_format` 只到 png/jpeg/webp；有 2.6 时才出现 gif/svg。
- **2.6 能力目录**：目录以 `gpt-image-2.6-flare` / `gpt-image-2.6-sunburst` 为首，保留 2.5 两档与带日期快照、2 / 1.5 / 1-mini / `chatgpt-image-latest`；`gpt-image-1` 仅作为已下线兼容项保留，不再进入出厂勾选。目录只声明“允许工具选什么”，不承诺 OAuth 网关接受；未知但语法合法的 id 仍可自填。
- **carrier / 图像模型 / 质量与复杂度分离**：顶层 Responses `model` 只取自官方 Codex 当前选择（选择不可用时用代码自带 fallback）；`image_generation.model` 只从本包允许清单取值；`quality` 与 `complexity` 是独立的请求级控件（可单次覆盖包缺省）。四者绝不互换、不互相推断。
- **质量与复杂度档位**：GPT Image 1 / 1.5 / 2 最高到 `high`；只有 GPT Image 2.5 支持 `xhigh` / `max`；2.6 把场景规划拆到 `complexity`（low / medium / high），与渲染质量解耦。实现不静默降级、不本地拒绝未经证实的组合；远程拒绝保持可见。
- **输出与附件**：图像字节经临时数据路径写入会话工作区（解析失败时如实报告，不谎称已保存）；工具结果返回文件路径与元数据，图像数据经 Host 附件机制投递供后续查看；附件保存失败仅记录日志，工作区文件仍可用。落盘扩展名覆盖 png / jpg / webp / gif / svg。
- **试生图路由**：`POST /plugins/dsh-codex-supplement/codex/test-image`（origin 校验、256 KiB body 上限）接受 `prompt` 与可选的 model / quality / complexity / size / output_format / frames / frame_duration_ms 等字段，复用同一 adapter 与当前 carrier，返回 `{ok, ms, requested, effective, carrier, images}`。成功时 `images[]` 含 `{mediaType, bytes, dataUrl?}`（超过 3 MiB 不回传 dataUrl），失败时返回 `{ok:false, ms, error}`。它不写工作区、不注册工具，也不要求 `enableImageGeneration` 已打开——诊断应能在启用前做。每次点击会真实消耗一张订阅图。
- **迁移**：旧 `codex-managed-image` 哨兵仅在读取时一次性迁移，之后绝不上送；旧 `enableProviders` / `providerModelSelections` 仅保留用于一次性迁移；旧聊天模型列表不再读取，模型改在官方 `Models → OpenAI Codex` 项配置。旧 profile 的媒体配置因 row id 未变而原位保留。
- **兼容性证据（带日期）**：2026-09-24 在真实订阅上以 `image_generation.model` 验证 `gpt-image-2.5-flare` 与 `gpt-image-2.5-sunburst` 各产出一张 PNG。2026-11-06 的独立报告（openai/codex#59890）显示 OAuth `/backend-api/codex/images/*` 会忽略 `model` / `complexity` / `size` / SVG，并以 400 拒绝 GIF；本包走 Responses hosted-tool lane，不能假定免疫，因此试生图原样回显上游结果。订阅端点不发布公开 schema，因此这是受限证据：被拒绝时插件原文报告状态码与模型 id，绝不静默换用别的模型。
- **0.2.2 复核（2026-11-09）**：在隔离的 DSH `0.2.2-rc.1` 运行时装载本包，三个组件行均正常激活；base 的 `/codex/status`、`/codex/usage`、`/codex/fast-mode`，search 的 `/codex/search/status`、`/codex/search`，image 的 `/capabilities` 与 `POST /codex/test-image` 均返回 200；启用 image 配置后 `registeredTools` 为 `['codex-generate-image']`；Client 模块以裸包名 boot entry 出现在 `window.__DSH_BOOT__`。该证据覆盖组装、加载、工具注册与路由，不覆盖完整桌面 UI 会话或真实订阅调用。

## 测试决策

- **测试约定**：只测外部行为契约（工具 schema 形状、carrier/图像模型分离、允许清单/缺省解析、凭据映射、proxy 目标规则），不安装包、不读取 Profile 数据。
- **覆盖范围**：离线测试覆盖模型选择/缺省/迁移、carrier 分离、图像目录与能力位、工具 schema 形态（单一名称、`model` enum、2.6 参数按能力裁剪、没有已死的 `aspectRatio`）、试生图请求解析与预览上限、搜索开关的旧文件迁移、credential 映射与 proxy 目标规则。
- **命令**：`npm test` 跑离线测试；`npm run check` 重建 Client 并做 Host/Client/脚本/测试的语法检查；`npm pack --dry-run` 只审阅发布文件清单，不发布。
- **验证边界**：Fast Mode、旧凭据迁移与真实订阅生图未在普通测试中验证；真实运行态验证必须单独做，不能以离线测试或设置自检代替。

## 范围外

- 非 Codex 的 OAuth provider（Grok、Claude、Antigravity）及各 provider 专属 adapter。
- 通用 API-key 图像 provider/目录（OpenAI API、Gemini、DashScope、Volcengine、MiniMax 等）与视频生成。
- 通用 provider-registry / LLM-adapter 框架；官方 DSH Codex 仍是聊天实现。
- 重复的 Codex 聊天模型发现、模型编辑器、插件自有的聊天模型列表与模型列表路由（归官方 `openai-codex` provider）。
- 第二个图像工具名 `media-image-codex` 与 `codex-managed-image` 哨兵；已过时的 `aspectRatio` 参数。
- npm 发布、多包部署辅助脚本及其改动 Profile 的测试。
- 聊天模型的能力管理（官方 Models 页负责）。

## 备注

- 维护入口：README（中英双语）、CONTEXT.md（词汇表）、docs/adr/（决定记录）、CHANGELOG.md（发布史）、docs/image-generation.md（生图流程细节）、docs/release.md（交接规则）。
- 修改订阅生图请求字段、模型选择或兼容性声明的任何改动前，先读上述对应文档；当契约或职责变化时更新本文件。
- 上游收敛触发器：若官方 DSH Codex provider 已提供 GUI 授权与 service_tier fallback，应优先退役本包对应路径，而不是维持重复所有权。
- 运行期 Profile 配置、凭据、会话、生成的图像与插件数据都不是源码产物，不提交。
