# 跨平台检查清单（Windows / macOS / Linux）

本文件记录「同一份代码在 Mac 上为什么会坏」的已知模式，以及本包已经怎么处理。它面向维护者，不是用户文档。

工作区级通用规则见 [插件制作规范](../../docs/plugin-authoring.md)；本文只保留本包的具体实现与回归测试映射，不重复通用条款。

## 1. `localhost` 不等于 `127.0.0.1`

- **症状**：Windows 上一切正常；Mac 上浏览器显示授权成功，插件永远收不到回调。
- **原因**：macOS 的 `localhost` 优先解析到 IPv6 `::1`；只绑定 `127.0.0.1` 的服务在 IPv6 上不可达。
- **本包做法**：登录回调同时监听 `127.0.0.1` 与 `::1`，任一成功即可；会话里暴露实际回调地址。
- **通用建议**：任何本地 HTTP 服务、回调端口、WebSocket 都要同时覆盖两族地址；不要把 `localhost` 当 IPv4 同义词。

## 2. 系统代理：三个平台三套机制

- Windows：注册表 `HKCU\...\Internet Settings`（本包已读）。
- macOS：SystemConfiguration，用 `scutil --proxy` 读取（本包 0.6.2 起已读）。
- Linux：基本只有环境变量 `HTTPS_PROXY` / `HTTP_PROXY`。
- **关键点**：Node 的 `fetch` 默认**不读**任何系统代理；而从 Finder / Dock 启动的 Mac 应用也**拿不到** `~/.zshrc` 里的环境变量。所以 macOS 上必须显式读 `scutil`。
- **Clash 的「混合端口」**同时支持 HTTP CONNECT 与 SOCKS，因此 SOCKS 配置可以按 `http://host:port` 使用。

## 3. 路径与文件名

- 一律用 `node:path` 的 `join` / `resolve`，不要手拼 `/` 或 `\`。
- macOS 默认文件系统**大小写不敏感但保留大小写**，Linux 敏感：`import './Foo.js'` 与 `foo.js` 在 Mac 上能跑、Linux 上挂。导入路径必须与真实文件名完全一致。
- 输出路径展示给用户时保留平台原生分隔符即可，不要反过来把 `\` 当转义。

## 4. 文件权限

- POSIX（macOS/Linux）上凭据文件应 `0600`；本包写入时带 `mode: 0o600` 并 `chmodSync` 兜底。
- Windows 的 `mode` 基本无效，靠目录 ACL；不要假设 `chmod` 能保护 Windows 凭据。

## 5. 换行与脚本

- JS/JSON 对 CRLF 宽容，但 **`.sh` / `.command` / shebang 脚本必须是 LF**，否则 macOS 报 `bad interpreter: ^M`。
- 本包的构建与检查脚本全部是 Node，不依赖 shell 方言，因此不受影响。
- 给 Excel 的 CSV 另说：必须 UTF-8 **带 BOM**。

## 6. 端口与外部程序

- 固定端口（本包 1455）可能与官方 Codex CLI 自己占用的端口冲突；必须捕获 `EADDRINUSE` 并给出可操作提示。
- 需要打开浏览器 / 文件管理器时，平台命令不同：macOS `open`、Windows `start`、Linux `xdg-open`。优先由 UI 层（`window.open`）完成，避免在宿主里拼 shell 命令。

## 7. 环境变量与 PATH

- macOS 从 Dock 启动的 GUI 应用 PATH 通常只有 `/usr/bin:/bin:/usr/sbin:/sbin`，看不到 Homebrew 的 `/opt/homebrew/bin`。
- 因此不要在运行时依赖 `git`、`pnpm` 等外部命令；确需调用时用绝对路径或提供降级路径。

## 8. 字体、语言与排版

- 中文字体：macOS `PingFang SC`，Windows `Microsoft YaHei`；用 `system-ui` / `font: inherit` 让宿主决定，不要写死某一平台字体。
- 文案长度：中文/英文长度差异大，按钮与标签要允许换行（`flexWrap`），不要按字符数写死宽度。
- 时间显示用 `toLocaleString()`，跟随系统区域设置。

## 9. 剪贴板与安全上下文

- `navigator.clipboard` 只在安全上下文可用；`http://127.0.0.1` 与 `http://localhost` 算安全上下文，普通局域网 IP 不算。
- 复制失败必须有降级（地址仍可手动选中），不能静默失败。

## 10. 测试怎么做

跨平台问题很难在单平台上“想起来”，所以：

- 把平台判断抽成**纯函数**（如 `parseScutilProxyOutput`），用样例文本做单测；
- 网络监听类功能写成**双栈可达性测试**（同时连 IPv4 与 IPv6）；
- 任何「本机回环」假设都要有手动兜底路径（本包：手动粘贴回调地址）。

## 本包对应的回归测试

| 关注点 | 测试文件 |
|---|---|
| 回调双栈可达、state 校验 | `test/oauth-callback.test.mjs` |
| macOS 系统代理解析 | `test/proxy-macos.test.mjs` |
| 版本/更新检查 | `test/update-check.test.mjs` |
| Images 请求与成功链路 | `test/codex-carrier.test.mjs`、`test/codex-images-integration.test.mjs` |
