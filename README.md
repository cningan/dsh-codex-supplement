# Codex Supplement

> English | [简体中文](README.zh.md)

A single DeepSeek Harness (`dsh`) bundle for Codex-only account and subscription-image features, consolidated from the former `dsh-oauth` and `dsh-multimedia` packages.

## Included

- ChatGPT/Codex OAuth sign-in and logout, sharing the official `llm-pi-ai/openai-codex` credential record. The existing one-time migration from the legacy Codex secret store remains.
- Codex subscription usage/quota presentation, optional Codex web search, and per-model Fast Mode.
- Codex subscription image generation through the dedicated Codex Images endpoints (`/backend-api/codex/images/generations` and `/images/edits`), using the image model chosen per call by the tool's `model` argument, from a catalog headed by GPT Image 2.6 Flare/Sunburst, followed by 2.5 (including its dated snapshots) and earlier ids. The Codex OAuth lane accepts `model` / `size` / `quality` / `background` and PNG or GIF output; `complexity`, `xhigh`/`max`, SVG/WebP/JPEG and masks are open-API-only. ChatGPT Free is rejected by the endpoint (HTTP 403) and is preflighted when the cached plan is known. Generated images are written to the current session workspace (default `images/`) and attached for later model inspection.
- Three component rows in one package: the bare `codex-supplement` row is the base (OAuth sign-in, usage, Fast Mode, logging and the merged Client settings page), `codex-supplement-image` owns the image tool and its test route, and `codex-supplement-search` owns the Codex web-search provider. The base row must use the bare package specifier because `dsh-client-modules` discovers a Client module only for a bare-name row, not a subpath; the image/search rows depend on the base row's `openaiCodexAuth` service.

Grok, Claude, Antigravity, API-key image adapters, and video generation are not included.

## Use

Open **Settings → Codex Subscription**. The page is split into cards by dependency: account (sign-in, device code, accounts), usage/quota, web search (its own search component row), and an image-generation card. The image card has a tool switch, a one-row-per-model list, and test generation. Add, remove, or type a model id; ★ sets the explicit default model; ⚙ opens that model's quality/complexity defaults. Order only affects display, and an empty list registers no image tool. Quality options and defaults follow the selected model: 2.5 reaches `xhigh`/`max`, while 1 / 1.5 / 2 and 2.6 stop at `high`; 2.6 exposes complexity. The test panel uses the same per-model resolver. Manage conversation models and their input/output capabilities only in the official **Models → OpenAI Codex** entry.

The same section has a **Test generation** panel. It sends one minimal request through the same adapter (no workspace write, no tool registration) and shows the upstream status, elapsed time, the fields the endpoint actually returned, and an inline preview. Each click consumes one real subscription image. The Codex OAuth lane is known to ignore `model`, `size` and `complexity` on some builds and to reject `gif`/`svg`; the test panel exists so you can see what your build accepts instead of trusting the open-API schema.

## Compatibility and installation

- DSH `0.2.x` baseline with bundle/component support; Node.js 22 or newer.
- Re-verified on DSH `0.2.2-rc.1` (2026-11-09) in an isolated runtime: all three component rows mount, the base `/codex/status`, `/codex/usage` and `/codex/fast-mode`, the search `/codex/search/status`, the image `/capabilities` and `POST /codex/test-image` answer, the image tool registers when enabled, and the generated Client module appears as a Web boot entry. The settings form targets the `codex-supplement-image` row; old media fields on the base row still validate for profile compatibility but no longer override the image row's current GPT Image 2.6 defaults.
- Install it by the npm package name `dsh-codex-supplement` through the DSH plugin manager. Only a registry spec is recognized by the plugin page's **Check for updates** / **Update**; a GitHub Release `.tgz` remains available for offline or pinned installs but cannot be updated in place. This package is published to npm.
- GitHub source history is maintained separately from the previous OAuth repository history to avoid carrying its rejected, unsanitized commits.

## Updating

Updates are handled by DSH, not by the plugin. The plugin page shows the installed version per bundle and offers **Check for updates**; when a newer version exists, **Update** removes the old copy and installs the same package name at the exact new version (a restart may be required without HMR). The plugin settings page has no update UI of its own.

## macOS notes

- **Authorization succeeds in the browser but the card stays on “Authorizing”**: macOS resolves `localhost` to IPv6 `::1` first. Since 0.6.1 the callback server listens on both `127.0.0.1` and `::1`. If it still stalls, use “No callback? Paste it manually” and paste the full `localhost:1455/auth/callback?code=...&state=...` URL.
- **Callback port busy**: the official Codex CLI may also hold port `1455`. Close it or use the manual paste path.
- **403 `unsupported_country_region_territory` after signing in**: Node does not read the system proxy. Since 0.6.2 the plugin reads the macOS system proxy via `scutil --proxy`; a Clash mixed port configured as SOCKS is used as an HTTP proxy.
- **Avoid the `github:` install shorthand on macOS**: it needs git and Xcode Command Line Tools. Install by the npm package name; use the Release `.tgz` only for offline installs.

See [docs/cross-platform.md](docs/cross-platform.md) for the general checklist (paths, permissions, line endings, fonts, clipboard).

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
- There is exactly one image tool, `codex-generate-image`. Its parameters match the Codex Images endpoint: `prompt`, `model`, `image` (edit), `size`, `quality`, `background`, `action`, `output_format` (png/gif, gif only with 2.6), plus `frames` / `frame_duration_ms`. `complexity`, `xhigh`/`max`, SVG/WebP/JPEG, masks and compression are not accepted by this lane and are omitted from the schema. Its `model` argument takes a value from the list in settings and falls back to the explicit default model; a model outside the list, or an unsupported quality/format, is refused with the allowed values listed. The legacy `codex-managed-image` choice is migrated once on read and is never sent upstream.
- **Verified on a live account (2026-11-09):** `gpt-5.5` and `gpt-5.6-sol` return 400; Terra with the old hosted tool returns 200 but only inline SVG; forcing the tool returns 400; the dedicated Codex Images endpoint returns 403 on ChatGPT Free. Free does not include Codex image generation. On paid plans, the dedicated endpoint accepts the selected image model and the fields listed above. The test panel reports the actual status and error; the plugin never silently substitutes another model.
- Legacy plugin data is not copied automatically; preserve it outside the active plugin tree before removing the former plugin directories. The package is published to npm as `dsh-codex-supplement`.

Before changing subscription image-generation request fields, model selection, or compatibility claims, read the [package specification](SPEC.md), [image-generation architecture note](docs/image-generation.md), and [ADR 0002](docs/adr/0002-use-codex-images-endpoints.md).

See [SPEC.md](SPEC.md) for current contracts, plus [SECURITY.md](SECURITY.md) and [docs/release.md](docs/release.md).

