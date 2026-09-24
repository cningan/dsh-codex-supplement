import {
  DEFAULT_CODEX_BASE_URL,
  OPENAI_CODEX_RESPONSES_IMAGE_PROTOCOL,
  openaiCodexResponsesImageSubmit,
  openaiCodexResponsesImageAdapter,
} from './adapters/openai-codex.js'

const codexAdapter = Object.freeze({
  id: openaiCodexResponsesImageAdapter.id,
  protocolId: OPENAI_CODEX_RESPONSES_IMAGE_PROTOCOL,
  aliases: [],
  name: openaiCodexResponsesImageAdapter.name,
  auth: 'oauth',
  credentialRefs: [],
  defaultBaseUrl: DEFAULT_CODEX_BASE_URL,
  defaultModel: openaiCodexResponsesImageAdapter.defaultResponsesModel,
  defaultResponsesModel: openaiCodexResponsesImageAdapter.defaultResponsesModel,
  defaultImageModel: openaiCodexResponsesImageAdapter.defaultImageModel,
  async submit(params, context) {
    return openaiCodexResponsesImageSubmit({
      ...params,
      credential: context.credential,
      http: context.http,
      signal: context.signal,
    })
  },
})

export function getAdapterById(providerId) {
  return providerId === codexAdapter.id ? codexAdapter : undefined
}

export function getAdapterByProtocol(protocolId) {
  return protocolId === codexAdapter.protocolId ? codexAdapter : undefined
}

export async function runMediaGeneration({ protocolId, request, credential, http, signal }) {
  const adapter = getAdapterByProtocol(protocolId)
  if (adapter === undefined) throw new Error(`Unsupported Codex image protocol: ${protocolId}`)
  const result = await adapter.submit(request ?? {}, {
    credential,
    http: http ?? globalThis.fetch,
    signal,
  })
  if (!Array.isArray(result?.images) || result.images.length === 0) {
    throw new Error('Codex image generation returned no images')
  }
  return result
}
