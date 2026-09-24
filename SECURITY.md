# Security Policy

Never publish OAuth credentials, access/refresh tokens, account identifiers, Profile configuration, session files, generated media, or plugin runtime `data/` contents in issues, pull requests, logs, or screenshots.

If you find a vulnerability, do not file exploit details publicly. Use GitHub's private vulnerability reporting for this repository if enabled; otherwise contact the maintainer through an existing private channel with only the minimum information needed to reproduce the issue. Confirm the private reporting channel before sharing sensitive material.

The project does not request users to upload credential files. Sanitize logs and reproductions before sharing them. The Codex credential-record adapter is intended to use DSH's official shared record and never logs token values.
