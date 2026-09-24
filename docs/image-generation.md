# Codex subscription image generation

This note describes the package’s current image-generation capability and its model boundary. The source and tests remain authoritative; this document explains how their pieces fit together. The shared vocabulary is defined in the [context glossary](../CONTEXT.md).

## Scope and capability

The package exposes one image tool, `codex-generate-image`, for the ChatGPT/Codex subscription-backed Responses `image_generation` flow. It supports generation and editing with an optional reference image. It is not the OpenAI API-key Images endpoint, a general multi-provider adapter, or a video feature. The package README lists the supported product surface and exclusions.

The feature is registered only when image generation is enabled and at least one image model is selected. The settings list is the tool’s image-model allowlist: its order determines the default, and a caller may choose another listed model per request. An empty list means no image tool. The built-in default list is GPT Image 2.5 Flare and Sunburst; the current catalog and labels live in `lib/media/image-models.mjs`, not in this note.

The tool accepts a prompt, an optional image-model choice, size, quality, background, action, output format, and an optional reference image. Generated files are saved under the current session workspace (default `images/`); the tool result reports file metadata and paths, with images passed through the Host attachment mechanism. See `lib/media/image-tool-schema.mjs`, `lib/media/image-tool.js`, and `lib/media/image-output.mjs`.

## Four distinct model/request concepts

| Concept | Owner and request location | Meaning |
|---|---|---|
| DSH Codex chat-model selection | The official DSH `openai-codex` provider and Models UI | Owns conversation-model identifiers and their input/output capabilities. This plugin does not maintain a second chat-model catalog. |
| Responses carrier | Top-level Responses request field `model` | The Codex conversation model that carries the request/tool call. The current official Codex selection supplies it; the adapter has a code-owned fallback if that selection is unavailable. It is not the image engine. |
| Image-generation model | `model` inside the hosted `image_generation` tool | Selects the image engine for this tool call. It comes from the plugin’s selected image-model list or an allowed per-call override. |
| Image quality | `quality` inside `image_generation` | A separate generation control, defaulting to `auto` unless configured or overridden. It is neither a chat model nor an image-model ID. |

The word `model` appears in two different request objects. Its role comes from its source and location, not from the spelling of the ID: the carrier is sourced from the official Codex selection and is written at the request top level; the image model is sourced from this package’s image selection and is written inside the tool declaration. Do not move an image ID into the top-level field, derive an image engine from the carrier, or translate an image-model name into a quality value.

## Request and output flow

1. `lib/media/index.js` owns the image-generation enable flag, selected image-model list, request-level quality default, and output directory setting.
2. `lib/media/image-tool.js` resolves the current official Codex selection as the carrier and independently resolves the requested image model against the selected allowlist. Requests for an unselected image model are rejected with the allowed values; the code does not silently choose a substitute.
3. `lib/media/adapters/openai-codex.js` builds a Responses request whose top-level `model` is the carrier and whose `tools` entry is `image_generation`. The image model is added only to that tool’s `model` field. Quality, size, action, background, and output format remain tool-level controls.
4. The adapter parses the returned image-generation events. The execution/output layer saves image bytes and returns paths/metadata through the tool result and attachment handling.

The carrier/image distinction is asserted in `test/codex-carrier.test.mjs`; allowlist/default resolution is covered by `test/model-selection.test.mjs`; the user-facing tool contract is covered by `test/image-tool-schema.test.mjs`.

## Compatibility evidence and limits

The OpenAI Python SDK’s generated Responses `ImageGeneration` tool type exposes a tool-level `model` field. That is evidence for the public OpenAI Responses tool shape; it is not a published schema for the separate Codex subscription gateway. The subscription endpoint has no public schema. A real subscription check recorded in the package README on 2026-09-24 produced PNG output for the two built-in defaults, `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst`. Treat that as dated empirical compatibility evidence, not a guarantee that every catalog/custom ID or future gateway version is accepted.

The catalog deliberately permits syntactically valid custom IDs so newly supported IDs are not blocked by a stale local enum. This does not establish remote support. If the subscription endpoint rejects a requested model, the adapter surfaces the response status and model ID; it never silently substitutes another model. The catalog is in `lib/media/image-models.mjs`; request construction and error behavior are in `lib/media/adapters/openai-codex.js`.

`quality` is a request-level value with a package-wide default, not a per-model setting. The tool description warns that GPT Image 1 / 1.5 / 2 cap at `high`, while GPT Image 2.5 also supports `xhigh` and `max`. The current implementation does not silently downgrade or locally reject a model/quality combination whose gateway behavior is not established; a remote rejection remains visible. Revisit this only with new endpoint evidence and update the relevant tests if the contract changes.

## References

- [Architecture map](../ARCHITECTURE_MAP.md)
- [User-facing package README](../README.md)
- [Image-generation tool schema](../lib/media/image-tool-schema.mjs)
- [Model catalog](../lib/media/image-models.mjs)
- [Model selection](../lib/media/model-selection.mjs)
- [Tool execution](../lib/media/image-tool.js) and [output handling](../lib/media/image-output.mjs)
- [Codex Responses adapter](../lib/media/adapters/openai-codex.js)
- [Carrier/image-model tests](../test/codex-carrier.test.mjs)
- OpenAI [Responses image-generation guide](https://developers.openai.com/api/docs/guides/tools-image-generation) and the SDK-generated [Responses image tool type](https://github.com/openai/openai-python/blob/main/src/openai/types/responses/tool_param.py). The SDK type and subscription-gateway behavior are separate evidence sources.
