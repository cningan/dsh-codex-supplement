# Codex Supplement specification and code map

This is the canonical current specification and source-navigation map for the package. It records the supported product surface, user-visible contracts, important boundaries, and the responsibilities of the implementation files. Source and tests remain authoritative when this document is stale. Update this file when those responsibilities or contracts change; release chronology belongs in [CHANGELOG.md](CHANGELOG.md).

## Purpose and scope

Codex Supplement is one DeepSeek Harness local bundle, package identity @cningan/dsh-codex-supplement. It combines ChatGPT/Codex OAuth sign-in, subscription usage/quota, optional subscription web search, per-model Fast Mode, and Codex subscription image generation. It was consolidated from the former dsh-oauth and dsh-multimedia packages; the release record is in [CHANGELOG.md](CHANGELOG.md).

The official DSH openai-codex provider owns Codex chat execution, chat-model IDs, and input/output/context capabilities. This package adds adjacent account and subscription features; it does not register a chat-completions adapter or maintain another chat-model catalog. The package is intended for a DSH local-plugin tree, targets the DSH 0.1.7-rc.1 baseline and Node.js 22+, and is not published to npm. See [README.md](README.md) for installation and maintenance commands, and [SECURITY.md](SECURITY.md) for security policy.

Out of scope are non-Codex OAuth providers, API-key image adapters, and video generation. The explicit removed-surface regression list appears below.

## Package composition and integration

- [package.json](package.json) declares one package, its Host entry, combined web Client export, optional DSH peer dependencies, and bundle patch. [cordis.patch.yml](cordis.patch.yml) inserts one codex-supplement row with empty config.
- [lib/index.js](lib/index.js) composes the Codex OAuth Host feature before the image feature, exports the media Config, and unions their required Host injections. [lib/oauth.js](lib/oauth.js) installs the Codex Host integration and, when configured, the OpenAI proxy hook.
- [lib/media/index.js](lib/media/index.js) owns the image settings schema, capability route, and live image-tool registration. The tool is reconciled when volatile config changes.
- [src/client/oauth.js](src/client/oauth.js) and [src/client/media.js](src/client/media.js) are the retained Client sources. [scripts/build-client.mjs](scripts/build-client.mjs) combines their factories into the single generated [lib/client.js](lib/client.js) Loader entry. The generated bundle is checked in; npm run check and prepack rebuild it.

The merged Client has Loader identity @cningan/dsh-codex-supplement, one settings section with id @cningan/dsh-codex-supplement-settings, and package-prefixed Fast Mode/quota slot IDs. The settings section combines sign-in/account controls with subscription image controls; the settings shell currently supplies its generic gear icon. Normal chat-model configuration remains in the official Models → OpenAI Codex entry.

## Observable behavior and contracts

### Sign-in, usage, search, and Fast Mode

The Codex settings card provides sign-in/sign-out, browser and device-code authorization status, account display, quota/usage, optional search, and Fast Mode controls. The conversation input toolbar exposes quota and Fast Mode controls only for Codex conversations. The Client recognizes both the legacy codex route key and the official openai-codex provider key for display; the Fast Mode request injector separately targets the official Codex Responses endpoint and enabled model IDs.

Host routes are under /plugins/dsh-codex-supplement/codex/: status, login, login-device, poll, submit-code, cancel, logout, usage, search, and fast-mode. The media capability/status route is /plugins/dsh-codex-supplement/capabilities. These are plugin Host routes, not a public external API promise.

The primary credential source is the official DSH credential record llm-pi-ai/openai-codex, shared with the official Codex conversation provider. The former secret-store credential can seed that record once when absent; credentials are not stored in this source repository. Account metadata remains at the existing oauth-login/codex-accounts.json location, while Fast Mode and search flags are stored under the plugin data directory in data/fast-mode.json. `data/fast-mode.json` is local state, ignored by Git and excluded from the package allowlist; carry it forward separately when moving the active plugin data directory.

Enabling Codex search registers the optional Codex search provider and writes a marked web override selecting openai-codex into the active Profile cordis.patch.yml. Disabling it removes only the plugin-managed marked block (including the recognized legacy dsh-oauth marker); unmarked, hand-written web overrides are left intact. This is an intentional Profile-side effect and should be reviewed before enabling the setting.

Fast Mode is tracked per model. For matching Codex Responses requests, the Host injects service_tier: priority through the fetch/proxy path. The injection is fail-open: if its parsing or modification path fails, the original request continues; Fast Mode may then not take effect, but it does not block the conversation.

### Subscription image generation

The package exposes one tool, codex-generate-image, for the Codex subscription-backed Responses image_generation flow. It supports image generation and editing with an optional reference image. It is not the OpenAI API-key Images endpoint or a generic multi-provider image framework.

The image-generation tool is registered only when enableImageGeneration is true and at least one image model is selected. The imageModels list is the allowlist for the tool's model argument; list order sets the fallback, so the first selected model is used when a call omits model. A requested model outside the list is refused with the allowed values. The built-in selected list is gpt-image-2.5-flare and gpt-image-2.5-sunburst; the built-in catalog and labels are in [lib/media/image-models.mjs](lib/media/image-models.mjs). Syntactically valid custom IDs can be entered even when absent from that catalog, but this does not establish that the remote subscription endpoint supports them.

The request contains two distinct model concepts. The top-level Responses model is the Codex chat-model carrier, obtained from the official Codex selection with a code-owned fallback if unavailable. The nested image_generation.model is the image engine, obtained from the package allowlist. They must not be substituted for one another. The user-facing tool accepts prompt, model, size, quality, background, action, format, and optional image input. The adapter request builder also supports optional output_compression, moderation, input_fidelity, partial_images, and input_image_mask fields for callers that provide them; the current tool schema does not expose those extra fields. The per-call quality overrides the package-wide imageQuality default (auto). Quality is a request setting, not a per-model setting: the tool description documents that GPT Image 1 / 1.5 / 2 cap at high, while GPT Image 2.5 also lists xhigh and max. The implementation does not silently downgrade or locally reject unverified model/quality combinations; remote rejection remains visible.

Generated image files are written below the current session workspace, in images/ by default; imageOutputDir can change the relative output directory. The tool returns file paths and metadata, and passes image data through the Host attachment mechanism for later inspection. The tool's text result lists paths rather than embedding image bytes. A failed attachment save is logged while the workspace file remains available. If no valid workspace output directory can be resolved, the tool reports that condition rather than claiming a saved file.

Compatibility evidence is bounded: on 2026-09-24, a live subscription generated PNGs for gpt-image-2.5-flare and gpt-image-2.5-sunburst using image_generation.model. The Codex subscription endpoint publishes no schema; this dated observation does not guarantee all catalog/custom IDs or future gateway versions. A rejected image model is reported with its status and ID; the plugin never silently substitutes another model. The dated release note is retained in [CHANGELOG.md](CHANGELOG.md), and the request/model boundary is explained in [docs/image-generation.md](docs/image-generation.md) and [docs/adr/0001-separate-responses-carrier-from-image-model.md](docs/adr/0001-separate-responses-carrier-from-image-model.md).

### Configuration and persistence

The Host Config in lib/media/index.js defaults enableImageGeneration to false, imageModels to the two built-in choices, imageQuality to auto, and imageOutputDir to images. The older enableProviders and providerModelSelections fields remain only for one-time image-model migration: an explicitly disabled legacy choice stays disabled, while absent legacy configuration falls back to the built-in list. The old codex-managed-image sentinel is never sent upstream. The former defaultImageModel field is gone; imageModels order carries the fallback. Chat-model choices are managed only by the official OpenAI Codex provider.

Fast Mode and search state are not automatically migrated from the former plugin. The shared official credential record and one-time legacy token import are retained. Runtime Profile configuration, credentials, generated images, and plugin data are not source artifacts; do not commit them. See [CONTEXT.md](CONTEXT.md) for the distinction between chat-model selection, Responses carrier, image model, and image quality.

## Invariants and deliberate exclusions

Preserve these boundaries when changing the package:

1. Keep one bundle/package identity, one Host row, and one generated Client Loader entry. Do not split OAuth and media back into separate packages without a confirmed product requirement.
2. DSH's official openai-codex provider remains the owner of Codex chat transport, chat-model discovery, and model capabilities. Do not recreate its model list, editor, or model-list routes here.
3. Keep the Responses carrier, image-generation model, and quality as distinct values at their respective request locations. The selected image-model list determines exposure, allowed values, and fallback; unsupported remote models are not silently replaced.
4. Keep search override writes scoped to the plugin-marked block. Never remove or rewrite an unmarked user web override as part of disabling search.
5. Keep credentials, Profile configuration, sessions, runtime data, and generated media out of the source/package artifacts.

The following older surfaces were deliberately removed and remain regression-review exclusions:

- Grok, Claude, and Antigravity OAuth providers and provider-specific adapters.
- Generic API-key image providers/catalogs, including OpenAI API, Gemini, DashScope, Volcengine, and MiniMax adapters.
- Video-generation tools, presets, and adapters.
- A generic provider-registry/LLM-adapter framework and the retired Codex chat-completions adapter; official DSH Codex remains the chat implementation.
- Duplicate Codex chat-model discovery, an OAuth-page model editor, plugin-owned chat-model lists, and model-list routes.
- The second image tool name media-image-codex (merged into codex-generate-image) and the codex-managed-image sentinel (replaced by the selected image-model list).
- The obsolete aspectRatio image-tool parameter; aspect ratio is expressed through size.
- The multi-package deployment helper and its Profile-mutating test; deployment is not part of this repository's checks.

## Operational verification boundaries

- **Fast Mode is not live-verified.** Model-ID mismatch can make the `service_tier: priority` injector silently no-op, and upstream rejection may surface as HTTP 400. A real Codex check must confirm both the outgoing field and a successful conversation; the injector remains fail-open.
- **Legacy credential migration is source-defined but not verified on a real Profile.** It should seed the official Codex credential record only when absent. Do not claim the migration completed based on offline tests; credentials stay outside this repository.
- **Image quality default reload is unverified.** A per-call `quality` overrides the package default; confirm the Host-side `imageQuality` value after restarting the plugin/Host before treating a stale summary as a Client defect.
- **Upstream convergence is a removal trigger.** This package currently supplies Codex GUI authorization and a `service_tier` fallback. If DSH's official Codex provider exposes both, prefer retiring the corresponding plugin paths over maintaining duplicate ownership.

## Source map

| Path | Responsibility |
|---|---|
| [cordis.patch.yml](cordis.patch.yml) | Inserts the single package row with empty configuration. |
| [lib/index.js](lib/index.js) | Host composition, Config export, and injection union. |
| [lib/oauth.js](lib/oauth.js) | Installs Codex Host behavior and configured OpenAI proxy forwarding. |
| [lib/providers/oauth-base.mjs](lib/providers/oauth-base.mjs) | Internal OAuth lifecycle base used by Codex; this package registers no non-Codex OAuth provider. |
| [lib/providers/codex/index.mjs](lib/providers/codex/index.mjs) | Codex Host orchestration: credential/auth service, routes, usage, search switching, Fast Mode registration and cleanup. |
| [lib/providers/codex/codex-auth-service.mjs](lib/providers/codex/codex-auth-service.mjs) | Codex-specific auth service; official-record synchronization, legacy credential migration, and image-tool credential/http seam. |
| [lib/providers/codex/codex-credential-record.mjs](lib/providers/codex/codex-credential-record.mjs) | Maps and refreshes the shared official llm-pi-ai/openai-codex credential record. |
| [lib/providers/codex/codex-oauth.mjs](lib/providers/codex/codex-oauth.mjs) | Codex OAuth/device-flow endpoints, token normalization, PKCE helpers, and provider spec. |
| [lib/providers/codex/fast-mode.mjs](lib/providers/codex/fast-mode.mjs) | Per-model Fast Mode registry and guarded Host route. |
| [lib/providers/codex/fast-mode-store.mjs](lib/providers/codex/fast-mode-store.mjs) | Plugin-owned persistence for Fast Mode models and search-enabled state. |
| [lib/providers/codex/search.mjs](lib/providers/codex/search.mjs) | Codex subscription web-search provider and response mapping. |
| [lib/providers/codex/usage.mjs](lib/providers/codex/usage.mjs) | Usage/quota fetching, normalization, and short-lived cache. |
| [lib/shared/account-store.mjs](lib/shared/account-store.mjs) | Non-secret Codex account metadata and credential references. |
| [lib/shared/browser-oauth-authorizer.mjs](lib/shared/browser-oauth-authorizer.mjs) | Browser OAuth callback, PKCE session, and manual-code authorization helpers. |
| [lib/shared/provider-utils.mjs](lib/shared/provider-utils.mjs) | Shared JWT/date/value/error and quota-window normalization helpers. |
| [lib/shared/proxy.mjs](lib/shared/proxy.mjs) | OpenAI-target proxy transport and fail-open Codex service_tier request injector. |
| [lib/shared/secret-store.mjs](lib/shared/secret-store.mjs) | Opaque credential references and secret-store implementations; token material is kept separate from account metadata. |
| [lib/media/index.js](lib/media/index.js) | Image Config, capability route, and live image-tool registration/reconciliation. |
| [lib/media/image-models.mjs](lib/media/image-models.mjs) | Built-in image-model catalog, defaults, and syntactic ID validation. |
| [lib/media/model-selection.mjs](lib/media/model-selection.mjs) | Pure image allowlist/default resolution, legacy selection migration, and carrier resolution. |
| [lib/media/image-tool-schema.mjs](lib/media/image-tool-schema.mjs) | Dependency-free image-tool name, parameter/output schema, descriptions, and text rendering. Keeping it free of the DSH-profile-only @deepseek-ai/dsh-tools import makes the tool contract testable offline. |
| [lib/media/image-tool.js](lib/media/image-tool.js) | Tool validation/execution, Codex auth and adapter dispatch, workspace files, and attachments. |
| [lib/media/executors.mjs](lib/media/executors.mjs) | The supported Codex image adapter registration and protocol dispatch. |
| [lib/media/adapters/openai-codex.js](lib/media/adapters/openai-codex.js) | Codex Responses image-generation request construction, streaming response parsing, and remote errors. |
| [lib/media/image-output.mjs](lib/media/image-output.mjs) | Session workspace/output directory resolution for generated images. |
| [src/client/oauth.js](src/client/oauth.js) | Sign-in/account/search settings UI plus conversation quota and Fast Mode slots. |
| [src/client/media.js](src/client/media.js) | Subscription image settings UI: enable switch, ordered model list, catalog, and quality default. |
| [lib/client.js](lib/client.js) | Checked-in combined Client Loader output; generated from the two Client sources. |
| [scripts/build-client.mjs](scripts/build-client.mjs) | Builds the single Client output from retained sources. |
| [scripts/check-package.mjs](scripts/check-package.mjs) | Checks package/Loader structure and JavaScript syntax. |
| [test/](test/) | Offline tests for carrier separation, credential mapping, tool schema, model selection, and proxy target rules; tests do not install the package or read Profile data. |
| [docs/image-generation.md](docs/image-generation.md) | Image-generation request concepts, flow, evidence, and compatibility limits. |
| [docs/adr/0001-separate-responses-carrier-from-image-model.md](docs/adr/0001-separate-responses-carrier-from-image-model.md) | Accepted decision record for the carrier/image-model boundary. |
| [CONTEXT.md](CONTEXT.md) | Shared vocabulary for the four image/chat model concepts. |
| [CHANGELOG.md](CHANGELOG.md) | Dated release history and compatibility observations. |
| [README.md](README.md) and [README.zh.md](README.zh.md) | User-facing purpose, setup, behavior, and maintenance overview in English and Chinese. |
| [CONTRIBUTING.md](CONTRIBUTING.md), [docs/release.md](docs/release.md), and [SECURITY.md](SECURITY.md) | Contribution, handoff, and security guidance. |

For image-generation changes, also read the [feature note](docs/image-generation.md) and [ADR 0001](docs/adr/0001-separate-responses-carrier-from-image-model.md). For package use and commands, start with [README.md](README.md).
