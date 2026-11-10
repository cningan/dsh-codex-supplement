# 发布与交接策略

本仓库是单一包的唯一来源：无 scope 的 `dsh-codex-supplement`（0.7.0 起；0.6.x 及更早的包名是 `@cningan/dsh-codex-supplement`）。跨仓库的 npm 2FA、异步发布与 Trusted Publishing 通用规则见工作区 [NPM 发布规则](../docs/npm-publishing.md)；本文只写本包的事实。

## 当前状态（2026-11-10）

- `dsh-codex-supplement@0.7.1` 已发布到 npm registry，`latest` 指向 0.7.1。0.7.0 是首次人工发布；0.7.1 是首次由 GitHub Actions OIDC 发布（带 provenance），并自动创建了 GitHub Release 的 `.tgz`。
- `desktop` Profile 已从 GitHub Release URL 切换为 registry spec `^0.7.0`；插件页现在可检查到 0.7.1 并原地升级。
- GitHub Actions Trusted Publishing 已配置并完成首次发布：workflow `publish.yml`、仓库 `cningan/dsh-codex-supplement`、environment `npm-publish`、权限 `publish` + `stage publish`；仓库变量 `NPM_TRUSTED_PUBLISHER_READY=true`。
- 首次发布时 npm 先建了 `0.0.0-stage` 占位版本，约 4 分钟后 0.7.0 才可查询；这是新包的异步处理，不是失败。0.7.1 的发布没有出现这个问题。

## 两条分发渠道

- **npm registry（主渠道）**：只有以包名 `dsh-codex-supplement` 安装、Profile 依赖保存为 registry spec 时，DSH 插件页才会显示版本、执行「检查更新」并原地升级。插件不自带任何更新检查或版本路由。
- **GitHub Release 的 `.tgz`（备用/归档）**：用于离线、固定版本或镜像安装。URL 安装不参与原生更新检查，升版本只能卸载后重装。不要用 `github:` 简写：它依赖本机 git，macOS 还要求 Xcode Command Line Tools。

## 发布前

1. 在经审阅的分支上完成改动，更新 `CHANGELOG.md` 中面向用户的条目；契约变化同步到 `SPEC.md`。
2. 运行并审阅：

   ```sh
   npm run check
   npm test
   npm pack --dry-run
   ```

   `npm pack --dry-run` 只审阅文件清单，不发布；确认没有测试夹具、凭据、运行期 `data/*.json` 或本机路径。`npm run check` 现在包含文档漂移检查（过期发布结论、没有警告语境的 legacy 登录参数）。
3. 确认工作树干净，版本号符合预期的语义化变更。DSH 的更新检查按 semver 比较，发布新版本必须递增 `package.json` 的 `version`。

## 发布到 npm

`npm publish` 是独立的外部动作，需要发布者本人的 npm 账号与安全密钥（2FA）。仓库与 AI 都不持有可用的发布凭据：`~/.npmrc` 里的 token 是本机状态，不进入仓库，也不能假定仍然有效（用 `npm whoami` 验证）。

**0.7.0 已经人工发布完成；0.7.1 起由 Actions 发布**。首次人工发布时的正确路径（不要加 `--auth-type=legacy`）：

```sh
npm login --registry https://registry.npmjs.org/
npm whoami
npm publish --registry https://registry.npmjs.org/
```

- 登录会打印 `https://www.npmjs.com/login?...`，在浏览器里用 Windows Hello / 安全密钥完成授权。
- `npm publish` 还会再要一次 2FA；授权后的浏览器落地页可能 404，这是正常的，以 CLI 的 `+ dsh-codex-supplement@<version>` 和 registry 版本为准。
- 新包/新版本是异步生效的：CLI 退出 0 后 packument 可能仍 404，新包还可能先出现 `0.0.0-stage` 占位；等几分钟再 `npm view dsh-codex-supplement version`。不要重复发布同一个版本。
- recovery code 可代替 OTP，但会触发 72 小时发布冻结，不是捷径。

**后续版本走 Trusted Publishing（0.7.1 已验证）**：

```sh
npm version patch        # 更新版本、提交、创建 vX.Y.Z 标签
git push --follow-tags   # publish.yml 用 GitHub OIDC 发布并开 Release
```

前提：workflow 在 tag 指向的提交里，`NPM_TRUSTED_PUBLISHER_READY=true`，npm CLI ≥ 11.5.1（workflow 用 Node 24），且 npm 侧的信任关系仍有效：

```sh
npm trust list dsh-codex-supplement
```

输出应包含 `permissions: publish`。首个版本不能靠 Trusted Publishing 创建，包必须先在 npm 上存在。npm 的 `minimumReleaseAge` 可能拦住刚发布的版本；本次安装时 pnpm 已自动把 `dsh-codex-supplement@0.7.0` 写进 Profile 的 `minimumReleaseAgeExclude`，以后用新版本时要确认实际装上的是新版本。

推送 workflow 文件到 GitHub 前，确认 `gh auth status` 的 scopes 含 `workflow`；否则 GitHub 会拒绝 push `.github/workflows/*`，处理方式是 `gh auth refresh -h github.com -s workflow` 走设备码授权后重推。推送后用 `gh workflow list --repo cningan/dsh-codex-supplement` 确认 `Publish to npm` 已注册；tag 推送后用 `gh run list` 查看发布运行。

## GitHub Release（备用安装包）

1. 推送到 `main` 并创建与包版本一致的标签（例如 `v0.7.0`）。
2. 构建并检查压缩包：`npm pack`。
3. 创建 Release 并上传 `.tgz`：

   ```sh
   gh release create v0.7.0 <tarball> --title v0.7.0 --generate-notes
   ```

4. 交接时给固定版本地址，不要给会漂移的分支地址。

GitHub push/release 与 npm 发布是各自独立、需要用户授权的动作。绝不绕过 GitHub push protection；如果历史因疑似机密内容被拒，请准备干净、脱敏的历史，而不是改写或掩饰问题。

## 安装与更新

- 在 DSH 插件页「添加插件」里填 `dsh-codex-supplement`，由 pnpm 从 registry 安装。之后插件页的「检查更新 / 更新」可用。
- 更新由 DSH 执行：移除旧版 → 安装同名精确新版本；未启用 HMR 时提示重启后生效。
- 已用旧 URL/`.tgz` 安装的 Profile 需要先移除旧包（`@cningan/dsh-codex-supplement` 或旧 `.tgz` 依赖），再按新包名安装。插件数据目录随包目录变化，Fast Mode/搜索开关等本地状态不会自动迁移；官方 Codex credential record 不受影响。
- 界面显示与实际安装不一致时，先看插件页的版本与来源；URL 来源永远显示「不可更新」，这是预期行为。

## 边界

- 不要把「安装进活动 Profile」或「重启活动 Profile」当作隐式的发布步骤；Profile 变更要单独、明确地执行。
- 每次公开交接都更新 `CHANGELOG.md` 与 `SPEC.md`，并在 README 中保持数据兼容性限制可见。
