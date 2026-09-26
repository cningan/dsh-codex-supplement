# Codex Supplement

> English | [简体中文](README.zh.md)

A single DeepSeek Harness (`dsh`) bundle for Codex-only account and subscription-image features, consolidated from the former `dsh-oauth` and `dsh-multimedia` packages.

## Included

- ChatGPT/Codex OAuth sign-in and logout, sharing the official `llm-pi-ai/openai-codex` credential record. The existing one-time migration from the legacy Codex secret store remains.
- Codex subscription usage/quota presentation, optional Codex web search, and per-model Fast Mode.
- Codex subscription image generation through the Responses `image_generation` tool. The image model is chosen per call by the tool's `model` argument, from a catalog of GPT Image ids — including the two GPT Image 2.5 tiers, `gpt-image-2.5-flare` (fast) and `gpt-image-2.5-sunburst` (quality). The official Codex chat model is only the Responses carrier, and the two are never conflated. Generated images are written to the current session workspace (default `images/`) and attached for later model inspection.
- One Host plugin row and one Client Loader module: `@cningan/dsh-codex-supplement`.

Grok, Claude, Antigravity, API-key image adapters, and video generation are not included.

## Use

Open **Settings → Codex Subscription** to sign in, enable Codex search, view usage/quota, and configure subscription image generation. The image section is a one-row-per-model list: add a row, remove a row, type an id yourself, or load the built-in catalog. The list is the tool's allowed `model` values; order is priority and the first row is used when a call omits `model`. An empty list registers no image tool at all. The same section carries one request-level **quality default** (`auto` out of the box) that a call can still override; only GPT Image 2.5 reaches `xhigh`/`max`, while 1 / 1.5 / 2 stop at `high`. Manage conversation models and their input/output capabilities only in the official **Models → OpenAI Codex** entry. In Codex conversations, the input toolbar provides the quota entry and Fast Mode toggle.

## Compatibility and installation

- DSH `0.1.7-rc.1` baseline; Node.js 22 or newer.
- This is an `@cningan` bundle intended for a DSH local-plugin source tree. Its `package.json` declares the bundle patch and combined web Client module. Install it through the DSH bundle/plugin manager after reviewing the package; package changes may require a Host restart. This package is not published to npm.
- The package is not published to npm. GitHub source history is maintained separately from the previous OAuth repository history to avoid carrying its rejected, unsanitized commits.

## Build and test

No install-time dependencies are needed for the unit and syntax checks:

```sh
npm run check
npm test
npm pack --dry-run
```

`npm run check` rebuilds `lib/client.js` from the retained sources in `src/client/`, then checks Host, Client, build-script, and test JavaScript syntax. `npm pack --dry-run` is a release-content review only; it does not publish.

## Behavior and data notes

- Enabling Codex search switches the DSH `web` provider to `openai-codex` by writing a marked block to the active Profile's `cordis.patch.yml`. Disabling the feature removes only that plugin-managed block; hand-written `web` overrides are left alone. Review this side effect before enabling search.
- The official Codex credential record and legacy token migration are retained. Fast Mode/search state remains under the plugin's data directory and is not automatically migrated from the former plugin. Any old custom model-list data is no longer read; configure models in the official **Models → OpenAI Codex** entry.
- There is exactly one image tool, `codex-generate-image`. Its `model` argument takes a value from the list in settings and falls back to that list's first row; a model outside the list is refused with the allowed values listed. The legacy `codex-managed-image` choice is migrated once on read and is never sent upstream.
- **Verified on a live subscription (2026-09-24):** the Codex subscription endpoint accepts `image_generation.model`; `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` each produced a PNG through the tool. The endpoint still publishes no schema, so a future tightening is possible: a rejection is surfaced with its status code and model id, and the plugin never silently substitutes another model.
- Legacy plugin data is not copied automatically; preserve it outside the active plugin tree before removing the former plugin directories. No npm package is published.

Before changing subscription image-generation request fields, model selection, or compatibility claims, read the [package specification](SPEC.md), [image-generation architecture note](docs/image-generation.md), and [ADR 0001](docs/adr/0001-separate-responses-carrier-from-image-model.md).

See [SPEC.md](SPEC.md) for current contracts, plus [SECURITY.md](SECURITY.md) and [docs/release.md](docs/release.md).
