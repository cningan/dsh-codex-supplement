import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_RESPONSES_MODEL, openaiCodexResponsesImageSubmit } from '../lib/media/adapters/openai-codex.js'

async function submit(model) {
  let payload
  const result = await openaiCodexResponsesImageSubmit({
    prompt: 'test image',
    credential: { access: 'test-token', accountId: 'test-account' },
    ...(model ? { model } : {}),
    http: async (_url, init) => {
      payload = JSON.parse(init.body)
      return {
        ok: true,
        async json() {
          return { output: [{ type: 'image_generation_call', result: 'aGVsbG8=' }] }
        },
      }
    },
  })
  return { payload, result }
}

test('Codex Responses falls back to the known-good chat carrier, not an image model ID', async () => {
  const { payload, result } = await submit()
  assert.equal(DEFAULT_RESPONSES_MODEL, 'gpt-5.5')
  assert.equal(payload.model, 'gpt-5.5')
  assert.equal(payload.tools[0].type, 'image_generation')
  assert.equal(result.model, 'gpt-5.5')
})

test('Codex Responses accepts the official Codex default as the carrier', async () => {
  const { payload, result } = await submit('gpt-6-luna')
  assert.equal(payload.model, 'gpt-6-luna')
  assert.equal(result.model, 'gpt-6-luna')
})
