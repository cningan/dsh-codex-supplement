# Architecture map — Codex Supplement

This is a single DSH bundle. The old two-package monorepo, non-Codex OAuth providers, generic API image adapters, and video implementation were removed during consolidation. This map names the surviving objects and records the removals as regression-review items.

## Package and composition

| Object | Role | Location | State |
|---|---|---|---|
| `@local/dsh-codex-supplement` | Package, Host module, and sole Client Loader identity | `package.json`, `lib/index.js`, `lib/client.js` | Active |
| Bundle row | Inserts one `codex-supplement` row with an empty config; schema defaults are owned by the Host module | `cordis.patch.yml`, `lib/media/index.js` | Active |
| Host composition | Applies Codex auth/features before subscription media, exports the media `Config`, and unions Host injections (`webServer`, `llm`, `tools`, etc.) | `lib/index.js` | Active |
| Client build | Wraps the two retained UI sources in one Loader factory; `npm run check` and `prepack` regenerate the output | `scripts/build-client.mjs` → `src/client/oauth.js`, `src/client/media.js` → `lib/client.js` | Active; generated output is checked in |

## Host flow

| Object | Role | Location | State |
|---|---|---|---|
| Codex Host installer | Registers `openaiCodexAuth`, model discovery, auth/usage/search routes, Fast Mode, and guarded search-provider patch management | `lib/oauth.js`, `lib/providers/codex/index.mjs` | Active |
| Codex auth and credential record | OAuth/device-code lifecycle; shared official `llm-pi-ai/openai-codex` record is the primary credential source, with one-time legacy-secret migration | `lib/providers/codex/codex-auth-service.mjs`, `codex-credential-record.mjs`, `codex-oauth.mjs` | Active |
| OAuth account metadata store | Stores non-secret account metadata under the existing `oauth-login/codex-accounts.json` path; token material remains in the secret store/official record | `lib/shared/account-store.mjs`, `lib/shared/secret-store.mjs` | Active |
| Search and usage | Codex subscription search request and quota/usage normalization | `lib/providers/codex/search.mjs`, `usage.mjs` | Active |
| Fast Mode | Per-model state and guarded `service_tier: priority` injection for official Codex requests | `lib/providers/codex/fast-mode.mjs`, `fast-mode-store.mjs`, `lib/shared/proxy.mjs` | Active |
| Model list | Official Codex catalog plus plugin-owned model-list state and picker normalization | `lib/providers/model-discovery.mjs`, `lib/model-list-store.mjs` | Active |
| Media config/routes | Codex-only schema, capability/model status routes, live tool reconciliation on config changes | `lib/media/index.js` | Active |
| Subscription image tool | Both established tool names remain; only Codex OAuth and the subscription-managed image engine are accepted | `lib/media/image-tool.js`, `executors.mjs`, `adapters/openai-codex.js`, `model-selection.mjs` | Active |
| Image output | Writes generated files under the current session workspace and returns attachment-compatible output | `lib/media/image-output.mjs` | Active |

### Host route prefix

- OAuth/account/model/usage/search: `/plugins/dsh-codex-supplement/codex/...`
- Fast Mode: `/plugins/dsh-codex-supplement/codex/fast-mode`
- Media capability and managed-model status: `/plugins/dsh-codex-supplement/capabilities` and `/plugins/dsh-codex-supplement/models`

Codex chat itself is provided by DSH's official `openai-codex` provider. This plugin does not register a chat-completions adapter.

## Client flow

| Object | Role | Location | State |
|---|---|---|---|
| Codex settings/login UI | Login presentation, device/manual-code handling, model selection, quota, search and Fast Mode controls | `src/client/oauth.js` | Active source |
| Codex subscription image settings | Master switch, managed-engine selection, sign-in status and carrier display | `src/client/media.js` | Active source |
| Combined Client entry | Exactly one `window.__ModuleLoader__.load` row, id `@local/dsh-codex-supplement`; settings/fast/quota slot IDs are package-prefixed | `lib/client.js` | Generated from sources |

## Data and compatibility

- Credential compatibility remains through the official Codex credential-record adapter and its one-time legacy-token import; no credentials are embedded in this repository.
- Account metadata keeps its prior Codex data path. Fast Mode/search flags and custom model-list JSON are plugin-directory data and are **not** automatically copied from the former `dsh-oauth` plugin directory. Re-enable feature flags and migrate custom lists deliberately if needed.
- Search enablement writes a marked `web` override to the active Profile patch. Removal recognizes both the current marker and the legacy `dsh-oauth` marker, and only removes the plugin-managed lines.

## Removed objects — regression review

The following product surface is intentionally absent; preserve these as explicit non-regression checks:

- Grok, Claude, and Antigravity OAuth providers and provider-specific adapters.
- Generic API-key image providers/catalogs (OpenAI API, Gemini, DashScope, Volcengine, MiniMax, and related adapters).
- Video-generation tool, presets, and video adapter.
- Generic provider registry/LLM adapter framework and the retired Codex chat-completions adapter. DSH's official Codex provider remains the chat implementation.
- Multi-package deployment helper and its Profile-mutating test; deployment is not part of this source repository's checks.

Regression tests are in `test/`: Codex carrier selection, Codex credential-record mapping/refresh, and Codex-managed image-selection guards. No test installs the plugin or reads Profile data.
