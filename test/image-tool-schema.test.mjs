import test from 'node:test'
import assert from 'node:assert/strict'
import {
  IMAGE_TOOL_NAME,
  buildImageToolDescription,
  buildImageToolOutputSchema,
  buildImageToolParameters,
  renderImageToolOutput,
} from '../lib/media/image-tool-schema.mjs'

const ENABLED = ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']

test('there is exactly one image tool name', () => {
  assert.equal(IMAGE_TOOL_NAME, 'codex-generate-image')
  // 旧的第二个工具名不得以任何形式回来
  assert.notEqual(IMAGE_TOOL_NAME, 'media-image-codex')
})

test('the parameter set carries the image model as an ordinary argument', () => {
  const parameters = buildImageToolParameters({ models: ENABLED, defaultModel: 'gpt-image-2.5-flare' })
  assert.deepEqual(Object.keys(parameters).sort(), [
    'action', 'background', 'format', 'image', 'model', 'prompt', 'quality', 'size',
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
  assert.match(one.model.description, /Defaults to gpt-image-2\.5-sunburst/)
})

test('an empty selection produces no enum rather than an empty one', () => {
  const none = buildImageToolParameters({ models: [], defaultModel: '' })
  assert.equal('enum' in none.model, false)
})

test('the official remaining fields are offered with their documented values', () => {
  const parameters = buildImageToolParameters({ models: ENABLED, defaultModel: ENABLED[0] })
  assert.deepEqual(parameters.quality.enum, ['auto', 'low', 'medium', 'high', 'xhigh', 'max'])
  assert.deepEqual(parameters.background.enum, ['auto', 'transparent', 'opaque'])
  assert.deepEqual(parameters.action.enum, ['auto', 'generate', 'edit'])
  assert.deepEqual(parameters.format.enum, ['png', 'jpeg', 'webp'])
  // 任意 WIDTHxHEIGHT 是 2/2.5 系的能力，说明必须提到它，否则模型只会用三个标准尺寸
  assert.match(parameters.size.description, /WIDTHxHEIGHT/)
})

test('the description names the enabled models and their tiers', () => {
  const description = buildImageToolDescription({
    models: ENABLED,
    defaultModel: 'gpt-image-2.5-flare',
    outputNote: 'OUTPUT-NOTE',
  })
  assert.match(description, /gpt-image-2\.5-flare（快速档）/)
  assert.match(description, /gpt-image-2\.5-sunburst（高质量档）/)
  assert.match(description, /Default: gpt-image-2\.5-flare/)
  assert.match(description, /OUTPUT-NOTE/)
  // carrier 与图像模型必须被说成两件事，否则模型会把两者混用
  assert.match(description, /carrier/)
})

test('the output schema separates the image model from the carrier', () => {
  const schema = buildImageToolOutputSchema()
  assert.deepEqual(Object.keys(schema.properties).sort(), ['carrier', 'files', 'model', 'summary'])
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
