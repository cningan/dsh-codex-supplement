# Codex Supplement

> English | [简体中文](README.zh.md)

A single DeepSeek Harness (`dsh`) bundle for Codex-only account and subscription-image features, consolidated from the former `dsh-oauth` and `dsh-multimedia` packages.

## Included

- ChatGPT/Codex OAuth sign-in and logout, sharing the official `llm-pi-ai/openai-codex` credential record. The existing one-time migration from the legacy Codex secret store remains.
- Codex subscription usage/quota presentation, optional Codex web search, and per-model Fast Mode.
- Codex subscription image generation through the Responses `image_generation` tool. The official Codex model is only the Responses carrier; GPT Image IDs are not used as carrier models. Generated images are written to the current session workspace (default `images/`) and attached for later model inspection.
- One Host plugin row and one Client Loader module: `@local/dsh-codex-supplement`.

Grok, Claude, Antigravity, API-key image adapters, and video generation are not included.

## Use

Open **Settings → Codex subscription sign-in** to authenticate and manage search/model-list options. In Codex conversations, the input toolbar provides the quota entry and Fast Mode toggle. Open **Settings → Codex Subscription Image Generation** to enable the tool and select the subscription-managed engine.

## Compatibility and installation

- DSH `0.1.7-rc.1` baseline; Node.js 22 or newer.
- This is an `@local` bundle intended for a DSH local-plugin source tree. Its `package.json` declares the bundle patch and combined web Client module. Install it through the DSH bundle/plugin manager after reviewing the package. This repository has **not** been installed into or applied to an active Profile during development.
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
- The official Codex credential record and legacy token migration are retained. Plugin-owned settings files such as Fast Mode/search state and custom model-list data live under the plugin's data directory; moving to this new package directory does not automatically migrate those files. Re-enable Fast Mode/search as needed and deliberately migrate custom model-list data if you rely on it.
- No active Profile was changed, no host was restarted, and no npm publication was performed as part of this work.

See [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md), [SECURITY.md](SECURITY.md), and [docs/release.md](docs/release.md).
