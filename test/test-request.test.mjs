import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TEST_PREVIEW_MAX_BYTES,
  resolveTestImageRequest,
  toPreviewImages,
} from '../lib/media/test-request.mjs'

const MODELS = ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst']
const CONFIG = {
  defaultImageModel: 'gpt-image-2.6-flare',
  imageModelDefaults: {
    'gpt-image-2.6-flare': { quality: 'high', complexity: 'medium' },
  },
}

test('the minimal test request follows the default model profile', () => {
  const { request, requested } = resolveTestImageRequest({
    body: { prompt: '  a red apple  ' },
    config: CONFIG,
    selectedModels: MODELS,
  })
  assert.deepEqual(request, {
    prompt: 'a red apple',
    imageModel: 'gpt-image-2.6-flare',
    quality: 'high',
    outputFormat: 'png',
    complexity: 'medium',
  })
  assert.deepEqual(requested, {
    model: 'gpt-image-2.6-flare',
    quality: 'high',
    complexity: 'medium',
    output_format: 'png',
  })
})

test('the test UI can override model, complexity, format, size and gif fields', () => {
  const { request } = resolveTestImageRequest({
    body: {
      prompt: 'walk cycle',
      model: 'gpt-image-2.6-sunburst',
      quality: 'high',
      complexity: 'high',
      output_format: 'gif',
      size: '1024x1024',
      frames: 12,
      frame_duration_ms: 150,
    },
    config: CONFIG,
    selectedModels: MODELS,
  })
  assert.equal(request.imageModel, 'gpt-image-2.6-sunburst')
  assert.equal(request.quality, 'high')
  assert.equal(request.complexity, 'high')
  assert.equal(request.outputFormat, 'gif')
  assert.equal(request.size, '1024x1024')
  assert.equal(request.frameCount, 12)
  assert.equal(request.frameDurationMs, 150)
})

test('quality follows the selected model capability', () => {
  const models = ['gpt-image-2.5-flare', 'gpt-image-2.6-flare']
  const { request } = resolveTestImageRequest({
    body: { prompt: 'x', model: 'gpt-image-2.5-flare' },
    config: {
      defaultImageModel: 'gpt-image-2.6-flare',
      imageModelDefaults: { 'gpt-image-2.5-flare': { quality: 'max' } },
    },
    selectedModels: models,
  })
  assert.equal(request.quality, 'max')
  assert.equal('complexity' in request, false)

  assert.throws(
    () => resolveTestImageRequest({
      body: { prompt: 'x', model: 'gpt-image-2.6-flare', quality: 'max' },
      config: {},
      selectedModels: models,
    }),
    /not supported by gpt-image-2\.6-flare/,
  )
})

test('invalid optional fields are ignored instead of breaking the test', () => {
  const { request } = resolveTestImageRequest({
    body: { prompt: 'x', size: 'huge', output_format: 'bmp', frames: -1 },
    config: {},
    selectedModels: MODELS,
  })
  assert.equal(request.outputFormat, 'png')
  assert.equal('size' in request, false)
  assert.equal('frameCount' in request, false)
})

test('a custom WIDTHxHEIGHT within the documented bounds is kept', () => {
  const { request } = resolveTestImageRequest({
    body: { prompt: 'banner', size: '1536x864' },
    config: {},
    selectedModels: MODELS,
  })
  assert.equal(request.size, '1536x864')
})

test('the test request refuses an unenabled model and an empty prompt', () => {
  assert.throws(
    () => resolveTestImageRequest({ body: { prompt: 'x', model: 'gpt-image-2.6-sunburst' }, config: {}, selectedModels: ['gpt-image-2.6-flare'] }),
    /is not enabled/,
  )
  assert.throws(
    () => resolveTestImageRequest({ body: { prompt: ' ' }, config: {}, selectedModels: MODELS }),
    /non-empty prompt/,
  )
  assert.throws(
    () => resolveTestImageRequest({ body: { prompt: 'x' }, config: {}, selectedModels: [] }),
    /No image model is enabled/,
  )
})

test('previews inline only up to the byte cap', () => {
  const small = toPreviewImages([{ data: 'AAAA', mimeType: 'image/png' }])
  assert.equal(small[0].bytes, 3)
  assert.equal(small[0].dataUrl, 'data:image/png;base64,AAAA')

  const large = toPreviewImages([{ data: 'A'.repeat(5 * 1024 * 1024), mimeType: 'image/png' }])
  assert.ok(large[0].bytes > TEST_PREVIEW_MAX_BYTES)
  assert.equal('dataUrl' in large[0], false)
})
