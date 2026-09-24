/**
 * codex Fast mode 的**插件自有持久化**（2026-09-22 新增，取代 settings 命名空间）。
 *
 * 为什么改（照 `本仓库的 Codex 配置说明` §六/§七）：
 * 旧实现把 Fast mode 与搜索开关存进 settings 服务命名空间 `dsh-oauth`
 * （`ctx.inject(['settings'])` + `settingsService.register/mutate`）。0.1.7-alpha.1 起
 * settings 服务**没有 `register`**，且 `mutate` 只认「插件条目 id + Config `.volatile()` 字段」，
 * 对非插件条目 id 抛 `Plugin entry … has no volatile fields`——该持久化路径已死。
 * 用户裁定：状态落在**插件自己拥有的文件**里，不借道 settings。
 *
 * 文件：`<插件根>/data/fast-mode.json`。
 * 形状：
 * ```json
 * { "models": { "gpt-5.6-luna": true }, "searchEnabled": false, "updatedAt": "…" }
 * ```
 * 语义：
 *   - `models`：**只存开启项**（关闭即删键，对齐旧 `fastModeModels: dict<bool>` 的写法）
 *   - `searchEnabled`：联网搜索开关（默认 false = 保持官方 DeepSeek 搜索不变）
 *   - 未知字段一律忽略；坏文件当空状态（fail-open，绝不让插件启动失败）
 *
 * 写盘：tmp + rename 原子替换（与 credentials-local / seed 脚本一致的做法）。
 * 写序：**先改内存镜像 → 落盘 → 失败则回滚镜像并抛错**（调用方决定是否提示）。
 *   ⇒ 与旧 `persistFastMode` 的对外语义一致：写失败时**本次调用不生效**，
 *     但**上一次成功写入的状态仍在内存里继续生效**（不是"先落盘再改内存"——
 *     `writeState` 只写传入的快照，不改本对象）。所有写操作经写尾链串行，
 *     故「先改内存」不会被并发写互相覆盖。
 *
 * @module dsh-codex-supplement/codex-fast-mode-store
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 插件根（`lib/providers/codex/` 上溯三级）。 */
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
/** 默认落盘位置（插件自有数据目录）。 */
export const FAST_MODE_STORE_FILE = join(PLUGIN_ROOT, 'data', 'fast-mode.json')
/** 单文件写入上限语义（模型 id 长度保护，照 fast-mode.mjs 的硬边界）。 */
const MAX_MODEL_ID_LENGTH = 256

/** 归一化 models 字典（只收 `true` 且 id 合法的键）。 */
function normalizeModels(value) {
  const models = {}
  if (value === null || typeof value !== 'object') return models
  for (const [id, enabled] of Object.entries(value)) {
    if (enabled !== true) continue
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_MODEL_ID_LENGTH) continue
    models[id] = true
  }
  return models
}

/** 读文件 → 归一化状态；不存在/坏 JSON → 空状态（fail-open）。 */
async function readState(file) {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    return {
      models: normalizeModels(parsed?.models),
      searchEnabled: parsed?.searchEnabled === true,
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return { models: {}, searchEnabled: false, updatedAt: null }
  }
}

/** 原子写（同目录 tmp + rename）。 */
async function writeState(file, state) {
  await mkdir(dirname(file), { recursive: true })
  const document = JSON.stringify({
    models: state.models,
    searchEnabled: state.searchEnabled === true,
    updatedAt: new Date().toISOString(),
  }, null, 2)
  const tmp = `${file}.tmp`
  await writeFile(tmp, document, 'utf8')
  await rename(tmp, file)
}

/**
 * Fast mode 状态存储（内存镜像 + 文件正源）。
 *
 * 所有写操作串行化（写尾链），保证「写盘失败即回滚内存镜像」，
 * 与旧 `persistFastMode`（改镜像→写→失败回滚）的对外语义一致。
 */
export class FastModeStore {
  /**
   * @param {object} [options] - { file?, logger? }
   */
  constructor({ file = FAST_MODE_STORE_FILE, logger = null } = {}) {
    this.file = file
    this.logger = logger
    this.models = {}
    this.searchEnabled = false
    this.loaded = false
    this.writeTail = Promise.resolve()
  }

  /** 从文件装载（幂等；失败不抛错，保持空状态）。 */
  async load() {
    const state = await readState(this.file)
    this.models = state.models
    this.searchEnabled = state.searchEnabled
    this.loaded = true
    return this.snapshot()
  }

  /** 当前状态快照（拷贝，不暴露内部对象）。 */
  snapshot() {
    return { models: { ...this.models }, searchEnabled: this.searchEnabled, loaded: this.loaded }
  }

  /** 已开启的模型 id 列表（对齐旧 `fastMode.models()`）。 */
  modelIds() {
    return Object.keys(this.models)
  }

  /** 某模型是否开启 Fast mode。 */
  isEnabled(modelId) {
    return typeof modelId === 'string' && this.models[modelId] === true
  }

  /** 是否已装载（未装载时 isEnabled 恒 false——fail-open 不注入 service_tier）。 */
  isLoaded() {
    return this.loaded
  }

  /** 写尾链（内部）：串行执行，失败不污染后续写。 */
  #enqueue(task) {
    const next = this.writeTail.then(task, task)
    this.writeTail = next.then(() => undefined, () => undefined)
    return next
  }

  /**
   * 落盘当前状态（原子写）。写失败抛错（调用方决定回滚镜像）。
   */
  async persist() {
    return this.#enqueue(async () => {
      await writeState(this.file, { models: this.models, searchEnabled: this.searchEnabled })
    })
  }

  /**
   * 设置某模型的 Fast mode；先落盘再改镜像，写失败回滚 + 抛错（照旧 persistFastMode 语义）。
   * @returns {Promise<{model:string, enabled:boolean}>}
   */
  async setModel(modelId, enabled) {
    if (typeof modelId !== 'string' || modelId.length === 0 || modelId.length > MAX_MODEL_ID_LENGTH) {
      throw new Error('invalid input: model must be a non-empty string')
    }
    if (typeof enabled !== 'boolean') throw new Error('invalid input: enabled must be a boolean')
    return this.#enqueue(async () => {
      const previous = { ...this.models }
      const next = { ...this.models }
      if (enabled) next[modelId] = true
      else delete next[modelId]
      this.models = next
      try {
        await writeState(this.file, { models: next, searchEnabled: this.searchEnabled })
      } catch (error) {
        this.models = previous
        throw error
      }
      this.loaded = true
      return { model: modelId, enabled }
    })
  }

  /**
   * 设置联网搜索开关；先落盘再改镜像，写失败回滚 + 抛错。
   * @returns {Promise<boolean>} 生效后的值
   */
  async setSearchEnabled(enabled) {
    if (typeof enabled !== 'boolean') throw new Error('invalid input: enabled must be a boolean')
    return this.#enqueue(async () => {
      const previous = this.searchEnabled
      this.searchEnabled = enabled
      try {
        await writeState(this.file, { models: this.models, searchEnabled: enabled })
      } catch (error) {
        this.searchEnabled = previous
        throw error
      }
      this.loaded = true
      return enabled
    })
  }
}

/**
 * 模块级单例（插件运行期用；测试请直接 new FastModeStore({ file })）。
 * 路径由 `import.meta.url` 推导，不依赖 DSH_HOME。
 */
export const fastModeStore = new FastModeStore()

export const fastModeStoreConstants = Object.freeze({
  file: FAST_MODE_STORE_FILE,
  pluginRoot: PLUGIN_ROOT,
})
