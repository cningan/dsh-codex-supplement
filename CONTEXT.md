# Codex 图像生成上下文

本词汇表定义 Codex 订阅图像生成能力中使用的模型概念。它存在是为了防止共享词 “model” 把不同的用户选择混为一谈。

## 术语

**Codex 聊天模型选择（Codex chat-model selection）**：官方 Models 页为 Codex 对话选择的模型；它不参与本插件的生图请求。
_避免_：图像模型、carrier。

**Responses carrier（已废弃）**：旧实现中携带 hosted `image_generation` 工具的 Codex 对话模型；2026-11-09 起改走专有 Images 端点，不再存在此角色。

**图像模型（Image model）**：通过 Codex Images 端点生成或编辑所请求图像的模型选择；写在请求顶层 `model`。
_避免_：聊天模型、carrier。

**图像质量（Image quality）**：影响所请求图像结果的生成质量档位，而不切换不同的聊天或图像模型。
_避免_：模型、图像模型。

**场景复杂度（Image complexity）**：GPT Image 2.6 起的规划强度（low / medium / high），决定生成前对场景/约束的规划投入，与渲染质量解耦。
_避免_：质量、模型。

**组件行（Component row）**：bundle patch 插入的一条 Loader entry；本包有 `codex-supplement`（裸包名，base：OAuth/用量/Fast Mode/设置页）、`codex-supplement-image`（生图）与 `codex-supplement-search`（搜索）三行。裸包名决定 Client 模块是否被发现；image/search 依赖 base 的 `openaiCodexAuth`。

**实际生效字段（Effective fields）**：Images 响应顶层回传的 size / quality / background / output_format 等字段；缺失表示端点没有告诉我们实际用了什么，而不是请求一定生效。
_避免_：请求参数、配置值。
