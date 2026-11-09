import { Config, apply, inject } from '../media/index.js'

/**
 * Host-only media component for callers that explicitly want a separate media row.
 *
 * The shipped bundle does **not** use this subpath: `dsh-client-modules` ignores
 * subpath rows for Client discovery, so the settings page would disappear. The
 * bundle's bare `codex-supplement` row uses the package root, which also keeps
 * old profile config on that row intact.
 */
export const name = 'dsh-codex-supplement-media'
export { Config, apply, inject }
