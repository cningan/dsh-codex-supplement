import { installCodexSearch } from '../providers/codex/search-feature.mjs'

/** Search component row: Codex web-search provider, toggle/status routes. */
export const name = 'dsh-codex-supplement-search'
export const inject = ['webServer', 'openaiCodexAuth']

export function apply(ctx) {
  installCodexSearch(ctx)
}
