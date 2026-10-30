# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately on GitHub: open the
repository's **Security** tab and choose **Report a vulnerability**.

## Supported versions

Only the latest release gets security fixes. On Windows the app updates itself; on macOS it shows a
notice when a new version is out.

## Design

The renderer runs sandboxed and context-isolated, without Node.js, under a strict Content Security
Policy, and talks to the main process only through a small preload bridge. The Electron binary ships
with hardening fuses (no `ELECTRON_RUN_AS_NODE`, no `NODE_OPTIONS`, app code loaded only from an
integrity-checked `app.asar`). Details in [docs/adr/0002-project-structure.md](docs/adr/0002-project-structure.md).
