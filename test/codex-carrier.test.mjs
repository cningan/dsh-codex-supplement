import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_RESPONSES_MODEL,
  openaiCodexImagesSubmit,
  openaiCodexResponsesImageSubmit,
} from '../lib/media/adapters/openai-codex.js'

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

async function submitImages(extra = {}, response) {
  let request
  const result = await openaiCodexImagesSubmit({
    prompt: 'a red apple',
    credential: { access: 'test-token', accountId: 'test-account' },
    imageModel: 'gpt-image-2.6-flare',
    quality: 'high',
    size: '1024x1024',
    ...extra,
    http: async (url, init) => {
      request = { url, body: JSON.parse(init.body) }
      return response ?? {
        ok: true,
        async json() {
          return {
            created: 1,
            data: [{ b64_json: 'aGVsbG8=' }],
            size: '1024x1024',
            quality: 'high',
            output_format: 'png',
          }
        },
      }
    },
  })
  return { request, result }
}

test('generation uses the dedicated Codex Images endpoint', async () => {
  const { request, result } = await submitImages()
  assert.equal(request.url, 'https://chatgpt.com/backend-api/codex/images/generations')
  assert.deepEqual(request.body, {
    prompt: 'a red apple',
    model: 'gpt-image-2.6-flare',
    n: 1,
    size: '1024x1024',
    quality: 'high',
  })
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].mimeType, 'image/png')
  assert.equal(result.carrierModel, 'codex/images')
  assert.deepEqual(result.effective, { size: '1024x1024', quality: 'high', output_format: 'png' })
})

test('edits use the dedicated Codex Images edit endpoint', async () => {
  const { request } = await submitImages({
    action: 'edit',
    image: 'data:image/png;base64,AAAA',
  })
  assert.equal(request.url, 'https://chatgpt.com/backend-api/codex/images/edits')
  assert.deepEqual(request.body.images, [{ image_url: 'data:image/png;base64,AAAA' }])
  assert.deepEqual(request.body, {
    prompt: 'a red apple',
    model: 'gpt-image-2.6-flare',
    n: 1,
    size: '1024x1024',
    quality: 'high',
    images: [{ image_url: 'data:image/png;base64,AAAA' }],
  })
})

test('the Free-plan 403 is explained in the error', async () => {
  await assert.rejects(
    () => submitImages({}, {
      ok: false,
      status: 403,
      async json() {
        return { detail: 'Forbidden' }
      },
    }),
    /Free does not include this image lane/,
  )
})

test('hosted-tool-only controls are rejected by the Images lane', async () => {
  await assert.rejects(() => submitImages({ complexity: 'high' }), /Complexity is not supported/)
  await assert.rejects(() => submitImages({ outputCompression: 80 }), /not supported/)
  await assert.rejects(() => submitImages({ outputFormat: 'webp' }), /use png or gif/)
  await assert.rejects(() => submitImages({ quality: 'max' }), /supported: auto, low, medium, high/)
})

test('the Responses carrier defaults to a ChatGPT-account model', async () => {
  const { payload, result } = await submit()
  assert.equal(DEFAULT_RESPONSES_MODEL, 'gpt-5.6-terra')
  assert.equal(payload.model, 'gpt-5.6-terra')
  assert.equal(payload.tools[0].type, 'image_generation')
  assert.deepEqual(payload.tool_choice, { type: 'image_generation' })
  assert.equal(result.carrierModel, 'gpt-5.6-terra')
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

test('a 200 response without an image surfaces the assistant text', async () => {
  await assert.rejects(
    () => submit({}, {
      ok: true,
      async json() {
        return {
          output: [{
            type: 'message',
            content: [{ type: 'output_text', text: 'Image generation is not available on this plan.' }],
          }],
        }
      },
    }),
    /Image generation is not available on this plan/,
  )
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

