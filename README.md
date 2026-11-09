# Codex Supplement

> English | [简体中文](README.zh.md)

A single DeepSeek Harness (`dsh`) bundle for Codex-only account and subscription-image features, consolidated from the former `dsh-oauth` and `dsh-multimedia` packages.

## Included

- ChatGPT/Codex OAuth sign-in and logout, sharing the official `llm-pi-ai/openai-codex` credential record. The existing one-time migration from the legacy Codex secret store remains.
- Codex subscription usage/quota presentation, optional Codex web search, and per-model Fast Mode.
- Codex subscription image generation through the Responses `image_generation` tool. The image model is chosen per call by the tool's `model` argument, from a catalog headed by GPT Image 2.6 Flare/Sunburst, followed by 2.5 (including its dated snapshots) and earlier ids. GPT Image 2.6 adds planning `complexity`, GIF/SVG output, masks and frame controls; the tool is capability-gated by the enabled list. The Responses carrier is fixed to the ChatGPT-account model `gpt-5.6-terra`; the official Codex chat model and the image model are never used as the carrier. Generated images are written to the current session workspace (default `images/`) and attached for later model inspection.
- Three component rows in one package: the bare `codex-supplement` row is the base (OAuth sign-in, usage, Fast Mode, logging and the merged Client settings page), `codex-supplement-image` owns the image tool and its test route, and `codex-supplement-search` owns the Codex web-search provider. The base row must use the bare package specifier because `dsh-client-modules` discovers a Client module only for a bare-name row, not a subpath; the image/search rows depend on the base row's `openaiCodexAuth` service.

Grok, Claude, Antigravity, API-key image adapters, and video generation are not included.

## Use

Open **Settings → Codex Subscription**. The page is split into cards by dependency: account (sign-in, device code, accounts), usage/quota, web search (its own search component row), and an image-generation card. The image card has a tool switch, a one-row-per-model list, and test generation. Add, remove, or type a model id; ★ sets the explicit default model; ⚙ opens that model's quality/complexity defaults. Order only affects display, and an empty list registers no image tool. Quality options and defaults follow the selected model: 2.5 reaches `xhigh`/`max`, while 1 / 1.5 / 2 and 2.6 stop at `high`; 2.6 exposes complexity. The test panel uses the same per-model resolver. Manage conversation models and their input/output capabilities only in the official **Models → OpenAI Codex** entry.

The same section has a **Test generation** panel. It sends one minimal request through the same adapter (no workspace write, no tool registration) and shows the upstream status, elapsed time, the fields the endpoint actually returned, and an inline preview. Each click consumes one real subscription image. The Codex OAuth lane is known to ignore `model`, `size` and `complexity` on some builds and to reject `gif`/`svg`; the test panel exists so you can see what your build accepts instead of trusting the open-API schema.

## Compatibility and installation

- DSH `0.2.x` baseline with bundle/component support; Node.js 22 or newer.
- Re-verified on DSH `0.2.2-rc.1` (2026-11-09) in an isolated runtime: all three component rows mount, the base `/codex/status`, `/codex/usage` and `/codex/fast-mode`, the search `/codex/search/status`, the image `/capabilities` and `POST /codex/test-image` answer, the image tool registers when enabled, and the generated Client module appears as a Web boot entry. The settings form targets the `codex-supplement-image` row; old media fields on the base row still validate for profile compatibility but no longer override the image row's current GPT Image 2.6 defaults.
- The package declares `dsh.bundle.patch` (base + image + search rows) and one merged Web Client module. Install it through the DSH bundle/plugin manager after reviewing the package; package changes may require a Host restart. This package is not published to npm.
- GitHub source history is maintained separately from the previous OAuth repository history to avoid carrying its rejected, unsanitized commits.

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
- There is exactly one image tool, `codex-generate-image`. Its parameters mirror the open-API `image_generation` fields: `prompt`, `model`, `image`, `mask`, `size`, `quality`, `complexity`, `background`, `action`, `output_format`, `output_compression`, `moderation`, `input_fidelity`, `partial_images`, plus `frames` / `frame_duration_ms` for 2.6 GIF output. `complexity` / `gif` / `svg` / frame fields disappear from the tool schema when no enabled model declares those capabilities. Its `model` argument takes a value from the list in settings and falls back to the explicit default model; a model outside the list, or a quality/complexity outside that model's range, is refused with the allowed values listed. The legacy `codex-managed-image` choice is migrated once on read and is never sent upstream.
- **Verified on a live subscription (2026-09-24):** the Codex subscription endpoint accepts `image_generation.model`; `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` each produced a PNG through the tool. **Independent evidence (2026-11-06, openai/codex#59890):** the OAuth `/backend-api/codex/images/*` lane ignores `model`, `complexity`, `size` and SVG format, and rejects GIF with 400. This package uses the Responses hosted-tool lane, which may behave the same; the test panel reports the actual result, and a rejection is surfaced with its status code and model id. The plugin never silently substitutes another model.
- Legacy plugin data is not copied automatically; preserve it outside the active plugin tree before removing the former plugin directories. No npm package is published.

Before changing subscription image-generation request fields, model selection, or compatibility claims, read the [package specification](SPEC.md), [image-generation architecture note](docs/image-generation.md), and [ADR 0001](docs/adr/0001-separate-responses-carrier-from-image-model.md).

See [SPEC.md](SPEC.md) for current contracts, plus [SECURITY.md](SECURITY.md) and [docs/release.md](docs/release.md).

