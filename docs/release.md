# Release and handoff policy

- The repository is the sole source for one package: `@local/dsh-codex-supplement`.
- Review `npm pack --dry-run` and run `npm run check` plus `npm test` before handing off a source bundle. Exclude all runtime `data/*.json`, credentials, Profile configuration, sessions, and generated media.
- Do not install into or restart an active Profile as an implicit release step. Any profile installation or live runtime check needs an explicitly approved, isolated target.
- This package is not published to npm. GitHub push/release and npm publication are separate user-authorized actions. Never bypass GitHub push protection; if history is rejected for secret-like content, prepare a clean sanitized history rather than rewriting or disguising the finding.
- Update `CHANGELOG.md` and `SPEC.md` with every public handoff. Keep data-compatibility limitations visible in the README.
