# 安全策略

绝不要在 issue、pull request、日志或截图中发布 OAuth 凭据、access/refresh token、账户标识、Profile 配置、会话文件、生成的媒体或插件运行期 `data/` 内容。

如果你发现漏洞，不要公开披露利用细节。若本仓库已启用 GitHub 私有漏洞报告，请使用它；否则通过现有私有渠道联系维护者，只提供复现问题所需的最少信息。分享敏感材料前，先确认私有报告渠道。

本项目不会要求用户上传凭据文件。分享前请先脱敏日志与复现材料。Codex credential-record adapter 打算使用 DSH 官方共享记录，绝不在日志中记录 token 值。
