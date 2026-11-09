import test from 'node:test'
import assert from 'node:assert/strict'
import {
  IMAGE_TOOL_NAME,
  buildImageToolDescription,
  buildImageToolOutputSchema,
  buildImageToolParameters,
  renderImageToolOutput,
} from '../lib/media/image-tool-schema.mjs'

const ENABLED = ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst']

test('there is exactly one image tool name', () => {
  assert.equal(IMAGE_TOOL_NAME, 'codex-generate-image')
  // 旧的第二个工具名不得以任何形式回来
  assert.notEqual(IMAGE_TOOL_NAME, 'media-image-codex')
})

test('the parameter set carries the image model as an ordinary argument', () => {
  const parameters = buildImageToolParameters({ models: ENABLED, defaultModel: 'gpt-image-2.6-flare' })
  assert.deepEqual(Object.keys(parameters).sort(), [
    'action', 'background', 'frame_duration_ms', 'frames', 'image', 'model',
    'output_format', 'prompt', 'quality', 'size',
  ])
  assert.equal(parameters.prompt.required, true)
  assert.deepEqual(parameters.model.enum, ENABLED)
})

test('the dead aspectRatio hint is gone', () => {
  const parameters = buildImageToolParameters({ models: ENABLED, defaultModel: ENABLED[0] })
  assert.equal('aspectRatio' in parameters, false)
  assert.equal('aspect_ratio' in parameters, false)
})

test('the model enum mirrors the enabled selection, not the whole catalog', () => {
  const one = buildImageToolParameters({ models: ['gpt-image-2.5-sunburst'], defaultModel: 'gpt-image-2.5-sunburst' })
  assert.deepEqual(one.model.enum, ['gpt-image-2.5-sunburst'])
  assert.match(one.model.description, /configured default model \(gpt-image-2\.5-sunburst\)/)
})

test('an empty selection produces no enum rather than an empty one', () => {
  const none = buildImageToolParameters({ models: [], defaultModel: '' })
  assert.equal('enum' in none.model, false)
})

test('the official remaining fields are offered with their documented values', () => {
  const parameters = buildImageToolParameters({ models: ENABLED, defaultModel: ENABLED[0] })
  assert.deepEqual(parameters.quality.enum, ['auto', 'low', 'medium', 'high'])
  assert.deepEqual(parameters.background.enum, ['auto', 'transparent', 'opaque'])
  assert.deepEqual(parameters.action.enum, ['auto', 'generate', 'edit'])
  assert.equal('complexity' in parameters, false)
  assert.deepEqual(parameters.output_format.enum, ['png', 'gif'])
  // 任意 WIDTHxHEIGHT 是 2/2.5/2.6 系的能力，说明必须提到它，否则模型只会用三个标准尺寸
  assert.match(parameters.size.description, /WIDTHxHEIGHT/)
})

test('GIF parameters disappear when no enabled model supports them', () => {
  const legacy = buildImageToolParameters({ models: ['gpt-image-2.5-flare'], defaultModel: 'gpt-image-2.5-flare' })
  assert.equal('complexity' in legacy, false)
  assert.equal('frames' in legacy, false)
  assert.equal('frame_duration_ms' in legacy, false)
  assert.deepEqual(legacy.output_format.enum, ['png'])
})

test('the description names the enabled models and their tiers', () => {
  const description = buildImageToolDescription({
    models: ENABLED,
    defaultModel: 'gpt-image-2.6-flare',
    outputNote: 'OUTPUT-NOTE',
  })
  assert.match(description, /gpt-image-2\.6-flare（快速档）/)
  assert.match(description, /gpt-image-2\.6-sunburst（高质量档）/)
  assert.match(description, /configured default model \(gpt-image-2\.6-flare\) is used/)
  assert.match(description, /OUTPUT-NOTE/)
  // 旧 carrier/hosted-tool 的说法不得回来
  assert.match(description, /dedicated Codex Images endpoint/)
  assert.doesNotMatch(description, /The Codex chat model is only the Responses carrier/)
})

test('the quality default and support range are disclosed', () => {
  const withDefault = buildImageToolParameters({ models: ENABLED, defaultQuality: 'high' })
  assert.match(withDefault.quality.description, /Default follows the selected model: high/)
  const fallback = buildImageToolParameters({ models: ENABLED })
  assert.match(fallback.quality.description, /Default follows the selected model: auto/)
  // 支持范围必须写明，否则模型会以为每个模型都有 xhigh/max
  assert.match(fallback.quality.description, /auto, low, medium and high/)
})

test('the output schema separates the image model from the carrier', () => {
  const schema = buildImageToolOutputSchema()
  assert.deepEqual(Object.keys(schema.properties).sort(), ['carrier', 'effective', 'files', 'model', 'summary'])
  assert.equal(schema.properties.files.required, true)
  assert.equal(schema.properties.summary.required, true)
})

test('the renderer emits paths, not image content', () => {
  const rendered = renderImageToolOutput({}, {
    summary: 'Generated 1 image with gpt-image-2.5-flare',
    files: [{ path: 'D:\\ws\\images\\a.png', bytes: 12, mediaType: 'image/png' }],
  })
  assert.equal(rendered.length, 1)
  assert.match(rendered[0].text, /Generated 1 image with gpt-image-2\.5-flare/)
  assert.match(rendered[0].text, /D:\\ws\\images\\a\.png/)
})
