# Codex Supplement 规格与代码地图

本文件是包的权威当前规格与源码导航地图，记录受支持的产品面、用户可见契约、重要边界以及各实现文件的职责。当本文档滞后于源码与测试时，以源码与测试为准。当这些职责或契约变化时，请更新本文件；发布编年史见 [CHANGELOG.md](CHANGELOG.md)。

## 目的与范围

Codex Supplement 是 DeepSeek Harness 的一个本地 bundle，包身份为 @cningan/dsh-codex-supplement。它整合了 ChatGPT/Codex OAuth 登录、订阅用量/额度、可选的订阅网络搜索、按模型启用的 Fast Mode，以及 Codex 订阅图像生成。它由原 dsh-oauth 与 dsh-multimedia 两个包合并而来；发布记录见 [CHANGELOG.md](CHANGELOG.md)。

官方 DSH 的 openai-codex provider 负责 Codex 聊天执行、聊天模型 ID 以及输入/输出/上下文能力。本包补充与之相邻的账户与订阅功能；它不注册 chat-completions adapter，也不维护另一套聊天模型目录。本包面向 DSH 本地插件目录，目标基线为 DSH 0.1.7-rc.1、Node.js 22+，且不发布到 npm。安装与维护命令见 [README.md](README.md)，安全策略见 [SECURITY.md](SECURITY.md)。

范围之外的是非 Codex 的 OAuth provider、API-key 图像适配器与视频生成。明确的移除面回归清单见下文。

## 包组成与集成

- [package.json](package.json) 声明一个包、其 Host 项、合并后的 Web Client 导出、可选的 DSH peer 依赖以及 bundle patch。[cordis.patch.yml](cordis.patch.yml) 插入一行 codex-supplement，配置为空。
- [lib/index.js](lib/index.js) 先组装 Codex OAuth Host 功能，再组装图像功能，导出媒体 Config，并合并它们所需的 Host 注入。[lib/oauth.js](lib/oauth.js) 安装 Codex Host 集成，并在配置后安装 OpenAI proxy 钩子。
- [lib/media/index.js](lib/media/index.js) 负责图像设置 schema、能力路由与实时图像工具注册。易变配置变化时会对工具进行对账。
- [src/client/oauth.js](src/client/oauth.js) 与 [src/client/media.js](src/client/media.js) 是保留的 Client 源。[scripts/build-client.mjs](scripts/build-client.mjs) 将它们的工厂合并进单一生成的 [lib/client.js](lib/client.js) Loader 项。生成的 bundle 直接入库；npm run check 与 prepack 会重建它。

合并后的 Client 使用 Loader 身份 @cningan/dsh-codex-supplement，有一个 id 为 @cningan/dsh-codex-supplement-settings 的设置区块，以及以包名为前缀的 Fast Mode/额度插槽 id。设置区块把登录/账户控件与订阅图像控件合并；设置外壳当前提供通用齿轮图标。普通聊天模型配置仍保留在官方 Models → OpenAI Codex 项中。

## 可观察行为与契约

### 登录、用量、搜索与 Fast Mode

Codex 设置卡片提供登录/登出、浏览器与设备码授权状态、账户展示、额度/用量、可选搜索与 Fast Mode 控件。对话输入工具栏仅在 Codex 对话中暴露额度与 Fast Mode 控件。Client 同时识别旧的 codex 路由键与官方 openai-codex provider 键用于显示；Fast Mode 请求注入器则单独瞄准官方 Codex Responses 端点与已启用的模型 ID。

Host 路由位于 /plugins/dsh-codex-supplement/codex/ 下：status、login、login-device、poll、submit-code、cancel、logout、usage、search 与 fast-mode。媒体能力/状态路由为 /plugins/dsh-codex-supplement/capabilities。这些是插件的 Host 路由，不是对外公开的 API 承诺。

主要凭据来源是官方 DSH credential record llm-pi-ai/openai-codex，与官方 Codex 对话 provider 共用。旧的 secret-store 凭据可在该记录缺失时一次性为其播种；凭据不存放在本源码仓库中。账户元数据保留在原有位置 oauth-login/codex-accounts.json，而 Fast Mode 与搜索标志存储在插件数据目录下的 data/fast-mode.json。data/fast-mode.json 是本地状态，被 Git 忽略并从包允许清单中排除；迁移活动插件数据目录时请单独携带。

启用 Codex 搜索会注册可选的 Codex 搜索 provider，并向活动 Profile 的 cordis.patch.yml 写入一段带标记的 web override 以选择 openai-codex。关闭该功能只移除插件管理的带标记块（包括可识别的旧 dsh-oauth 标记）；未标记、手写的 web override 保持原样。这是刻意的 Profile 副作用，启用该设置前应先行评估。

Fast Mode 按模型跟踪。对于匹配的 Codex Responses 请求，Host 通过 fetch/proxy 路径注入 service_tier: priority。注入是 fail-open 的：若其解析或修改路径失败，原始请求继续执行；此时 Fast Mode 可能不生效，但不会阻塞对话。

### 订阅图像生成

本包暴露一个工具 codex-generate-image，用于 Codex 订阅支撑的 Responses image_generation 流程。它支持图像生成与编辑，可带可选参考图。它不是 OpenAI API-key Images 端点，也不是通用的多 provider 图像框架。

图像生成工具仅在 enableImageGeneration 为 true 且至少选定一个图像模型时注册。imageModels 列表是工具 model 参数的允许清单；列表顺序决定缺省，因此调用省略 model 时使用第一个选定的模型。请求列表以外的模型会被拒绝并列出合法值。内置的已选定列表是 gpt-image-2.5-flare 与 gpt-image-2.5-sunburst；内置目录与标签位于 [lib/media/image-models.mjs](lib/media/image-models.mjs)。语法合法的自定义 ID 即使不在该目录中也可以输入，但这并不代表远程订阅端点支持它们。

请求中包含两个不同的模型概念。顶层 Responses model 是 Codex 聊天模型 carrier，取自官方 Codex 选择，选择不可用时使用代码自带的 fallback。嵌套的 image_generation.model 是图像引擎，取自本包的允许清单。二者绝不能互相替换。面向用户的工具接受 prompt、model、size、quality、background、action、format 以及可选的 image 输入。adapter 的请求构造器还支持调用方提供的可选 output_compression、moderation、input_fidelity、partial_images 与 input_image_mask 字段；当前工具 schema 不暴露这些额外字段。单次调用的 quality 会覆盖包级 imageQuality 缺省（auto）。质量是请求级设置而非按模型设置：工具描述说明 GPT Image 1 / 1.5 / 2 最高到 high，而 GPT Image 2.5 还列出 xhigh 与 max。实现不会静默降级或本地拒绝未经证实的模型/质量组合；远程拒绝保持可见。

生成的图像文件写入当前会话工作区之下，缺省目录为 images/；imageOutputDir 可更改相对输出目录。工具返回文件路径与元数据，并通过 Host 附件机制传递图像数据供后续查看。工具的文本结果列出路径而不内嵌图像字节。附件保存失败会记录日志，工作区文件仍可用。若无法解析出有效的工作区输出目录，工具会报告该状况，而不是声称已保存文件。

兼容性证据是受限的：2026-09-24 在一份真实订阅上使用 image_generation.model 为 gpt-image-2.5-flare 与 gpt-image-2.5-sunburst 生成了 PNG。Codex 订阅端点没有发布 schema；这条带日期的观察不能保证所有目录/自定义 ID 或未来网关版本都可用。被拒绝的图像模型会连同其状态与 ID 一起报告；插件绝不静默替换为其他模型。带日期的发布说明保留在 [CHANGELOG.md](CHANGELOG.md) 中，请求/模型边界在 [docs/image-generation.md](docs/image-generation.md) 与 [docs/adr/0001-separate-responses-carrier-from-image-model.md](docs/adr/0001-separate-responses-carrier-from-image-model.md) 中说明。

### 配置与持久化

[lib/media/index.js](lib/media/index.js) 中的 Host Config 将 enableImageGeneration 缺省为 false，imageModels 为两个内置选项，imageQuality 为 auto，imageOutputDir 为 images。较早的 enableProviders 与 providerModelSelections 字段仅保留用于一次性图像模型迁移：显式禁用的旧选项保持禁用，缺失的旧配置回退到内置列表。旧 codex-managed-image 哨兵绝不上送。原来的 defaultImageModel 字段已移除；缺省由 imageModels 顺序承载。聊天模型选项仅由官方 OpenAI Codex provider 管理。

Fast Mode 与搜索状态不会从原插件自动迁移。共享的官方 credential record 与一次性旧 token 导入予以保留。运行期 Profile 配置、凭据、生成的图像与插件数据都不是源码产物；不要提交它们。聊天模型选择、Responses carrier、图像模型与图像质量的区别见 [CONTEXT.md](CONTEXT.md)。

## 不变量与有意排除项

修改本包时必须守住以下边界：

1. 保持单一 bundle/包身份、单一 Host 行与单一生成的 Client Loader 条目。没有确认的产品需求，请勿把 OAuth 与媒体拆回为两个包。
2. DSH 官方 openai-codex provider 仍是 Codex 聊天传输、聊天模型发现与模型能力的所有者。不要在这里重建其模型列表、编辑器或模型列表路由。
3. 在各自的请求位置保持 Responses carrier、图像生成模型与质量为三个不同的值。选定的图像模型列表决定暴露面、合法值与缺省；不受支持的远程模型不会被静默替换。
4. 搜索 override 写入只限定在插件标记块内。关闭搜索时，绝不删除或重写未标记的用户 web override。
5. 凭据、Profile 配置、会话、运行期数据与生成的媒体不得进入源码/包产物。

以下旧表面被有意移除，仍属回归审查排除项：

- Grok、Claude 与 Antigravity OAuth provider 及各 provider 专属 adapter。
- 通用 API-key 图像 provider/目录，包括 OpenAI API、Gemini、DashScope、Volcengine 与 MiniMax adapter。
- 视频生成工具、预设与 adapter。
- 通用 provider-registry/LLM-adapter 框架与已退役的 Codex chat-completions adapter；官方 DSH Codex 仍是聊天实现。
- 重复的 Codex 聊天模型发现、OAuth 页面上的模型编辑器、插件自有的聊天模型列表与模型列表路由。
- 第二个图像工具名 media-image-codex（已并入 codex-generate-image）与 codex-managed-image 哨兵（已由选定的图像模型列表取代）。
- 已过时的 aspectRatio 图像工具参数；纵横比通过 size 表达。
- 多包部署辅助脚本及其改动 Profile 的测试；部署不属于本仓库的检查范围。

## 运维验证边界

- **Fast Mode 未经真实环境验证。** 模型 ID 不匹配可能让 service_tier: priority 注入器静默失效，上游拒绝会以 HTTP 400 呈现。真实 Codex 检查必须同时确认出站字段与一次成功的对话；注入器保持 fail-open。
- **旧凭据迁移仅由源码定义，未在真实 Profile 上验证。** 它只应在官方 Codex credential record 缺失时为其播种。不要仅凭离线测试声称迁移已完成；凭据始终留在本仓库之外。
- **图像质量缺省重载未经验证。** 单次调用 quality 会覆盖包缺省；在把过期的摘要当成 Client 缺陷之前，请先重启插件/Host 并确认 Host 侧 imageQuality 的值。
- **上游收敛是移除的触发条件。** 本包当前提供 Codex GUI 授权与 service_tier fallback。若 DSH 官方 Codex provider 已经提供两者，请优先退役对应插件路径，而不是维持重复所有权。

## 源码地图

| 路径 | 职责 |
|---|---|
| [cordis.patch.yml](cordis.patch.yml) | 插入配置为空的单一包行。 |
| [lib/index.js](lib/index.js) | Host 组装、Config 导出与注入合并。 |
| [lib/oauth.js](lib/oauth.js) | 安装 Codex Host 行为与配置的 OpenAI proxy 转发。 |
| [lib/providers/oauth-base.mjs](lib/providers/oauth-base.mjs) | Codex 使用的内部 OAuth 生命周期基类；本包不注册任何非 Codex OAuth provider。 |
| [lib/providers/codex/index.mjs](lib/providers/codex/index.mjs) | Codex Host 编排：凭据/auth 服务、路由、用量、搜索切换、Fast Mode 注册与清理。 |
| [lib/providers/codex/codex-auth-service.mjs](lib/providers/codex/codex-auth-service.mjs) | Codex 专属 auth 服务；官方记录同步、旧凭据迁移与图像工具凭据/http 接缝。 |
| [lib/providers/codex/codex-credential-record.mjs](lib/providers/codex/codex-credential-record.mjs) | 映射并刷新共享的官方 llm-pi-ai/openai-codex credential record。 |
| [lib/providers/codex/codex-oauth.mjs](lib/providers/codex/codex-oauth.mjs) | Codex OAuth/设备流端点、token 规范化、PKCE 辅助函数与 provider spec。 |
| [lib/providers/codex/fast-mode.mjs](lib/providers/codex/fast-mode.mjs) | 按模型的 Fast Mode 注册表与受保护的 Host 路由。 |
| [lib/providers/codex/fast-mode-store.mjs](lib/providers/codex/fast-mode-store.mjs) | Fast Mode 模型与搜索启用状态的插件自有持久化。 |
| [lib/providers/codex/search.mjs](lib/providers/codex/search.mjs) | Codex 订阅网络搜索 provider 与响应映射。 |
| [lib/providers/codex/usage.mjs](lib/providers/codex/usage.mjs) | 用量/额度获取、规范化与短时缓存。 |
| [lib/shared/account-store.mjs](lib/shared/account-store.mjs) | 非机密 Codex 账户元数据与凭据引用。 |
| [lib/shared/browser-oauth-authorizer.mjs](lib/shared/browser-oauth-authorizer.mjs) | 浏览器 OAuth 回调、PKCE 会话与手工码授权辅助函数。 |
| [lib/shared/provider-utils.mjs](lib/shared/provider-utils.mjs) | 共享的 JWT/日期/值/错误与额度窗口规范化辅助函数。 |
| [lib/shared/proxy.mjs](lib/shared/proxy.mjs) | OpenAI 目标 proxy 传输与 fail-open 的 Codex service_tier 请求注入器。 |
| [lib/shared/secret-store.mjs](lib/shared/secret-store.mjs) | 不透明凭据引用与 secret-store 实现；token 材料与账户元数据分开保存。 |
| [lib/media/index.js](lib/media/index.js) | 图像 Config、能力路由与实时图像工具注册/对账。 |
| [lib/media/image-models.mjs](lib/media/image-models.mjs) | 内置图像模型目录、缺省与语法级 ID 校验。 |
| [lib/media/model-selection.mjs](lib/media/model-selection.mjs) | 纯图像允许清单/缺省解析、旧选择迁移与 carrier 解析。 |
| [lib/media/image-tool-schema.mjs](lib/media/image-tool-schema.mjs) | 无依赖的图像工具名、参数/输出 schema、描述与文本渲染。保持其不依赖仅限 DSH-Profile 的 @deepseek-ai/dsh-tools 导入，使工具契约可离线测试。 |
| [lib/media/image-tool.js](lib/media/image-tool.js) | 工具校验/执行、Codex 认证与 adapter 分发、工作区文件与附件。 |
| [lib/media/executors.mjs](lib/media/executors.mjs) | 受支持的 Codex 图像 adapter 注册与协议分发。 |
| [lib/media/adapters/openai-codex.js](lib/media/adapters/openai-codex.js) | Codex Responses 图像生成请求构造、流式响应解析与远程错误处理。 |
| [lib/media/image-output.mjs](lib/media/image-output.mjs) | 生成图像的会话工作区/输出目录解析。 |
| [src/client/oauth.js](src/client/oauth.js) | 登录/账户/搜索设置 UI 以及对话额度与 Fast Mode 插槽。 |
| [src/client/media.js](src/client/media.js) | 订阅图像设置 UI：启用开关、有序模型列表、目录与质量缺省。 |
| [lib/client.js](lib/client.js) | 入库的合并 Client Loader 输出；由两个 Client 源生成。 |
| [scripts/build-client.mjs](scripts/build-client.mjs) | 从保留的源构建单一 Client 输出。 |
| [scripts/check-package.mjs](scripts/check-package.mjs) | 检查包/Loader 结构与 JavaScript 语法。 |
| [test/](test/) | carrier 分离、凭据映射、工具 schema、模型选择与 proxy 目标规则的离线测试；测试不安装包也不读取 Profile 数据。 |
| [docs/image-generation.md](docs/image-generation.md) | 图像生成请求概念、流程、证据与兼容性边界。 |
| [docs/adr/0001-separate-responses-carrier-from-image-model.md](docs/adr/0001-separate-responses-carrier-from-image-model.md) | 关于 carrier/图像模型边界的已接受决策记录。 |
| [CONTEXT.md](CONTEXT.md) | 四个图像/聊天模型概念的共享词汇表。 |
| [CHANGELOG.md](CHANGELOG.md) | 带日期的发布历史与兼容性观察。 |
| [README.md](README.md) / [README.zh.md](README.zh.md) | 面向用户的目的、安装、行为与维护总览（英文主文档 + 中文镜像）。 |
| [CONTRIBUTING.md](CONTRIBUTING.md)、[docs/release.md](docs/release.md) 与 [SECURITY.md](SECURITY.md) | 贡献、交接与安全指引。 |

对于图像生成相关改动，还请阅读[功能说明](docs/image-generation.md)与 [ADR 0001](docs/adr/0001-separate-responses-carrier-from-image-model.md)。包的使用与命令请从 [README.md](README.md) 开始。
