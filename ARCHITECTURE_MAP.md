# Architecture map — Codex Supplement

This is a single DSH bundle. The old two-package monorepo, non-Codex OAuth providers, generic API image adapters, and video implementation were removed during consolidation. This map names the surviving objects and records the removals as regression-review items.

## Package and composition

| Object | Role | Location | State |
|---|---|---|---|
| `@local/dsh-codex-supplement` | Package, Host module, and sole Client Loader identity | `package.json`, `lib/index.js`, `lib/client.js` | Active |
| Bundle row | Inserts one `codex-supplement` row with an empty config; schema defaults are owned by the Host module | `cordis.patch.yml`, `lib/media/index.js` | Active |
| Host composition | Applies Codex auth/features before subscription media, exports the media `Config`, and unions the required Host injections | `lib/index.js` | Active |
| Client build | Wraps the two retained UI sources in one Loader factory; `npm run check` and `prepack` regenerate the output | `scripts/build-client.mjs` → `src/client/oauth.js`, `src/client/media.js` → `lib/client.js` | Active; generated output is checked in |

## Host flow

| Object | Role | Location | State |
|---|---|---|---|
| Codex Host installer | Registers `openaiCodexAuth`, auth/usage/search routes, Fast Mode, and guarded search-provider patch management | `lib/oauth.js`, `lib/providers/codex/index.mjs` | Active |
| Codex auth and credential record | OAuth/device-code lifecycle; shared official `llm-pi-ai/openai-codex` record is the primary credential source, with one-time legacy-secret migration | `lib/providers/codex/codex-auth-service.mjs`, `codex-credential-record.mjs`, `codex-oauth.mjs` | Active |
| OAuth account metadata store | Stores non-secret account metadata under the existing `oauth-login/codex-accounts.json` path; token material remains in the secret store/official record | `lib/shared/account-store.mjs`, `lib/shared/secret-store.mjs` | Active |
| Search and usage | Codex subscription search request and quota/usage normalization | `lib/providers/codex/search.mjs`, `usage.mjs` | Active |
| Fast Mode | Per-model state and guarded `service_tier: priority` injection for official Codex requests | `lib/providers/codex/fast-mode.mjs`, `fast-mode-store.mjs`, `lib/shared/proxy.mjs` | Active |
| Chat model catalog ownership | The DSH official `openai-codex` provider owns **chat** model IDs and input/output/context metadata; this plugin has no duplicate chat catalog, editor, or model-list route | official `dsh-llm-pi-ai` provider + official Models page | Active boundary |
| Image model catalog | The official `image_generation` tool's `model` ids, tiers (fast / quality / legacy) and labels; one source shared by the settings page, the tool schema and the capability route | `lib/media/image-models.mjs` | Active |
| Image model selection | Two independent layers: config `imageModels`/`defaultImageModel` decide what is allowed and whether the tool exists at all; the tool's own `model` argument picks the tier per call | `lib/media/model-selection.mjs` | Active |
| Media config/routes | Codex-only schema, subscription capability status route, live tool reconciliation on config changes | `lib/media/index.js` | Active |
| Subscription image tool | **One** tool name, `codex-generate-image`; the `model` argument selects the image model while the remote `carrier` stays the official Codex chat model | `lib/media/image-tool.js`, `executors.mjs` | Active |
| Image tool schema | The tool's parameter/description/output shape as plain data, so the single name, the `model` enum, and the removed `aspectRatio` are asserted offline — `@deepseek-ai/dsh-tools` lives only in a DSH profile tree, so the tool module itself cannot be imported by this repo's tests | `lib/media/image-tool-schema.mjs` | Active |
| Image request protocol | Builds the hosted `image_generation` tool (`model`, `action`, `size`, `quality`, `background`, `output_format`, `output_compression`, `moderation`, `input_fidelity`, `partial_images`, `input_image_mask`), parses SSE/JSON, reports a rejected image model with its status and id | `lib/media/adapters/openai-codex.js` | Active |
| Image output | Writes generated files under the current session workspace and returns attachment-compatible output | `lib/media/image-output.mjs` | Active |

### Host route prefix

- OAuth/account/usage/search: `/plugins/dsh-codex-supplement/codex/...`
- Fast Mode: `/plugins/dsh-codex-supplement/codex/fast-mode`
- Media capability status: `/plugins/dsh-codex-supplement/capabilities`

Codex chat itself is provided by DSH's official `openai-codex` provider. This plugin does not register a chat-completions adapter.

## Client flow

| Object | Role | Location | State |
|---|---|---|---|
| Unified Codex settings page | One `settings.section` entry; login, quota, search, Fast Mode and subscription-image controls render together; normal chat model settings remain in the official Models page | `src/client/oauth.js`, `src/client/media.js` | Active source |
| Image-model selection UI | Per-model checkboxes from the capability route's `catalog` plus a default-tier selector; toggling writes `imageModels`/`defaultImageModel` in one `settings.mutate` | `src/client/media.js` | Active source |
| Combined Client entry | Exactly one `window.__ModuleLoader__.load` row and one settings page, id `@local/dsh-codex-supplement-settings`; fast/quota slot IDs remain package-prefixed. Settings shell currently supplies its generic gear icon. | `scripts/build-client.mjs` → `lib/client.js` | Generated from sources |

## Data and compatibility

- Credential compatibility remains through the official Codex credential-record adapter and its one-time legacy-token import; no credentials are embedded in this repository.
- Account metadata keeps its prior Codex data path. Fast Mode/search flags are plugin-directory data and are **not** automatically copied from the former plugin.
- Image-model selection replaced the single `codex-managed-image` sentinel. The legacy `enableProviders`/`providerModelSelections` fields are still **read once for migration only** (`lib/media/model-selection.mjs` distinguishes "explicitly disabled" from "never configured"); the legacy sentinel is never forwarded upstream. Chat model lists are configured only in the official Models → OpenAI Codex entry.
- **Unproven boundary:** the Codex subscription endpoint has no public schema. The official `image_generation` contract comes from the API-key SDK, so whether the subscription endpoint accepts a given `model` id can only be established by a live call. A rejection is surfaced verbatim (status + id); the plugin never silently substitutes another model.
- Search enablement writes a marked `web` override to the active Profile patch. Removal recognizes both the current marker and the legacy `dsh-oauth` marker, and only removes the plugin-managed lines.

## Removed objects — regression review

The following product surface is intentionally absent; preserve these as explicit non-regression checks:

- Grok, Claude, and Antigravity OAuth providers and provider-specific adapters.
- Generic API-key image providers/catalogs (OpenAI API, Gemini, DashScope, Volcengine, MiniMax, and related adapters).
- Video-generation tool, presets, and video adapter. (Codex/Codec has no subscription video path, so none is planned.)
- Generic provider registry/LLM adapter framework and the retired Codex chat-completions adapter. DSH's official Codex provider remains the chat implementation.
- Duplicate Codex **chat** model discovery, OAuth-page model editor, plugin-owned model-list store, and model-list routes; the official OpenAI Codex provider is the sole chat catalog and capability owner.
- The second image tool name `media-image-codex` (merged into `codex-generate-image`) and the `codex-managed-image` image-engine sentinel (replaced by the model list).
- The dead `aspectRatio` tool parameter: the official tool expresses aspect ratio through `size`, so a separate hint was accepted and then dropped.
- Multi-package deployment helper and its Profile-mutating test; deployment is not part of this source repository's checks.

Regression tests are in `test/`: Codex carrier/image-model separation and tool-payload shape, Codex credential-record mapping/refresh, and image-model selection resolution (including legacy migration and rejection messages). No test installs the plugin or reads Profile data.
