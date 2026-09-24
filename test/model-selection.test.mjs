import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CODEX_MANAGED_IMAGE_CHOICE,
  resolveImageModel,
  resolveSelectedModelIds,
} from '../lib/media/model-selection.mjs'

const providerId = 'openai-codex-oauth'
const adapter = { id: providerId, auth: 'oauth' }

test('Codex legacy enablement maps only to the subscription-managed engine', () => {
  assert.deepEqual(resolveSelectedModelIds({ providerId, legacyEnabled: true }), [CODEX_MANAGED_IMAGE_CHOICE])
  assert.deepEqual(resolveSelectedModelIds({ providerId: 'openai', legacyEnabled: true }), [])
})

test('an explicit empty Codex selection overrides legacy enablement', () => {
  assert.deepEqual(resolveSelectedModelIds({
    providerId,
    legacyEnabled: true,
    selections: { [providerId]: { models: [] } },
  }), [])
})

test('unknown image-model IDs cannot become Codex engine selections', () => {
  assert.deepEqual(resolveSelectedModelIds({
    providerId,
    selections: { [providerId]: { models: ['gpt-image-1', CODEX_MANAGED_IMAGE_CHOICE] } },
  }), [CODEX_MANAGED_IMAGE_CHOICE])
})

test('the managed-image sentinel never becomes the Responses carrier', () => {
  assert.equal(resolveImageModel({
    adapter,
    savedSelection: { models: [CODEX_MANAGED_IMAGE_CHOICE] },
    officialCodexDefaultModel: 'gpt-5.5',
  }), 'gpt-5.5')
})

test('an explicit empty selection blocks generation even with a documented fallback', () => {
  assert.throws(() => resolveImageModel({
    adapter,
    savedSelection: { models: [] },
    documentedSelection: { models: [CODEX_MANAGED_IMAGE_CHOICE] },
    officialCodexDefaultModel: 'gpt-5.5',
  }), /Select the Codex-managed image engine/)
})

test('unsupported adapters are rejected before selecting a carrier', () => {
  assert.throws(() => resolveImageModel({
    adapter: { id: 'openai', auth: 'api-key' },
    officialCodexDefaultModel: 'gpt-5.5',
  }), /Only the Codex subscription image adapter/)
})
