# Changelog

## 0.1.0 — Codex Supplement consolidation

- Consolidate Codex OAuth, usage/quota, search, Fast Mode, and Codex subscription image generation into one `@local/dsh-codex-supplement` bundle.
- Retain official Codex credential-record sharing and legacy credential migration.
- Reduce Client output to one package-prefixed Loader module.
- Remove non-Codex OAuth providers, generic API-key image providers, video generation, and the retired Codex chat adapter.
- Do not migrate plugin-directory Fast Mode/search flags or custom model-list files automatically; see the README.
