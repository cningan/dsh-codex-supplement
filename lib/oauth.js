import { installCodex } from './providers/codex/index.mjs'
import { openaiFetch, resolveProxyConfig } from './shared/proxy.mjs'

const PROXY_TARGET = /(^|\.)(openai\.com|chatgpt\.com|openai\.org)$/i

function isProxyTarget(url) {
  try {
    const input = typeof url === 'string' ? url : url?.url
    return PROXY_TARGET.test(new URL(input).hostname)
  } catch {
    return false
  }
}

/** Existing Codex login, usage, search and Fast Mode host integration. */
export function apply(ctx) {
  const proxyUrl = resolveProxyConfig('').url
  if (proxyUrl && !globalThis.__dshCodexSupplementProxyHooked) {
    const origin = globalThis.fetch
    globalThis.__dshCodexSupplementProxyHooked = true
    globalThis.fetch = (url, init) => isProxyTarget(url)
      ? openaiFetch(url, init, proxyUrl)
      : origin(url, init)
  }
  installCodex(ctx)
}

export const inject = ['webServer', 'llm']
