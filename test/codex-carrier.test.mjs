import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_RESPONSES_MODEL, openaiCodexResponsesImageSubmit } from '../lib/media/adapters/openai-codex.js'

async function submit(extra = {}, response) {
  let payload
  const result = await openaiCodexResponsesImageSubmit({
    prompt: 'test image',
    credential: { access: 'test-token', accountId: 'test-account' },
    ...extra,
    http: async (_url, init) => {
      payload = JSON.parse(init.body)
      return response ?? {
        ok: true,
        async json() {
          return { output: [{ type: 'image_generation_call', result: 'aGVsbG8=' }] }
        },
      }
    },
  })
  return { payload, result }
}

test('the Responses carrier falls back to the known-good chat model', async () => {
  const { payload, result } = await submit()
  assert.equal(DEFAULT_RESPONSES_MODEL, 'gpt-5.5')
  assert.equal(payload.model, 'gpt-5.5')
  assert.equal(payload.tools[0].type, 'image_generation')
  assert.equal(result.carrierModel, 'gpt-5.5')
})

test('an explicit carrier is used for the top-level model only', async () => {
  const { payload, result } = await submit({ carrierModel: 'gpt-6-luna' })
  assert.equal(payload.model, 'gpt-6-luna')
  assert.equal(result.carrierModel, 'gpt-6-luna')
  // carrier 不是图像模型：没传 imageModel 时工具里就不该有 model 字段。
  assert.equal('model' in payload.tools[0], false)
})

test('the image model travels as tool.model, never as the carrier', async () => {
  const { payload, result } = await submit({ carrierModel: 'gpt-6-luna', imageModel: 'gpt-image-2.5-sunburst' })
  assert.equal(payload.tools[0].model, 'gpt-image-2.5-sunburst')
  assert.equal(result.imageModel, 'gpt-image-2.5-sunburst')
  assert.equal(payload.model, 'gpt-6-luna')
})

test('the documented image_generation surface is forwarded field by field', async () => {
  const { payload } = await submit({
    imageModel: 'gpt-image-2.5-flare',
    action: 'edit',
    quality: 'xhigh',
    size: '1536x864',
    background: 'transparent',
    outputFormat: 'webp',
    outputCompression: 80,
    moderation: 'low',
    inputFidelity: 'high',
    partialImages: 2,
    inputImageMask: { image_url: 'data:image/png;base64,AAAA' },
    image: 'https://example.invalid/ref.png',
  })
  const tool = payload.tools[0]
  assert.equal(tool.model, 'gpt-image-2.5-flare')
  assert.equal(tool.action, 'edit')
  assert.equal(tool.quality, 'xhigh')
  assert.equal(tool.size, '1536x864')
  assert.equal(tool.background, 'transparent')
  assert.equal(tool.output_format, 'webp')
  assert.equal(tool.output_compression, 80)
  assert.equal(tool.moderation, 'low')
  assert.equal(tool.input_fidelity, 'high')
  assert.equal(tool.partial_images, 2)
  assert.deepEqual(tool.input_image_mask, { image_url: 'data:image/png;base64,AAAA' })
  assert.equal(payload.input[0].content.length, 2)
  assert.equal(payload.input[0].content[1].type, 'input_image')
})

test('a rejected image model surfaces the status and names the model', async () => {
  await assert.rejects(
    () => submit({ imageModel: 'gpt-image-9-future' }, {
      ok: false,
      status: 400,
      async json() {
        return { error: { message: 'unsupported model' } }
      },
    }),
    (error) => {
      assert.match(error.message, /400/)
      assert.match(error.message, /unsupported model/)
      assert.match(error.message, /gpt-image-9-future/)
      return true
    },
  )
})
