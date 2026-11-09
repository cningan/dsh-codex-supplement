# ADR 0002：使用 Codex 专有 Images 端点

- 状态：已接受（Accepted）
- 日期：2026-11-09
- 取代：[ADR 0001](0001-separate-responses-carrier-from-image-model.md)

## 背景

旧的生图实现向 `POST /backend-api/codex/responses` 发送 hosted `image_generation` 工具。2026-11-09 的真实账号验证显示该路径已不可靠：

- `tool_choice: auto` 时模型返回 200，但只输出内联 SVG，没有 `image_generation_call`；
- 强制 `tool_choice: { type: "image_generation" }` 时返回 400 `Tool choice 'image_generation' not found in 'tools' parameter`；
- 当前 Codex CLI 已改用专有 `POST /backend-api/codex/images/generations` 与 `/images/edits`。

## 决定

生成与编辑直接调用专有 Codex Images 端点：

- 请求顶层只有图像模型 `model`，没有 Responses carrier；
- 生成请求体使用 `prompt`、`model`、可选的 `size` / `quality` / `background` / `n` / GIF 字段；
- 编辑请求体使用 `images: [{ image_url }]`；
- 响应解析 `data[].b64_json` 与顶层 `effective` 字段；
- 不再把官方聊天模型选择、hosted-tool 字段或自造的 carrier 混入请求。

## 后果

- 删除了 carrier 解析与强制 hosted tool 的代码，模型选择更直接。
- 开放 API/旧 hosted-tool 的 `complexity`、`xhigh`/`max`、SVG/WebP/JPEG、遮罩与压缩不再适用；适配器本地拒绝。
- ChatGPT Free 在专有端点返回 403；插件在套餐已知时提前拦截，并把 403 翻译成升级提示。
- 回归测试覆盖 Images 生成/编辑请求形状、响应解析、403 文案与不支持字段。
