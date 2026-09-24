/**
 * 生图「另存到会话工作区」的路径解析（2026-09-23，用户要求）。
 *
 * 为什么单独成模块：这段逻辑按官方既有做法落地（见下三条依据），
 * 抽出来就能**离线单测**（不需要真机、不需要凭据、不需要生图），
 * 也让 `image-tool.js` 只管工具语义。
 *
 * 三条依据（遵循 DSH 官方工作区路径契约，不自定义 session 目录）：
 * 1. 会话工作区根 = `exec.agent.session.header.cwd`，缺则
 *    `sandboxPolicy.resolve({ session }).workspaceRoot` —— 这个优先级与官方
 *    `dsh-api-workspace-files` 的 `cwd: agent.session.header.cwd ?? sandboxPolicy.workspaceRoot`
 *    一致（反过来的话，会话头里的 cwd 会被策略根盖掉）；
 * 2. 相对目录用官方文件系统 seam `ctx.fs.resolve(path, { cwd })` 解析 ——
 *    越界/不合规的路径由官方那层报错，不由本插件猜；
 * 3. `FsTarget.displayPath` 是**绝对路径**（`dsh-fs-local` 的 `localDisplayPath` 用
 *    `resolve(cwd, path)`），所以调用方可以直接拿它配 `node:fs/promises.writeFile` 写盘。
 *    （`ctx.fs` 只暴露 `writeText`，没有二进制写；官方 `dsh-tool-fs` 也走宿主路径，
 *     故这里不绕远路去造二进制 seam。）
 *
 * fail-open：取不到工作区根（例如无 agent 的编程式执行）或解析失败都**不抛错**，
 * 只返回 `{ dir: undefined, reason }`，本次就只存附件、不写工作区。
 *
 * @module dsh-codex-supplement/image-output
 */

/**
 * 出厂默认输出目录（相对会话工作区）。**必须与 `lib/media/index.js` 里
 * `imageOutputDir: z.string().default('images')` 的默认值一致**——两处都留一份是因为
 * 本模块要能被离线单测直接 import，不该依赖插件的 Config schema。
 */
export const DEFAULT_IMAGE_OUTPUT_DIR = 'images'

/**
 * 解析本次生图的输出目录。
 * @param {object} deps
 * @param {object} deps.config 配置快照（`snapshotConfig` 的产物；含 `imageOutputDir` 与
 *   **服务引用** `fs` / `sandboxPolicy`）。用快照而不是直接读 `ctx.fs`：在插件根 ctx 上访问
 *   未 inject 的服务会抛 `cannot get property "fs" without inject`（真机踩过）。
 * @param {object} deps.exec 工具执行上下文（需 `agent`，可选 `signal`）。
 * @returns {Promise<{dir?:string, reason?:string}>} `dir` = 绝对目录（可直接写盘）。
 */
export async function resolveImageOutputDir({ config, exec }) {
  // 语义区分（2026-09-23 修正）：
  //   · `''`（显式空串）      = **用户主动关闭**另存；
  //   · `undefined`/非字符串 = **配置字段缺失**（例如宿主还没重启、schema 尚未生效）
  //     ⇒ **回落到默认目录**，绝不能当成"用户关了"——那会让功能静默失灵。
  //   第一次真机复验踩的就是后者：宿主进程早于本次改动启动 ⇒ 配置里根本没有这个字段
  //   ⇒ 旧写法把它当空串 ⇒ 输出 `disabled (imageOutputDir is empty)`、图没落盘。
  const configured = config?.imageOutputDir
  const raw = configured === undefined || configured === null
    ? DEFAULT_IMAGE_OUTPUT_DIR
    : (typeof configured === 'string' ? configured.trim() : DEFAULT_IMAGE_OUTPUT_DIR)
  if (raw === '') return { reason: 'disabled (imageOutputDir is empty)' }
  const session = exec?.agent?.session
  const cwd = session?.header?.cwd
    ?? config?.sandboxPolicy?.resolve?.({ ...(session ? { session } : {}) })?.workspaceRoot
  if (typeof cwd !== 'string' || cwd.length === 0) return { reason: 'no session workspace root' }
  const fs = config?.fs
  if (fs === undefined || typeof fs.resolve !== 'function') return { reason: 'filesystem service unavailable' }
  try {
    const target = await fs.resolve(raw, { cwd, signal: exec?.signal })
    const dir = target?.displayPath
    if (typeof dir !== 'string' || dir.length === 0) return { reason: 'filesystem returned no display path' }
    return { dir }
  } catch (error) {
    return { reason: `cannot resolve "${raw}": ${error instanceof Error ? error.message : String(error)}` }
  }
}
