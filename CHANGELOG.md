# 更新日志

## 0.4.1 — 开关、图标与文案收敛

- 修正生图配置的依赖顺序：新增 `defaultImageModel` 与 `imageModelDefaults`，quality/complexity 改为跟随所选模型的 profile；工具、试生图与设置页共用同一解析。默认模型不再由清单顺序隐式决定。
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
