import { Config as MediaConfig, apply as applyMedia, inject as mediaInject } from '../media/index.js'

/** Image component row: image tool, settings form and test-generation route. */
export const name = 'dsh-codex-supplement-image'
export const Config = MediaConfig
/** Image generation cannot mount without the base row's auth service. */
export const inject = [...mediaInject, 'openaiCodexAuth']

export function apply(ctx, config) {
  return applyMedia(ctx, config)
}
