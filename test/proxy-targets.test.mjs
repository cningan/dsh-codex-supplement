import test from 'node:test'
import assert from 'node:assert/strict'
import { isOpenAITarget } from '../lib/shared/proxy.mjs'

test('Codex proxy allowlist includes OpenAI subscription domains', () => {
  assert.equal(isOpenAITarget('https://api.openai.com/v1/models'), true)
  assert.equal(isOpenAITarget('https://chatgpt.com/backend-api/codex/responses'), true)
  assert.equal(isOpenAITarget('https://cdn.oaistatic.com/assets/image.png'), true)
})

test('Codex proxy allowlist excludes removed non-Codex providers', () => {
  assert.equal(isOpenAITarget('https://api.x.ai/v1'), false)
  assert.equal(isOpenAITarget('https://api.anthropic.com/v1'), false)
  assert.equal(isOpenAITarget('https://accounts.google.com/'), false)
})
