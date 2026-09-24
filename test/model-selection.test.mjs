import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CODEX_PROVIDER_ID,
  LEGACY_MANAGED_IMAGE_CHOICE,
  assertCodexImageAdapter,
  legacySelectionState,
  resolveCarrierModel,
  resolveDefaultImageModel,
  resolveImageModelForRequest,
  resolveSelectedImageModels,
} from '../lib/media/model-selection.mjs'
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_MODELS,
  IMAGE_MODEL_IDS,
  describeImageModels,
  isKnownImageModel,
  isValidImageModelId,
} from '../lib/media/image-models.mjs'

const providerId = CODEX_PROVIDER_ID
const adapter = { id: providerId, auth: 'oauth' }

test('the shipped default selection is the fast + quality 2.5 pair', () => {
  assert.deepEqual([...DEFAULT_IMAGE_MODELS], ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'])
  assert.ok(isKnownImageModel('gpt-image-2.5-flare'))
  assert.ok(isKnownImageModel('gpt-image-2.5-sunburst'))
  assert.ok(IMAGE_MODEL_IDS.includes(DEFAULT_IMAGE_MODEL))
})

test('an explicit model list is authoritative, including an explicit empty list', () => {
  assert.deepEqual(resolveSelectedImageModels({ models: ['gpt-image-2'] }), ['gpt-image-2'])
  assert.deepEqual(resolveSelectedImageModels({ models: [] }), [])
})

test('malformed ids are dropped and duplicates collapsed', () => {
  assert.deepEqual(resolveSelectedImageModels({
    models: ['gpt-image-2.5-flare', 'gpt-image-2.5-flare', '', 'has space', 'gpt-image-2'],
  }), ['gpt-image-2.5-flare', 'gpt-image-2'])
})

test('a missing field falls back to the shipped pair, not to "disabled"', () => {
  assert.deepEqual(resolveSelectedImageModels({}), [...DEFAULT_IMAGE_MODELS])
})

test('legacy config still distinguishes disabled from unset', () => {
  const on = { [providerId]: { models: [LEGACY_MANAGED_IMAGE_CHOICE] } }
  const off = { [providerId]: { models: [] } }
  assert.equal(legacySelectionState({ legacySelections: on }), 'on')
  assert.equal(legacySelectionState({ legacySelections: off }), 'off')
  assert.equal(legacySelectionState({}), 'unset')
  assert.equal(legacySelectionState({ legacyEnabled: true }), 'on')
  // enableProviders 是数组转成的布尔；false 只说明"没配这个 provider"，不是显式关闭。
  assert.equal(legacySelectionState({ legacyEnabled: false }), 'unset')

  assert.deepEqual(resolveSelectedImageModels({ legacySelections: off }), [])
  assert.deepEqual(resolveSelectedImageModels({ legacySelections: on }), [...DEFAULT_IMAGE_MODELS])
})

test('the legacy sentinel is migrated, never forwarded as a model id', () => {
  const migrated = resolveSelectedImageModels({
    legacySelections: { [providerId]: { models: [LEGACY_MANAGED_IMAGE_CHOICE] } },
  })
  assert.ok(!migrated.includes(LEGACY_MANAGED_IMAGE_CHOICE))
})

test('a requested model must be enabled by configuration', () => {
  const selectedModels = ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']
  assert.deepEqual(
    resolveImageModelForRequest({ requested: 'gpt-image-2.5-sunburst', selectedModels }),
    { model: 'gpt-image-2.5-sunburst' },
  )
  assert.throws(
    () => resolveImageModelForRequest({ requested: 'gpt-image-1', selectedModels }),
    /is not enabled/,
  )
})

test('omitting the model uses the configured default, then the first enabled', () => {
  const selectedModels = ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']
  assert.deepEqual(
    resolveImageModelForRequest({ selectedModels, defaultModel: 'gpt-image-2.5-sunburst' }),
    { model: 'gpt-image-2.5-sunburst' },
  )
  // 默认档不在勾选清单里 → 回落到清单首个，而不是发出一个没勾选的模型。
  assert.deepEqual(
    resolveImageModelForRequest({ selectedModels, defaultModel: 'gpt-image-1' }),
    { model: 'gpt-image-2.5-flare' },
  )
})

test('an empty selection blocks generation with an actionable message', () => {
  assert.throws(
    () => resolveImageModelForRequest({ selectedModels: [] }),
    /No image model is enabled/,
  )
})

test('resolveDefaultImageModel falls back safely', () => {
  assert.equal(resolveDefaultImageModel({ defaultModel: 'gpt-image-2', selectedModels: ['gpt-image-2'] }), 'gpt-image-2')
  assert.equal(resolveDefaultImageModel({ defaultModel: 'gpt-image-1', selectedModels: ['gpt-image-2'] }), 'gpt-image-2')
  assert.equal(resolveDefaultImageModel({ defaultModel: '', selectedModels: [] }), DEFAULT_IMAGE_MODEL)
})

test('the carrier is resolved separately from the image model', () => {
  assert.equal(resolveCarrierModel({ officialCodexDefaultModel: 'gpt-6-luna' }), 'gpt-6-luna')
  assert.equal(resolveCarrierModel({ officialCodexDefaultModel: '' }), undefined)
  assert.equal(resolveCarrierModel({ officialCodexDefaultModel: 42 }), undefined)
  // 图像模型 id 永远不该变成 carrier
  assert.equal(resolveCarrierModel({ officialCodexDefaultModel: LEGACY_MANAGED_IMAGE_CHOICE }), LEGACY_MANAGED_IMAGE_CHOICE)
})

test('unsupported adapters are rejected before any request', () => {
  assert.doesNotThrow(() => assertCodexImageAdapter(adapter))
  assert.throws(() => assertCodexImageAdapter({ id: 'openai', auth: 'api-key' }), /Only the Codex subscription image adapter/)
  assert.throws(() => assertCodexImageAdapter(undefined), /Only the Codex subscription image adapter/)
})

test('image model id validation allows unknown-but-well-formed ids', () => {
  assert.ok(isValidImageModelId('gpt-image-9-future'))
  assert.ok(!isValidImageModelId('has space'))
  assert.ok(!isValidImageModelId('-leading-dash'))
  assert.ok(!isValidImageModelId(undefined))
})

test('describeImageModels labels the enabled tiers', () => {
  const text = describeImageModels(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'gpt-image-9-future'])
  assert.match(text, /gpt-image-2\.5-flare（快速档）/)
  assert.match(text, /gpt-image-2\.5-sunburst（高质量档）/)
  assert.match(text, /gpt-image-9-future/)
})
