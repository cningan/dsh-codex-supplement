import * as codexOAuth from './oauth.js'
import * as codexMedia from './media/index.js'

/** The media schema owns the single combined plugin row's configuration. */
export const Config = codexMedia.Config

/** Required Host services are the union of the existing auth and image modules. */
export const inject = [...new Set([...codexOAuth.inject, ...codexMedia.inject, 'llm'])]

/** Compose the existing Codex auth provider before its image-tool consumer. */
export function apply(ctx, config) {
  codexOAuth.apply(ctx)
  codexMedia.apply(ctx, config)
}
