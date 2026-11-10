# 发布与交接策略

本仓库是单一包的唯一来源：无 scope 的 `dsh-codex-supplement`（0.7.0 起；0.6.x 及更早的包名是 `@cningan/dsh-codex-supplement`）。

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

   `npm pack --dry-run` 只审阅文件清单，不发布；确认没有测试夹具、凭据、运行期 `data/*.json` 或本机路径。
3. 确认工作树干净，版本号符合预期的语义化变更。DSH 的更新检查按 semver 比较，发布新版本必须递增 `package.json` 的 `version`。

## 发布到 npm

`npm publish` 是独立的外部动作，需要发布者本人的 npm 账号与 2FA。仓库与 AI 都不持有可用的发布凭据：`~/.npmrc` 里的 token 是本机状态，不进入仓库，也不能假定仍然有效（用 `npm whoami` 验证）。

首次发布必须由能登录的人在本机执行（Trusted Publishing 只能给已经存在的包签发 OIDC 凭据，不能完成第一个版本）：

```sh
npm login --auth-type=legacy --registry https://registry.npmjs.org/
npm whoami
npm publish --registry https://registry.npmjs.org/
```

- `--auth-type=legacy` 是刻意的：若 npmjs.com 网页被网络拦截，网页授权走不通，而 registry 的登录接口通常仍可用。
- `publishConfig.access` 已是 `public`；不要改成私有。
- 发布后核验：`npm view dsh-codex-supplement@<version> version dist.attestations --json`。

后续版本可选配置 **Trusted Publishing**（GitHub Actions + OIDC，无需存 token）：先新增一个发布 workflow（例如 `publish.yml`，用 `npm publish --provenance`），在 npm 上为 `dsh-codex-supplement` 建立与该 workflow、仓库 `cningan/dsh-codex-supplement` 和 `npm-publish` environment 的信任关系，再让 tag 推送触发发布。关系建立前不要把发布步骤放进 CI。

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

## 边界

- 不要把「安装进活动 Profile」或「重启活动 Profile」当作隐式的发布步骤；Profile 变更要单独、明确地执行。
- 每次公开交接都更新 `CHANGELOG.md` 与 `SPEC.md`，并在 README 中保持数据兼容性限制可见。
