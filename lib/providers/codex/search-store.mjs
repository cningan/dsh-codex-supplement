/**
 * 联网搜索开关的独立持久化（搜索组件行自有）。
 *
 * 与 Fast mode 分开的原因（2026-11-09 组件化）：搜索现在由独立 row 承载，
 * 若与 base row 共用 `data/fast-mode.json`，两个 row 各自持有内存镜像并互相覆盖
 * 对方的字段。搜索 row 因此写自己的 `data/search.json`。
 *
 * 旧版本把 `searchEnabled` 存在 `data/fast-mode.json`；首次加载时若
 * `data/search.json` 不存在，会读旧字段并立即迁移到新文件（一次性）。
 *
 * @module dsh-codex-supplement/search-store
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const SEARCH_STORE_FILE = join(PLUGIN_ROOT, 'data', 'search.json')
/** 旧版搜索开关位置（仅用于一次性迁移读取）。 */
export const LEGACY_SEARCH_STORE_FILE = join(PLUGIN_ROOT, 'data', 'fast-mode.json')

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

async function writeEnabled(file, enabled) {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify({ enabled, updatedAt: new Date().toISOString() }, null, 2), 'utf8')
  await rename(tmp, file)
}

export class SearchStore {
  constructor({ file = SEARCH_STORE_FILE, legacyFile = LEGACY_SEARCH_STORE_FILE } = {}) {
    this.file = file
    this.legacyFile = legacyFile
    this.enabled = false
    this.loaded = false
    this.writeTail = Promise.resolve()
  }

  async load() {
    const own = await readJson(this.file)
    if (own !== undefined) {
      this.enabled = own?.enabled === true
      this.loaded = true
      return this.snapshot()
    }
    const legacy = await readJson(this.legacyFile)
    this.enabled = legacy?.searchEnabled === true
    this.loaded = true
    if (legacy?.searchEnabled !== undefined) {
      // 一次性迁移：旧文件存在搜索字段就落一份新文件，之后两边互不影响。
      try { await writeEnabled(this.file, this.enabled) } catch { /* fail-open */ }
    }
    return this.snapshot()
  }

  snapshot() {
    return { enabled: this.enabled, loaded: this.loaded }
  }

  async setEnabled(enabled) {
    if (typeof enabled !== 'boolean') throw new Error('invalid input: enabled must be a boolean')
    const next = this.writeTail.then(async () => {
      const previous = this.enabled
      this.enabled = enabled
      try {
        await writeEnabled(this.file, enabled)
      } catch (error) {
        this.enabled = previous
        throw error
      }
      this.loaded = true
      return enabled
    })
    this.writeTail = next.then(() => undefined, () => undefined)
    return next
  }
}

export const searchStoreConstants = Object.freeze({ file: SEARCH_STORE_FILE, legacyFile: LEGACY_SEARCH_STORE_FILE })
