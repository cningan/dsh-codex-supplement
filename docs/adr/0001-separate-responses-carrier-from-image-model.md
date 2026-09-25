# ADR 0001：将 Responses carrier 与图像模型分离

- 状态：已接受（Accepted）
- 日期：2026-09-24

## 背景

一个 Codex 订阅图像请求在两个不同层级各有一个名为 `model` 的值。顶层 Responses `model` 选择携带工具调用的 Codex 对话模型。托管的 `image_generation` 工具自有的 `model` 选择图像引擎。官方 DSH Codex provider 拥有聊天模型发现与元数据；本包拥有图像引擎目录与允许清单。共享的单词与字符串表示并不会使这两个角色可以互换。

OpenAI Python SDK 生成的 Responses 图像工具类型暴露了工具级字段，而 Codex 订阅网关没有发布独立 schema。本包于 2026-09-24 就其两个缺省图像 ID 记录了真实订阅检查。这是受限的兼容性证据，不是对未测试 ID 或未来网关版本的承诺。

## 决策

保持三个请求概念相互独立：

1. Responses carrier 只从官方 DSH OpenAI Codex 的当前选择获取；仅当该选择不可用时，才使用 adapter 的代码自带 fallback。
2. 图像模型只从包选定的图像模型列表获取，允许的单次覆盖也只能来自该列表；只写入 `image_generation.model`。
3. 保持 `quality` 为独立的工具控件，带自己的缺省与单次覆盖。绝不要把质量档编码成模型 ID，也不要从 carrier 推断图像模型。

这一区分是数据流与请求字段契约，而不是编码在模型 ID 字符串中的类型保证。修改选择逻辑时，保持 carrier 来源与图像模型来源分离。

## 备选方案

- 把图像 ID 放入顶层 Responses `model`：否决，因为该字段选择的是携带工具调用的 Codex 对话模型，而非图像引擎。
- 从 Codex carrier 推断图像引擎，或把 Flare/Sunburst 映射为 `quality`：否决，因为这些值代表不同的角色与控件。
- 把模型选择隐藏在单一服务端哨兵之后，或静默替换 fallback：否决，因为调用方无法选择/识别所请求的引擎，并会被误导实际运行的是哪个模型。
- 每个图像模型创建一个工具：在模型共享同一图像生成契约期间否决；选定的允许清单加单一工具能让能力保持一致。

## 影响

- 聊天模型名称与输入/输出能力仍归官方 DSH Codex provider 所有；图像选择仍归 `lib/media/image-models.mjs` 所有。
- 配置的图像列表控制工具 `model` 的 enum 与缺省。可以配置未知但语法合法的自定义 ID，但远程服务才是最终的兼容性权威。
- 被拒绝时，adapter 报告状态与所请求的图像模型 ID；它不静默回退。这保留了用户意图，代价是让不受支持的网关组合可见。
- `quality` 保持单一请求级缺省，而不是按模型映射。UI 写明各模型的档位上限；实现既不降级也不硬挡未验证的组合。
- 回归覆盖必须独立断言顶层 carrier 与嵌套图像模型。参见 `test/codex-carrier.test.mjs` 与 `test/image-tool-schema.test.mjs`。

## 证据

- [Codex 图像请求构造](../../lib/media/adapters/openai-codex.js)
- [carrier 与图像模型解析](../../lib/media/model-selection.mjs) 与[工具组装](../../lib/media/image-tool.js)
- [请求字段分离测试](../../test/codex-carrier.test.mjs)
- [目录与允许清单](../../lib/media/image-models.mjs)
- [包能力与带日期的兼容性说明](../../README.md)
- OpenAI [Responses 图像生成指南](https://developers.openai.com/api/docs/guides/tools-image-generation) 与 [SDK 图像工具类型](https://github.com/openai/openai-python/blob/main/src/openai/types/responses/tool_param.py)。公开 API schema 不保证订阅网关支持。
