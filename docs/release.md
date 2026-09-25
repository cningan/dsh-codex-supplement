# 发布与交接策略

- 本仓库是单一包的唯一来源：`@cningan/dsh-codex-supplement`。
- 交接源码 bundle 前，查看 `npm pack --dry-run` 并运行 `npm run check` 与 `npm test`。排除所有运行期 `data/*.json`、凭据、Profile 配置、会话与生成的媒体。
- 不要把"安装进活动 Profile"或"重启活动 Profile"当作隐式的发布步骤。任何 Profile 安装或真实运行期检查都需要一个明确批准、隔离的目标。
- 本包不发布到 npm。GitHub push/release 与 npm 发布是各自独立、需要用户授权的动作。绝不绕过 GitHub push protection；如果历史因疑似机密内容被拒，请准备干净、脱敏的历史，而不是改写或掩饰问题。
- 每次公开交接都更新 `CHANGELOG.md` 与 `SPEC.md`。数据兼容性限制要在 README 中保持可见。
