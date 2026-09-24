# ADR 0001: Keep the Responses carrier separate from the image model

- Status: Accepted
- Date: 2026-09-24

## Context

A Codex subscription image request contains two values named `model` at different levels. The top-level Responses `model` selects the Codex conversation model carrying the tool call. The hosted `image_generation` tool’s own `model` selects the image engine. The official DSH Codex provider owns chat-model discovery and metadata; this package owns the image-engine catalog and allowlist. A shared word and string representation do not make these roles interchangeable.

The OpenAI Python SDK’s generated Responses image-tool type exposes the tool-level field, while the Codex subscription gateway publishes no separate schema. The package recorded a real-subscription check for its two default image IDs on 2026-09-24. This is bounded compatibility evidence, not a promise about untested IDs or future gateway versions.

## Decision

Keep three request concepts independent:

1. Obtain the Responses carrier only from the official DSH OpenAI Codex current selection; use the adapter’s code-owned fallback only when that selection is unavailable.
2. Obtain the image model from the package’s selected image-model list, allowing a per-call override only from that list; write it only to `image_generation.model`.
3. Keep `quality` as a separate tool control with its own default and per-call override. Never encode a quality tier as a model ID or infer the image model from the carrier.

The distinction is a data-flow and request-field contract, not a type guarantee encoded in the model-ID string. Keep the carrier source and image-model source separate when changing selection logic.

## Alternatives considered

- Put the image ID in the top-level Responses `model`: rejected because that field selects the tool-carrying Codex conversation model, not the image engine.
- Infer the image engine from the Codex carrier or map Flare/Sunburst to `quality`: rejected because these values represent different roles and controls.
- Hide model selection behind one server-managed sentinel or silently substitute a fallback: rejected because callers could not choose/identify the requested engine and would be misled about which model ran.
- Create one tool per image model: rejected while the models share the same image-generation contract; the selected allowlist plus one tool keeps the capability coherent.

## Consequences

- Chat model names and input/output capabilities remain owned by the official DSH Codex provider; image choices remain owned by `lib/media/image-models.mjs`.
- The configured image list controls the tool’s `model` enum and default. Unknown but syntactically valid custom IDs may be configured, but the remote service is the final compatibility authority.
- On rejection, the adapter reports the status and requested image-model ID; it does not silently fall back. This preserves user intent at the cost of making unsupported gateway combinations visible.
- `quality` remains a single request-level default rather than a per-model map. The UI documents model ceilings; the implementation neither downgrades nor hard-blocks unverified combinations.
- Regression coverage must assert the top-level carrier and nested image model independently. See `test/codex-carrier.test.mjs` and `test/image-tool-schema.test.mjs`.

## Evidence

- [Codex image request construction](../../lib/media/adapters/openai-codex.js)
- [Carrier and image-model resolution](../../lib/media/model-selection.mjs) and [tool composition](../../lib/media/image-tool.js)
- [Request-field separation tests](../../test/codex-carrier.test.mjs)
- [Catalog and allowlist](../../lib/media/image-models.mjs)
- [Package capability and dated compatibility note](../../README.md)
- OpenAI [Responses image-generation guide](https://developers.openai.com/api/docs/guides/tools-image-generation) and [SDK image-tool type](https://github.com/openai/openai-python/blob/main/src/openai/types/responses/tool_param.py). The public API schema does not guarantee subscription-gateway support.
