# 更新日志

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
