/**
 * Codex Supplement credential vault adapter (using the stable oauth-login credential namespace).
 *
 * 只存「不透明 credentialRef」，原始 token 进 secret store（read/write/delete，
 * fail-closed）。macOS 用 Keychain；**本实现为 Windows file-based 0600 存储**。
 * DPAPI/凭据管理器为后续增强。接口与调用方（provider 模块/账号池）不动。
 * @module dsh-codex-supplement/secret-store
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** 生成稳定的 opaque 凭据引用（只存引用，不存 token）。 */
export function createCredentialRef(providerId, accountId) {
  return `oauth-login://${providerId}/${createHash('sha256').update(`${providerId}:${accountId}`).digest('hex')}`
}

/** 内存实现（测试/临时用）。 */
export class MemorySecretStore {
  #values = new Map()

  async read(ref) {
    return this.#values.get(ref) ?? null
  }

  async write(ref, value) {
    this.#values.set(ref, structuredClone(value))
    return ref
  }

  async delete(ref) {
    this.#values.delete(ref)
  }
}

/**
 * Windows file-based 0600 secret store。每个 ref 一个文件，写入即落盘。
 * fail-closed：写失败抛错；读不到返回 null。DPAPI 加密为后续增强。
 */
export class WindowsSecretFileStore {
  constructor({ dir } = {}) {
    this.dir = dir ?? process.env.DSH_HOME
      ? join(process.env.DSH_HOME, 'oauth-login', 'secrets')
      : join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.dsh', 'oauth-login', 'secrets')
  }

  #fileFor(ref) {
    return join(this.dir, `${createHash('sha256').update(String(ref)).digest('hex')}.json`)
  }

  async read(ref) {
    try {
      const content = readFileSync(this.#fileFor(ref), 'utf8')
      return JSON.parse(content) ?? null
    } catch {
      return null
    }
  }

  async write(ref, value) {
    mkdirSync(this.dir, { recursive: true })
    const file = this.#fileFor(ref)
    writeFileSync(file, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 })
    try {
      chmodSync(file, 0o600)
    } catch {
      // Windows 对 mode 不敏感；0o600 + 依赖目录权限即可
    }
    return ref
  }

  async delete(ref) {
    try {
      rmSync(this.#fileFor(ref), { force: true })
    } catch {
      // 删除失败不致命
    }
  }
}

/** 平台默认（Windows 用 file store，其它平台暂 unavailable 以保持 bootable）。 */
export function createDefaultSecretStore({ platform = process.platform } = {}) {
  if (platform !== 'win32') {
    return { async read() { return null }, async write() { throw new Error(`Secure credential storage unavailable on ${platform}`) }, async delete() {} }
  }
  return new WindowsSecretFileStore()
}
