import { Config as MediaConfig } from '../media/config.mjs'
import { apply as applyOAuth } from '../oauth.js'

/**
 * Base component row (bare package name): OAuth, usage, Fast Mode, logging and
 * the merged Client settings page. It also accepts the old image config fields
 * so existing profile overrides keep validating; the image row itself owns the
 * current defaults (GPT Image 2.6).
 *
 * The Client module is discovered only for this bare-name row
 * (`dsh-client-modules` ignores subpath rows), which is why this row stays the
 * UI carrier.
 */
export const name = 'dsh-codex-supplement'
export const Config = MediaConfig
export const inject = ['webServer']

export function apply(ctx) {
  applyOAuth(ctx)
}
