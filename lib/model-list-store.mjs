/**
 * Codex model-list user settings, stored in plugin-owned `data/model-lists.json`.
 *
 * - Missing provider key means inherit the official/remote catalog.
 * - An array (including an empty array) means a custom visible model list.
 * - `null` passed to `set` removes the key and restores inheritance.
 *
 * Rows use the official picker fields `{id, name, contextWindow, maxTokens}` and
 * retain compatibility with older `{id, name}` / `{context}` records.
 * @module dsh-codex-supplement/model-list-store
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 模型 id 合法性（与 model-discovery.mjs isValidModelId 同规则）。 */
export function isValidModelId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/:+-]{0,127}$/.test(id)
}

/**
 * 把用户清单套到一个目录上（同步、纯函数）：
 * - rows === undefined → 原目录（继承）。
 * - rows 为数组 → 只输出清单行；行 id 在目录中存在时继承目录字段，name/contextWindow/maxTokens
 *   用户给了值就覆盖（内部归一化格式的 context/maxOutput 同步覆盖，保证两边口径一致）。
 * - 行 id 不在目录 → 以用户行为准（自定义新模型；name 缺省回 id）。
 * 行字段 = 官方语义 {id, name, contextWindow, maxTokens}（照 dsh-client-ui-settings-models；
 * 兼容旧数据 {id,name} / {context}）。
 * @param {Array<object>} catalog - 原始目录（{id,name,context|contextWindow,maxOutput|maxTokens,...}）
 * @param {Array<object>|undefined} rows - 用户清单行（{id,name,contextWindow,maxTokens}）
 */
export function applyUserModels(catalog, rows) {
  if (rows === undefined) return catalog
  const list = Array.isArray(catalog) ? catalog : []
  const byId = new Map(list.map((m) => [m.id, m]))
  const out = []
  for (const row of rows) {
    if (!row || !isValidModelId(row.id)) continue
    const base = byId.get(row.id)
    const merged = base === undefined ? { id: row.id } : { ...base, id: row.id }
    merged.name = (typeof row.name === 'string' && row.name.length > 0)
      ? row.name
      : (merged.name ?? row.id)
    // 权威字段 contextWindow/maxTokens（官方契约）；Codex Supplement 内部归一化是 context/maxOutput，同步覆盖。
    const rowContextWindow = typeof row.contextWindow === 'number' && row.contextWindow > 0
      ? row.contextWindow
      : (typeof row.context === 'number' && row.context > 0 ? row.context : undefined)
    const rowMaxTokens = typeof row.maxTokens === 'number' && row.maxTokens > 0 ? row.maxTokens : undefined
    if (rowContextWindow !== undefined) {
      merged.contextWindow = rowContextWindow
      if (merged.context !== undefined) merged.context = rowContextWindow
      else if (base === undefined) merged.context = rowContextWindow
    }
    if (rowMaxTokens !== undefined) {
      merged.maxTokens = rowMaxTokens
      if (merged.maxOutput !== undefined) merged.maxOutput = rowMaxTokens
      else if (base === undefined) merged.maxOutput = rowMaxTokens
    }
    out.push(merged)
  }
  return out
}

/**
 * 「获取模型」候选归一化：统一输出官方字段（{id,name,contextWindow,maxTokens}），
 * 兼容内部数据（context/maxOutput → contextWindow/maxTokens；无容量字段则缺省）。
 * @param {object} m - 目录/发现行
 */
export function normalizeModelForPicker(m) {
  return {
    id: String(m?.id ?? ''),
    ...(typeof m?.name === 'string' && m.name.length > 0 ? { name: m.name } : {}),
    ...(Number.isFinite(m?.contextWindow) && m.contextWindow > 0
      ? { contextWindow: m.contextWindow }
      : Number.isFinite(m?.context) && m.context > 0 ? { contextWindow: m.context } : {}),
    ...(Number.isFinite(m?.maxTokens) && m.maxTokens > 0
      ? { maxTokens: m.maxTokens }
      : Number.isFinite(m?.maxOutput) && m.maxOutput > 0 ? { maxTokens: m.maxOutput } : {}),
  }
}

/**
 * 模型清单 store：文件持久化 + 内存缓存 + 同步读（getSync，load 后即时可用）。
 * @param {object} opts
 * @param {string} opts.file - 存储文件路径
 */
export function createModelListStore({ file }) {
  let cache = undefined // {[providerId]: rows[]} — 键缺失=继承
  let loadPromise = null

  async function load() {
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      try {
        const parsed = JSON.parse(await readFile(file, 'utf8'))
        cache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        cache = {}
      }
    })()
    return loadPromise
  }
  void load() // 构造即后台加载（best-effort；写前必 await load 保证不覆盖）

  /** 同步读（未加载完成时返回 undefined=继承；正常路径在插件 apply 时已 load）。 */
  function getSync(providerId) {
    return cache?.[providerId]
  }

  async function get(providerId) {
    await load()
    return cache[providerId]
  }

  async function set(providerId, rows) {
    await load()
    const next = { ...cache }
    if (rows === null || rows === undefined) delete next[providerId]
    else next[providerId] = rows
    cache = next
    try {
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, JSON.stringify(cache, null, 2), 'utf8')
    } catch (error) {
      // 写失败不致命：内存视图仍生效（重启后回到上一持久状态）
      throw new Error(`model list persist failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { getSync, get, set }
}

/** 模块级共享实例（ESM 单例；文件位于插件 data/ 目录）。 */
export const modelListStore = createModelListStore({
  file: join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'model-lists.json'),
})
