/**
 * 插件版本与更新检查。
 *
 * DSH 的 bundle 没有"原地升级"API：更新只有一条受支持的路径——先用
 * `remove_bundle` 卸载旧包，再用新的来源 `install_bundle`。因此这里不做自动
 * 替换，只回答三个问题：当前版本是什么、GitHub 上最新发布是什么、该装哪个地址。
 *
 * 版本源是 GitHub Releases（不是 `main` 分支），因为 `main` 随时可能含未测试提交；
 * 交接给他人时应该装一个发布过的、附带了可下载资产的版本。
 *
 * @module dsh-codex-supplement/update-check
 */

import { readFile } from 'node:fs/promises'

const RELEASES_LATEST_URL = 'https://api.github.com/repos/cningan/dsh-codex-supplement/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/cningan/dsh-codex-supplement/releases'
const REQUEST_TIMEOUT_MS = 8000
const CACHE_MS = 60_000

/**
 * 解析 `v0.5.2` 这类 tag 为数字段；无法解析返回 null。
 * @param {unknown} tag
 * @returns {number[]|null}
 */
export function parseVersion(tag) {
  if (typeof tag !== 'string') return null
  const match = tag.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * 比较两个版本号；a>b 返回 1，相等返回 0，a<b 返回 -1。
 * 无法解析时返回 0（视为相同），避免把格式异常当成"有更新"。
 * @param {unknown} a
 * @param {unknown} b
 * @returns {-1|0|1}
 */
export function compareVersions(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) return 0
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return 1
    if (left[i] < right[i]) return -1
  }
  return 0
}

/**
 * 从压缩包资产里挑出可安装的那个（`.tgz`）；没有资产时回落到发布页。
 * @param {unknown} assets
 * @returns {string|undefined}
 */
export function pickInstallUrl(assets) {
  if (!Array.isArray(assets)) return undefined
  const asset = assets.find((item) => typeof item?.browser_download_url === 'string' && item.browser_download_url.endsWith('.tgz'))
  return asset?.browser_download_url
}

/**
 * 读取本包版本。路径相对本模块，指向包根 `package.json`。
 * @returns {Promise<string>}
 */
export async function readCurrentVersion() {
  const raw = await readFile(new URL('../../../package.json', import.meta.url), 'utf8')
  const parsed = JSON.parse(raw)
  return typeof parsed.version === 'string' ? parsed.version : '0.0.0'
}

/**
 * 创建带缓存与超时的更新检查器。
 * @param {object} [options]
 * @param {typeof fetch} [options.http]
 * @param {number} [options.timeoutMs]
 * @param {number} [options.cacheMs]
 * @returns {{ check: (options?: {refresh?: boolean}) => Promise<object>, reset: () => void }}
 */
export function createUpdateChecker({ http = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS, cacheMs = CACHE_MS } = {}) {
  let cache
  let currentVersion

  async function readCurrent() {
    if (currentVersion === undefined) currentVersion = await readCurrentVersion()
    return currentVersion
  }

  async function fetchLatest() {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await http(RELEASES_LATEST_URL, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'dsh-codex-supplement',
        },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`GitHub releases responded ${response.status}`)
      return await response.json()
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    reset() {
      cache = undefined
    },
    /**
     * @param {{refresh?: boolean}} [options]
     * @returns {Promise<{current: string, latest: string|null, updateAvailable: boolean, installUrl: string|null, releaseUrl: string, publishedAt: string|null, error?: string}>}
     */
    async check({ refresh = false } = {}) {
      const current = await readCurrent()
      if (!refresh && cache && Date.now() - cache.fetchedAt < cacheMs) {
        return { ...cache.payload, current }
      }
      try {
        const release = await fetchLatest()
        const tag = typeof release?.tag_name === 'string' ? release.tag_name : ''
        const latest = tag.replace(/^v/, '') || null
        const payload = {
          latest,
          updateAvailable: latest !== null && compareVersions(latest, current) > 0,
          installUrl: pickInstallUrl(release?.assets) ?? null,
          releaseUrl: typeof release?.html_url === 'string' ? release.html_url : RELEASES_PAGE_URL,
          publishedAt: typeof release?.published_at === 'string' ? release.published_at : null,
        }
        cache = { fetchedAt: Date.now(), payload }
        return { current, ...payload }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          current,
          latest: null,
          updateAvailable: false,
          installUrl: null,
          releaseUrl: RELEASES_PAGE_URL,
          publishedAt: null,
          error: message,
        }
      }
    },
  }
}
