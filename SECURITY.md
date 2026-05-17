# Security Policy

## Supported Versions

Security fixes are handled on the default branch unless release branches are introduced later.

## Reporting A Vulnerability

Please do not open a public issue for sensitive security reports.

If you find a vulnerability, contact the repository owner privately and include:

- A short summary of the issue
- Steps to reproduce
- Affected routes, websocket messages, or deployment settings
- Potential impact
- Suggested fix, if you have one

## Security Notes For Contributors

- Do not commit secrets, service account keys, tokens, or `.env` files.
- Keep hidden-information game state private on the backend.
- Validate game actions on the backend even when the frontend disables invalid controls.
- Avoid logging sensitive player data.
- Treat websocket messages as untrusted input.
