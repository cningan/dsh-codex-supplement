import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { createBrowserOAuthAuthorizer } from '../lib/shared/browser-oauth-authorizer.mjs'

function connect(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port })
    socket.setTimeout(2000)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); reject(new Error(`timeout ${host}:${port}`)) })
    socket.once('error', reject)
  })
}

function createAuthorizer() {
  return createBrowserOAuthAuthorizer({
    providerId: 'probe',
    callbackHost: '127.0.0.1',
    callbackPort: 0,
    callbackPath: '/auth/callback',
    authorizationUrlBuilder: () => 'https://example.invalid/authorize',
    exchangeCode: async () => ({ access: 'token' }),
    importCredentials: async () => [{ accountId: 'probe' }],
  })
}

test('the loopback callback listens on IPv4 and IPv6 so localhost works on macOS', async (t) => {
  const authorizer = createAuthorizer()
  const session = await authorizer.begin()
  t.after(() => authorizer.cancel(session.sessionId))
  assert.equal(session.status, 'pending')
  assert.ok(session.redirectUri, 'the session must expose the callback URL it actually listens on')
  const port = Number(new URL(session.redirectUri).port)
  await assert.doesNotReject(() => connect('127.0.0.1', port), 'IPv4 loopback should accept the callback')
  await assert.doesNotReject(() => connect('::1', port), 'IPv6 loopback should accept the callback too')
})

test('a callback with a mismatched state fails instead of silently logging in', async (t) => {
  const authorizer = createAuthorizer()
  const session = await authorizer.begin()
  t.after(() => authorizer.cancel(session.sessionId))
  const port = Number(new URL(session.redirectUri).port)
  const url = `http://[::1]:${port}/auth/callback?code=test-code&state=wrong-state`
  const response = await fetch(url)
  assert.equal(response.status, 200)
  const polled = await authorizer.poll(session.sessionId)
  assert.equal(polled.status, 'failed')
  assert.match(polled.diagnostic ?? '', /state/)
})
