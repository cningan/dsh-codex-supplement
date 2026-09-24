import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CODEX_CREDENTIAL_KEY,
  CODEX_RECORD_REFRESH_MARGIN_MS,
  fromRecordPayload,
  needsRefresh,
  toRecordPayload,
} from '../lib/providers/codex/codex-credential-record.mjs'

test('Codex credential adapter maps only the shared record fields and normalizes expiry', () => {
  const result = toRecordPayload({
    access: 'test-access-token',
    refresh: 'test-refresh-token',
    expiresAt: '1700000000',
    accountId: 'test-account',
    privateExtra: 'discard-this',
  })
  assert.deepEqual(result, {
    type: 'oauth',
    access: 'test-access-token',
    refresh: 'test-refresh-token',
    expires: 1_700_000_000_000,
    accountId: 'test-account',
  })
  assert.equal(CODEX_CREDENTIAL_KEY, 'llm-pi-ai/openai-codex')
  assert.equal(JSON.stringify(result).includes('privateExtra'), false)
})

test('Codex credential adapter rejects missing access and preserves only accepted payload fields', () => {
  assert.equal(toRecordPayload({ refresh: 'test-refresh-token' }), undefined)
  assert.deepEqual(fromRecordPayload({
    type: 'grant',
    access: 'test-access-token',
    refresh: 'test-refresh-token',
    expires: 1_700_000_000_000,
    accountId: 'test-account',
    untrusted: 'discard-this',
  }), {
    type: 'grant',
    access: 'test-access-token',
    accountId: 'test-account',
    refresh: 'test-refresh-token',
    expires: 1_700_000_000_000,
    expiresAt: '2023-11-14T22:13:20.000Z',
  })
})

test('Codex credential refresh threshold is explicit and leaves records without expiry alone', () => {
  const now = 1_700_000_000_000
  assert.equal(needsRefresh({ expires: now + CODEX_RECORD_REFRESH_MARGIN_MS + 1 }, now), false)
  assert.equal(needsRefresh({ expires: now + CODEX_RECORD_REFRESH_MARGIN_MS }, now), true)
  assert.equal(needsRefresh({ access: 'test-access-token' }, now), false)
})
