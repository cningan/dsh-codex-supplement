import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SearchStore } from '../lib/providers/codex/search-store.mjs'

async function tempStore() {
  const dir = await mkdtemp(join(tmpdir(), 'codex-search-store-'))
  return {
    dir,
    file: join(dir, 'search.json'),
    legacyFile: join(dir, 'fast-mode.json'),
    dispose: () => rm(dir, { recursive: true, force: true }),
  }
}

test('the search store migrates the legacy searchEnabled flag once', async () => {
  const t = await tempStore()
  try {
    await writeFile(t.legacyFile, JSON.stringify({ models: { 'gpt-6': true }, searchEnabled: true }), 'utf8')
    const store = new SearchStore({ file: t.file, legacyFile: t.legacyFile })
    assert.deepEqual(await store.load(), { enabled: true, loaded: true })
    // Migration writes the new file, so later base-row Fast Mode writes cannot resurrect it.
    const own = JSON.parse(await readFile(t.file, 'utf8'))
    assert.equal(own.enabled, true)
  } finally {
    await t.dispose()
  }
})

test('the search store defaults off and persists toggles', async () => {
  const t = await tempStore()
  try {
    const store = new SearchStore({ file: t.file, legacyFile: t.legacyFile })
    assert.deepEqual(await store.load(), { enabled: false, loaded: true })
    assert.equal(await store.setEnabled(true), true)
    assert.match(await readFile(t.file, 'utf8'), /"enabled": true/)
    assert.equal(store.snapshot().enabled, true)
  } finally {
    await t.dispose()
  }
})
