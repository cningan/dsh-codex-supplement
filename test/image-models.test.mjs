import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_MODELS,
  IMAGE_MODEL_IDS,
  imageModelCapabilities,
  imageModelChoice,
  isKnownImageModel,
  selectionCapabilities,
} from '../lib/media/image-models.mjs'

test('the catalog exposes the 2.6 pair and keeps the 2.5 snapshots', () => {
  for (const id of [
    'gpt-image-2.6-flare', 'gpt-image-2.6-sunburst',
    'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst',
    'gpt-image-2.5-flare-2026-09-08', 'gpt-image-2.5-sunburst-2026-09-08',
  ]) {
    assert.ok(IMAGE_MODEL_IDS.includes(id), `${id} must be in the catalog`)
  }
  assert.equal(DEFAULT_IMAGE_MODEL, 'gpt-image-2.6-flare')
  assert.deepEqual([...DEFAULT_IMAGE_MODELS], ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'])
})

test('gpt-image-1 stays only as a deprecated compatibility entry', () => {
  const choice = imageModelChoice('gpt-image-1')
  assert.equal(choice?.deprecated, true)
  assert.equal(DEFAULT_IMAGE_MODELS.includes('gpt-image-1'), false)
  assert.match(choice?.note ?? '', /下线/)
})

test('2.6-only capabilities are declared per model', () => {
  const latest = imageModelCapabilities('gpt-image-2.6-flare')
  assert.equal(latest.complexity, true)
  assert.equal(latest.svg, true)
  assert.equal(latest.gif, true)

  const previous = imageModelCapabilities('gpt-image-2.5-sunburst')
  assert.equal(previous.complexity, false)
  assert.equal(previous.svg, false)
  assert.equal(previous.gif, false)
  assert.equal(previous.maxQuality, 'max')

  const unknown = imageModelCapabilities('gpt-image-9-future')
  assert.equal(unknown.complexity, false)
  assert.equal(unknown.gif, false)
})

test('a mixed selection reports the union of capabilities', () => {
  const caps = selectionCapabilities(['gpt-image-2.5-flare', 'gpt-image-2.6-sunburst'])
  assert.equal(caps.complexity, true)
  assert.equal(caps.svg, true)
  assert.equal(caps.gif, true)
  assert.equal(caps.maxQuality, 'max')
})

test('unknown-but-well-formed ids remain accepted', () => {
  assert.ok(isKnownImageModel('gpt-image-2.6-flare'))
  assert.equal(isKnownImageModel('gpt-image-9-future'), false)
})
