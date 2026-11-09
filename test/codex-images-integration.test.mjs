import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { openaiCodexImagesSubmit } from '../lib/media/adapters/openai-codex.js'
import { resolveTestImageRequest } from '../lib/media/test-request.mjs'

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })
}

test('a test-panel request reaches the Images endpoint and returns a usable image', async (t) => {
  const captured = []
  const payload = Buffer.from('fake-png-bytes').toString('base64')
  const server = http.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    captured.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
    })
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      created: 123,
      data: [{ b64_json: payload }],
      size: '1024x1024',
      quality: 'high',
      output_format: 'png',
    }))
  })
  const port = await listen(server)
  t.after(() => new Promise((resolve) => server.close(resolve)))

  const resolved = resolveTestImageRequest({
    body: {
      prompt: 'a red apple on a white background',
      model: 'gpt-image-2.6-flare',
      quality: 'high',
      size: '1024x1024',
      output_format: 'png',
    },
    config: {
      defaultImageModel: 'gpt-image-2.6-flare',
      imageModelDefaults: { 'gpt-image-2.6-flare': { quality: 'high' } },
    },
    selectedModels: ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'],
  })

  const result = await openaiCodexImagesSubmit({
    ...resolved.request,
    credential: { access: 'test-access', accountId: 'test-account' },
    http: globalThis.fetch,
    baseUrl: `http://127.0.0.1:${port}/backend-api`,
  })

  assert.equal(captured.length, 1)
  const request = captured[0]
  assert.equal(request.method, 'POST')
  assert.equal(request.url, '/backend-api/codex/images/generations')
  assert.deepEqual(request.body, {
    prompt: 'a red apple on a white background',
    model: 'gpt-image-2.6-flare',
    n: 1,
    size: '1024x1024',
    quality: 'high',
  })
  assert.equal(request.headers.authorization, 'Bearer test-access')
  assert.equal(request.headers['chatgpt-account-id'], 'test-account')
  assert.equal(request.headers['content-type'], 'application/json')

  assert.equal(result.carrierModel, 'codex/images')
  assert.equal(result.imageModel, 'gpt-image-2.6-flare')
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].data, payload)
  assert.equal(result.images[0].mimeType, 'image/png')
  assert.deepEqual(result.effective, { size: '1024x1024', quality: 'high', output_format: 'png' })
})

test('a normal JSON response is not parsed as an SSE stream', async (t) => {
  const payload = Buffer.from('json-image').toString('base64')
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ created: 1, data: [{ b64_json: payload }] }))
  })
  const port = await listen(server)
  t.after(() => new Promise((resolve) => server.close(resolve)))

  const result = await openaiCodexImagesSubmit({
    prompt: 'x',
    imageModel: 'gpt-image-2.6-flare',
    credential: { access: 'test-access', accountId: 'test-account' },
    http: globalThis.fetch,
    baseUrl: `http://127.0.0.1:${port}/backend-api`,
    quality: 'auto',
    outputFormat: 'png',
  })
  assert.equal(result.images[0].data, payload)
})

test('a JSON error body keeps the HTTP status in the error', async (t) => {
  const server = http.createServer((_request, response) => {
    response.writeHead(403, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ detail: 'Forbidden' }))
  })
  const port = await listen(server)
  t.after(() => new Promise((resolve) => server.close(resolve)))

  await assert.rejects(
    () => openaiCodexImagesSubmit({
      prompt: 'x',
      imageModel: 'gpt-image-2.6-flare',
      credential: { access: 'test-access', accountId: 'test-account' },
      http: globalThis.fetch,
      baseUrl: `http://127.0.0.1:${port}/backend-api`,
    }),
    /403.*Free does not include this image lane/,
  )
})
