# Codex Supplement 规格

遵循统一规格模板（问题陈述 / 方案 / 用户故事 / 实现决策 / 测试决策 / 范围外 / 备注）。行为契约、决定与兼容性证据都在本文件内；源码与测试是行为事实，本文档滞后时以源码与测试为准。

## 问题陈述

在 DeepSeek Harness（dsh）环境中使用 ChatGPT/Codex 订阅的用户，官方 DSH 只覆盖 Codex 对话本身：账户侧登录、用量/额度、可选的网络搜索、按模型的 Fast Mode 与订阅生图能力缺失，并且这些能力原本散落在旧包（dsh-oauth、dsh-multimedia）中，无法在当前本地插件目录里统一维护。

## 方案

一个面向 dsh 本地插件目录的单体 bundle `@cningan/dsh-codex-supplement`，整合：Codex OAuth 登录/登出、订阅用量/额度、可选订阅搜索、按模型的 Fast Mode、订阅图像生成（Responses `image_generation`）。与官方 Codex 对话共用共享 credential record；图像模型按次由工具 `model` 参数从设置清单选取，官方 Codex 对话模型仅作为 Responses carrier，二者绝不混用。本包不发布到 npm。

## 用户故事

1. 作为 DSH 用户，我想在设置页用 Codex 账户登录/登出，以便使用订阅能力。
2. 作为 Codex 订阅用户，我想查看用量与额度，以便掌握配额消耗。
3. 作为 Codex 订阅用户，我想可选地启用 Codex 网络搜索，以便在对话中获得检索结果。
4. 作为多模型用户，我想按模型启用 Fast Mode，以便只对匹配的模型加速（service_tier: priority）。
5. 作为订阅生图用户，我想通过工具 `codex-generate-image` 生成/编辑图像，以便在会话中产出图像供后续查看。
6. 作为订阅生图用户，我想按调用选择图像模型（内置目录含 `gpt-image-2.5-flare` 快速档与 `gpt-image-2.5-sunburst` 高质量档），以便在速度与质量之间选择。
7. 作为订阅生图用户，我想设置请求级质量缺省并允许单次覆盖，以便控制输出档位。
8. 作为维护者，我想让工具拒绝允许清单外的模型并原文报告状态与模型 id，以便不被静默替换误导。
9. 作为维护者，我想让生成的图像写入当前会话工作区（缺省 `images/`）并通过 Host 附件机制交付，以便模型可查看而结果只含路径。
10. 作为维护者，我想让旧插件数据（凭据、Fast Mode/搜索状态、legacy 图像模型选择）能一次性迁移，以便平滑过渡且不把哨兵上送。
11. 作为维护者，我想让启用/关闭搜索只增删插件自己的带标记 Profile 块，以便不改动手写的 web override。
12. 作为维护者，我想让凭证、Profile 配置、会话与生成的媒体都不进入源码/包产物，以便仓库只含契约。

## 实现决策

- **单包组装**：账户功能与媒体功能合并为单一 bundle、单一 Host 行、单一生成的 Client Loader；没有确认的产品需求时不拆回两个包。
- **凭据共享**：主要来源为官方 credential record（`llm-pi-ai/openai-codex`），与官方 Codex 对话 provider 共用；旧 secret-store 凭据仅在记录缺失时一次性播种。凭据不进源码仓库。
- **数据位置**：账户元数据、Fast Mode 与搜索标志保存在插件自有数据目录；本地状态文件不进入包文件清单并被 Git 忽略。
- **搜索开关**：启用时向活动 Profile 的 `cordis.patch.yml` 写入带标记的 web override 以选择 `openai-codex`；关闭时只移除插件管理的带标记块（含可识别的旧 dsh-oauth 标记），手写 override 一律不动。这是刻意的 Profile 副作用，启用前需评估。
- **Fast Mode 注入**：对匹配的 Codex Responses 请求注入 `service_tier: priority`；注入是 fail-open——解析或改写失败时原请求继续，最多是不生效，不会阻塞对话。
- **图像工具注册**：仅当 `enableImageGeneration` 为 true 且至少选定一个图像模型时注册单一工具 `codex-generate-image`；`imageModels` 列表即 `model` 参数的允许清单，列表顺序即缺省；请求清单外的模型被拒绝并列出合法值。`enableImageGeneration` 缺省 false，`imageQuality` 缺省 `auto`，输出目录 `imageOutputDir` 缺省 `images`。
- **carrier / 图像模型 / 质量三分离**：顶层 Responses `model` 只取自官方 Codex 当前选择（选择不可用时用代码自带 fallback）；`image_generation.model` 只从本包允许清单取值；`quality` 是独立的请求级控件（可单次覆盖包缺省）。三者绝不互换、不互相推断。
- **质量档位**：GPT Image 1 / 1.5 / 2 最高到 `high`；只有 GPT Image 2.5 支持 `xhigh` / `max`。实现不静默降级、不本地拒绝未经证实的模型/质量组合；远程拒绝保持可见。
- **输出与附件**：图像字节经临时数据路径写入会话工作区（解析失败时如实报告，不谎称已保存）；工具结果返回文件路径与元数据，图像数据经 Host 附件机制投递供后续查看；附件保存失败仅记录日志，工作区文件仍可用。
- **迁移**：旧 `codex-managed-image` 哨兵仅在读取时一次性迁移，之后绝不上送；旧 `enableProviders` / `providerModelSelections` 仅保留用于一次性迁移；旧聊天模型列表不再读取，模型改在官方 `Models → OpenAI Codex` 项配置。
- **兼容性证据（带日期）**：2026-09-24 在真实订阅上以 `image_generation.model` 验证 `gpt-image-2.5-flare` 与 `gpt-image-2.5-sunburst` 各产出一张 PNG。订阅端点不发布公开 schema，因此这是受限证据：被拒绝时插件原文报告状态码与模型 id，绝不静默换用别的模型；不承诺未测试 ID 或未来网关版本。

## 测试决策

- **测试约定**：只测外部行为契约（工具 schema 形状、carrier/图像模型分离、允许清单/缺省解析、凭据映射、proxy 目标规则），不安装包、不读取 Profile 数据。
- **覆盖范围**：离线测试覆盖模型选择/缺省/迁移、carrier 分离、工具 schema 形态（单一名称、`model` enum、无已死的 `aspectRatio`）、credential 映射与 proxy 目标规则。
- **命令**：`npm test` 跑离线测试；`npm run check` 重建 Client 并做 Host/Client/脚本/测试的语法检查；`npm pack --dry-run` 只审阅发布文件清单，不发布。
- **验证边界**：Fast Mode 与旧凭据迁移未在真实 Profile 上验证；真实运行态验证必须单独做，不能以离线测试或设置自检代替。

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
