# Changelog

## 0.2.0 — Image model selection

- The subscription image tool is no longer bound to a single managed engine. The official `image_generation` tool does declare a `model` field, so the configured `imageModels` list decides what is allowed (empty = register no tool) and the tool's own `model` argument picks a tier per call.
- The settings surface is a single list: one row per model, add/remove/type an id, or load the built-in catalog. List order is priority, and the first row is the fallback when a call omits `model`; the separate default-tier selector was removed as redundant with the description and enum.
- Add one request-level quality default (`imageQuality`, factory `auto`) that a call can still override. Quality stays global rather than per-model because it is a request parameter; the parameter description now also states the per-model ceiling (1 / 1.5 / 2 cap at `high`, only 2.5 reaches `xhigh`/`max`).
- Ship an image-model catalog centred on the two GPT Image 2.5 tiers — `gpt-image-2.5-flare` (fast) and `gpt-image-2.5-sunburst` (quality) — plus their dated snapshots and prior-generation ids.
- Forward the rest of the documented tool surface (`action`, `size`, `quality`, `background`, `output_compression`, `moderation`, `input_fidelity`, `partial_images`, `input_image_mask`) and stop conflating the Responses carrier with the image model.
- Merge the two tool names into a single `codex-generate-image`; drop the dead `aspectRatio` parameter and the `codex-managed-image` sentinel. Legacy `enableProviders`/`providerModelSelections` are read once for migration and never forwarded upstream.
- Report a rejected image model with its HTTP status and id instead of a generic failure, and never silently substitute another model.
- Split the tool's schema into a dependency-free module so the tool shape (single name, `model` enum, absence of the dead `aspectRatio`) is covered by offline tests rather than only by inspection after a Host restart.
- Verified against a live subscription (2026-09-24): the Codex endpoint accepts `image_generation.model`; `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` each produced a PNG through `codex-generate-image`.

## 0.1.0 — Codex Supplement consolidation

- Consolidate Codex OAuth, usage/quota, search, Fast Mode, and Codex subscription image generation into one `@local/dsh-codex-supplement` bundle.
- Retain official Codex credential-record sharing and legacy credential migration.
- Reduce Client output to one package-prefixed Loader module.
- Remove non-Codex OAuth providers, generic API-key image providers, video generation, and the retired Codex chat adapter.
- Remove the duplicate OAuth-page model editor/discovery/routes; the official OpenAI Codex provider owns the catalog and input/output capabilities. Do not migrate old plugin custom model lists; configure models in the official Models page.
