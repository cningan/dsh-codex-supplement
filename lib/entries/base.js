import { Service } from '@deepseek-ai/cordis'
import { Config as MediaConfig } from '../media/config.mjs'
import { apply as applyOAuth } from '../oauth.js'

/**
 * Base component row (bare package name): OAuth, usage, Fast Mode and the
 * merged Client settings page. It also carries the **legacy** image config
 * fields so an old profile override on `codex-supplement` keeps validating;
 * the image row reads these once as migration defaults.
 *
 * The Client module is discovered only for this bare-name row (`dsh-client-modules`
 * ignores subpath rows), which is why this row must stay the UI carrier.
 */
export const name = 'dsh-codex-supplement'

/** Same schema as the image row, so old media config keys remain valid here. */
export const Config = MediaConfig
export const inject = ['webServer']

const LEGACY_FIELDS = Object.freeze([
  'enableImageGeneration',
  'imageModels',
  'imageQuality',
  'imageComplexity',
  'imageOutputDir',
  'enableProviders',
  'providerModelSelections',
])

class LegacyMediaConfigService extends Service {
  constructor(ctx, values) {
    super(ctx, 'codexSupplementLegacyMedia')
    this.values = values
  }
}

function pickLegacy(config) {
  const values = {}
  for (const field of LEGACY_FIELDS) {
    const raw = config?.[field]
    if (raw === undefined) continue
    // Loader Config fields may be accessor objects (`.get()`); unwrap before handing
    // them to the image row, otherwise a valid old array looks like a non-array.
    values[field] = typeof raw?.get === 'function' ? raw.get() : raw
  }
  return values
}

export function apply(ctx, config) {
  // Provides the values to the image row lazily (the service resolves at image apply time).
  new LegacyMediaConfigService(ctx, pickLegacy(config))
  applyOAuth(ctx)
}
