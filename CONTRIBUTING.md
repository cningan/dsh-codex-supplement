# 贡献指南

感谢您帮助改进 Codex Supplement。

## 范围

- 保持它作为单一 `@cningan/dsh-codex-supplement` bundle。在没有确认的产品需求时，不要恢复分离的 OAuth/媒体包，也不要加入非 Codex provider、通用 API-key 图像 adapter 或视频支持。
- DSH 官方 `openai-codex` provider 拥有 Codex 聊天。本插件拥有相邻的登录、用量、搜索、Fast Mode 与订阅图像生成功能。
- 不要添加凭据、token、账户导出、Profile 配置、生成的媒体或插件 `data/*.json` 文件。
- 每当组件移动、所有权变更或被移除时更新 `SPEC.md`：把移除的行为写进「范围外」，并在适当之处补上测试。

## 检查

需要 Node.js 22 或更新版本。单元/语法检查使用 Node 内置设施：

```sh
npm run check
npm test
npm pack --dry-run
```

`npm run check` 会重新生成合并后的 Client 模块并校验 JavaScript 语法。任何包交接前都先查看 `npm pack --dry-run` 的文件清单；它不会发布。

## Profile 安全与发布

例行开发中不要安装、修改或重启用户的活动 Profile。Profile 安装、真实 Profile 检查、GitHub 发布与 npm 发布是彼此独立的动作，都需要明确授权。本仓库没有自动化发布流程。
