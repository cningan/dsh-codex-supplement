import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compareVersions,
  createUpdateChecker,
  parseVersion,
  pickInstallUrl,
} from '../lib/providers/codex/update-check.mjs'

test('version tags parse and compare numerically', () => {
  assert.deepEqual(parseVersion('v0.5.2'), [0, 5, 2])
  assert.deepEqual(parseVersion('0.10.0'), [0, 10, 0])
  assert.equal(parseVersion('main'), null)
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1)
  assert.equal(compareVersions('0.5.2', '0.5.2'), 0)
  assert.equal(compareVersions('0.5.2', 'v0.6.0'), -1)
  assert.equal(compareVersions('garbage', '0.5.2'), 0)
})

test('the installable asset is the .tgz download, not the release page', () => {
  assert.equal(pickInstallUrl([
    { browser_download_url: 'https://example.com/x.zip' },
    { browser_download_url: 'https://example.com/x.tgz' },
  ]), 'https://example.com/x.tgz')
  assert.equal(pickInstallUrl([{ browser_download_url: 'https://example.com/x.zip' }]), undefined)
  assert.equal(pickInstallUrl(undefined), undefined)
})

test('a newer release is reported with its install URL', async () => {
  const checker = createUpdateChecker({
    http: async () => ({
      ok: true,
      async json() {
        return {
          tag_name: 'v9.9.9',
          html_url: 'https://github.com/cningan/dsh-codex-supplement/releases/tag/v9.9.9',
          published_at: '2026-11-10T00:00:00Z',
          assets: [{ browser_download_url: 'https://example.com/cningan-9.9.9.tgz' }],
        }
      },
    }),
  })
  const result = await checker.check()
  assert.equal(result.updateAvailable, true)
  assert.equal(result.latest, '9.9.9')
  assert.equal(result.installUrl, 'https://example.com/cningan-9.9.9.tgz')
  assert.equal(typeof result.current, 'string')
})

test('the same version is not reported as an update', async () => {
  const checker = createUpdateChecker({
    http: async () => ({
      ok: true,
      async json() {
        return { tag_name: 'v0.0.1', assets: [] }
      },
    }),
  })
  const result = await checker.check()
  assert.equal(result.updateAvailable, false)
  assert.equal(result.installUrl, null)
})

test('a failed release lookup degrades to an error, not a crash', async () => {
  const checker = createUpdateChecker({
    http: async () => ({ ok: false, status: 503 }),
  })
  const result = await checker.check()
  assert.equal(result.updateAvailable, false)
  assert.match(result.error, /503/)
  assert.equal(result.releaseUrl, 'https://github.com/cningan/dsh-codex-supplement/releases')
})

test('a second check reuses the short-lived cache', async () => {
  let calls = 0
  const checker = createUpdateChecker({
    http: async () => {
      calls += 1
      return { ok: true, async json() { return { tag_name: 'v0.0.1', assets: [] } } }
    },
  })
  await checker.check()
  await checker.check()
  assert.equal(calls, 1)
  await checker.check({ refresh: true })
  assert.equal(calls, 2)
})
