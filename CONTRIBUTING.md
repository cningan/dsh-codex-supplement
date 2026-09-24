# Contributing

Thanks for helping improve Codex Supplement.

## Scope

- Keep this as one `@local/dsh-codex-supplement` bundle. Do not restore separate OAuth/media packages or non-Codex providers, generic API-key image adapters, or video support without a confirmed product requirement.
- DSH's official `openai-codex` provider owns Codex chat. This plugin owns adjacent login, usage, search, Fast Mode, and subscription image-generation features.
- Do not add credentials, tokens, account exports, Profile configuration, generated media, or plugin `data/*.json` files.
- Update `ARCHITECTURE_MAP.md` whenever a component moves, changes ownership, or is removed; add removed behavior to the regression-review section and tests where appropriate.

## Checks

Node.js 22 or newer is required. The unit/syntax checks use built-in Node facilities:

```sh
npm run check
npm test
npm pack --dry-run
```

`npm run check` regenerates the combined Client module and validates JavaScript syntax. Inspect the `npm pack --dry-run` file list before any package handoff; it does not publish.

## Profile safety and releases

Do not install into, modify, or restart a user's active Profile as part of routine development. Profile installation, a live profile check, GitHub publication, and npm publishing are separate actions requiring explicit authorization. There is no automated publish workflow.
