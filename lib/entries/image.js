import { Config as MediaConfig, apply as applyMedia, inject as mediaInject } from '../media/index.js'

/** Image component row: image tool, settings form and test-generation route. */
export const name = 'dsh-codex-supplement-image'
export const Config = MediaConfig
/** Wait for the base row's services so image generation cannot mount without auth. */
export const inject = [...mediaInject, 'openaiCodexAuth', 'codexSupplementLegacyMedia']

export function apply(ctx, config) {
  return applyMedia(ctx, config, () => ctx.get('codexSupplementLegacyMedia')?.values)
}
