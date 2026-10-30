# ADR 0002: Project structure, build and security baseline

- Status: accepted
- Date: 2026-10-30

## Context

ADR 0001 chose Electron. An Electron app has three pieces with different runtimes: the main process
(Node.js), a preload script (a restricted, sandboxed context) and the renderer (the web page). Each
needs its own build output, and the app must be packaged, published and updated from GitHub at no
cost.

## Decision

**Layout.**

| Folder         | Runs in                                                   | Built to                 |
| -------------- | --------------------------------------------------------- | ------------------------ |
| `src/main`     | Electron main process                                     | `dist/main/index.cjs`    |
| `src/preload`  | sandboxed preload                                         | `dist/preload/index.cjs` |
| `src/renderer` | the page, React 19                                        | `dist/renderer/`         |
| `src/shared`   | imported by all three: constants, IPC types, pure helpers | (bundled into each)      |
| `tests/unit`   | Vitest, Node                                              |                          |
| `tests/e2e`    | Playwright driving the built Electron app                 |                          |

**Build.** Vite builds all three: the renderer as a normal Vite app, main and preload as SSR builds
to CommonJS (sandboxed preloads must be CommonJS). No extra framework such as Electron Forge or
electron-vite: three small Vite configs are enough, and every dependency is one less thing to update.
electron-builder packages and publishes (NSIS on Windows, universal `.dmg` and `.zip` on macOS);
electron-updater installs updates on Windows.

**Languages and tools.** TypeScript in strict mode, React with Zustand for state, ESLint and Prettier,
Vitest, Playwright's Electron support for smoke tests. TypeScript stays on 6.0 while typescript-eslint
supports only versions below 6.1. Dependencies are pinned to exact versions; Dependabot proposes
updates.

**Security baseline.**

- The renderer is loaded from a custom `app://splitwatch/` protocol that serves only files inside
  `dist/renderer`, with the Content Security Policy as a response header: scripts only from the app
  and YouTube's player script, frames only from YouTube, no inline styles or `eval`, no plugins.
- `sandbox`, `contextIsolation` and no `nodeIntegration`; the preload exposes one small typed API
  (`window.splitwatch`).
- The app never navigates away from itself, never opens `<webview>`, and opens only `https` links to
  YouTube and GitHub, in the user's browser.
- Permission requests are refused except fullscreen.
- YouTube requests get `Referer: https://com.mehmetburaktaskaya.splitwatch`, the identification
  YouTube asks native clients for (ADR 0001); no other request is changed.
- One instance at a time.
- Electron fuses: no `ELECTRON_RUN_AS_NODE`, no `NODE_OPTIONS`, no `--inspect`, cookie encryption on,
  app code loaded only from `app.asar` with embedded integrity validation.

**Checks.** On every push and pull request: type check, lint, format check and unit tests; the smoke
tests on Windows and macOS; packaging on both, with the packaged app started once in `--smoke-test`
mode. A `v*` tag builds the installers into a draft GitHub Release.

## Consequences

- Main-process code that should be unit-tested lives in Electron-free modules (`src/main/policy.ts`).
- Playwright's Electron support is marked experimental; if it breaks, the smoke tests can fall back to
  the packaged app's `--smoke-test` mode.
- Adding a permission, an external host or a CSP source is a deliberate change in `src/main/policy.ts`,
  covered by its unit tests.
