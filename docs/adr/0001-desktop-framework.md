# ADR 0001: Desktop framework

- Status: accepted: Electron
- Date: 2026-10-30
- Deciders: the owner, on the recommendation below

## Context

Splitwatch shows several YouTube live streams side by side in one window, on Windows and macOS
(Linux later), using only the official YouTube embedded player. Video playback reliability comes
first; when everything else is even, the lighter framework (Tauri 2) wins.

YouTube's embedded player refuses to start without client identification:

- The IFrame Player API reference defines error 153 as "The request lacks an HTTP Referer header or
  equivalent API client identification".
- The YouTube API Services Required Minimum Functionality page asks native clients to send a
  `Referer` of `https://` plus their app identifier (reverse DNS), and gives WebView2's
  `SetHeader` as the Windows example. Players must be at least 200 × 200 px, with nothing drawn
  over them.
- Tauri issue #14422 (closed without a framework fix): embeds work in Windows production builds,
  whose origin is `http://tauri.localhost`, and fail with error 153 on macOS and Linux, whose
  origin is `tauri://localhost`.

## What was tested

A throwaway spike (kept in a separate private repository, none of its code is reused) built both
frameworks from one shared UI: a grid of IFrame Player API
players with muted autoplay, per-tile sound, play and pause, seeking, enlarge, window fullscreen,
always-on-top, a tray icon and a notification. A self-test loads four videos, records every player
event and error code, drives the controls of one tile and writes JSON.

| Variant | Framework   | How the player is loaded                                                                         |
| ------- | ----------- | ------------------------------------------------------------------------------------------------ |
| a1      | Tauri 2.12  | IFrame API in the app page, default origin                                                       |
| a2      | Tauri 2.12  | a1 plus `Referer: https://com.mehmetburaktaskaya.splitwatch` set through WebView2 (Windows only) |
| a3      | Tauri 2.12  | wrapper page in an iframe, served from `http://127.0.0.1:<random port>` by the app               |
| a3l     | Tauri 2.12  | a3 with the host name `localhost` instead of the IP address                                      |
| a4      | Tauri 2.12  | whole app served by `tauri-plugin-localhost` on a fixed port, with a remote capability for IPC   |
| b1      | Electron 45 | `app://` protocol plus the same `Referer` on YouTube requests (`session.webRequest`)             |
| b2      | Electron 45 | `file://`                                                                                        |
| b3      | Electron 45 | `app://` without the header                                                                      |

A wrapper page on an HTTPS host (the brief's option b) was not run: GitHub Pages needs a public
repository on the free plan, cannot set the `frame-ancestors` header (it does not work in a
meta tag either), and a3 showed that a wrapper's own origin decides which videos play.

Windows: a Ryzen 9 7940HS laptop (16 logical cores, 15 GB RAM, RTX 4070 Laptop and Radeon 780M),
Windows 11, WebView2 156, home network, three rounds. macOS: GitHub Actions `macos-latest`
(Apple Silicon), two rounds.

## Results

### Playback on Windows (local, three rounds, identical each time)

| Variant | Playing | Error codes                         | Controls | Always on top, fullscreen, notification |
| ------- | ------- | ----------------------------------- | -------- | --------------------------------------- |
| a1      | 4/4     | none                                | all work | all work                                |
| a2      | 4/4     | none                                | all work | all work                                |
| a3      | 3/4     | 150 on a record label's music video | all work | all work                                |
| a3l     | 4/4     | none                                | all work | all work                                |
| a4      | 4/4     | none                                | all work | all work                                |
| b1      | 4/4     | none                                | all work | all work                                |
| b2      | 0/4     | 153                                 | –        | all work                                |
| b3      | 0/4     | 153                                 | –        | all work                                |

- Error 153 is exactly the missing identification: Electron without the header fails, with it
  every video plays.
- a3 versus a3l: the same video is refused (150, "the owner does not allow embedding") when the
  wrapper is served from `127.0.0.1` and plays when it is served as `localhost`. Some content
  owners restrict embedding by the embedding site, so the origin YouTube sees decides what plays.
  Sports rights holders may restrict in the same way.
- Muted autoplay was never blocked.

### macOS (GitHub Actions, Apple Silicon)

| Variant | Round 1  | Round 2                                                          |
| ------- | -------- | ---------------------------------------------------------------- |
| a1, a2  | 0/4, 153 | 0/4, 153                                                         |
| a3      | 0/4, 150 | 0/4, 150                                                         |
| a3l     | not run  | 0/4: three 150; the fourth loaded but muted autoplay was blocked |
| a4      | 0/4, 150 | 0/4: three 150; the fourth loaded but muted autoplay was blocked |
| b1      | 1/4, 150 | 1/4: three 150; the fourth played with muted autoplay            |
| b2, b3  | 0/4, 153 | 0/4, 153                                                         |

- 153 on macOS hits exactly the variants without identification: Tauri's default origin
  (`tauri://localhost`) and Electron without the header. This confirms issue #14422.
- Error 150 on GitHub's runners is YouTube's bot check: the screenshots show "Sign in to confirm
  you're not a bot" in those tiles, and on the Windows runner the variants that play 4/4 at home
  (a1, a2, a3l, a4, b1) got the same 150 on three of four videos. CI therefore proves only the
  identification step; playback needs a Mac on a home network ([testing on a Mac](../testing-macos.md)).
- The one video that passed the bot check shows a difference: Electron (Chromium) started it with
  muted autoplay, while Tauri on macOS (WebKit) loaded the player and fired `onAutoplayBlocked`
  in a3l and a4. A WebKit setting may allow it; the spike did not find or verify one.

### Resources (Windows, 30 s warm-up, 120 s sampling, whole process tree)

CPU is the share of all 16 logical cores; private memory does not double-count shared pages.

| Run                         | CPU average | Private memory | Processes |
| --------------------------- | ----------- | -------------- | --------- |
| Tauri a2, 4 live streams    | 2.0 %       | 697 MB         | 9         |
| Electron b1, 4 live streams | 2.1 %       | 736 MB         | 6         |
| Tauri a2, 9 live streams    | 3.8 %       | 1,235 MB       | 9         |
| Electron b1, 9 live streams | 4.0 %       | 1,218 MB       | 6         |

On Windows both run the same engine (WebView2 is Chromium), and the players dominate the load,
so the two are even. The GPU video-decode counter read 0 for both; it is not reliable on this
machine and is left out. On macOS Tauri would use WebKit, so its numbers there may differ.

### Size and build (GitHub Actions)

|                            | Tauri                                                  | Electron        |
| -------------------------- | ------------------------------------------------------ | --------------- |
| Windows installer (NSIS)   | 2.4 MB                                                 | 114.8 MB        |
| macOS (Apple Silicon)      | 2.8 MB `.dmg`                                          | 111.7 MB `.zip` |
| Build time, Windows runner | 622 s cold, 194 s with the Cargo cache (Rust with LTO) | 110 s, 101 s    |
| Build time, macOS runner   | 147 s cold, 97 s with the cache                        | 44 s, 47 s      |

Both build for free on GitHub Actions. In a public repository the standard runners are free; in
a private one the free plan's $12 a month covers about 193 macOS minutes.

### Desktop features

| Feature                                 | Tauri 2                                                                                                                                     | Electron                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Always on top, fullscreen, notification | work on Windows (spike)                                                                                                                     | work on Windows (spike)                                                                                                                                                             |
| Tray or menu bar icon                   | works on Windows (spike)                                                                                                                    | works on Windows (spike)                                                                                                                                                            |
| Auto-update without paid signing        | official updater with its own free key pair and a `latest.json` on GitHub Releases; macOS behaviour without Apple signing is not documented | Windows (NSIS) through electron-updater; on macOS "your application must be signed for automatic updates" (Squirrel.Mac), so only an "update available" notice with a download link |
| Engine on macOS and Linux               | WebKit (WKWebView, WebKitGTK)                                                                                                               | Chromium everywhere                                                                                                                                                                 |

## Decision matrix

| Criterion                                                         | Weight | Tauri 2                                                                                                                     | Electron                                                                   |
| ----------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Playback works on Windows                                         | must   | yes (a1, a2)                                                                                                                | yes (b1)                                                                   |
| Playback works on macOS, with YouTube's documented identification | must   | no: the documented `Referer` cannot be set in WKWebView; only `localhost` workarounds pass the 153 check                    | yes: b1 passes the 153 check; playback still to be confirmed on a real Mac |
| Muted autoplay on macOS                                           | high   | blocked in a3l and a4 (CI)                                                                                                  | works (CI)                                                                 |
| Same identification on every platform                             | high   | no (a2 on Windows, a workaround elsewhere)                                                                                  | yes                                                                        |
| One engine to test (Chromium)                                     | high   | no (Chromium on Windows, WebKit on macOS and Linux)                                                                         | yes                                                                        |
| Security of the embed path                                        | high   | a3l opens a loopback HTTP port (host check, token, no IPC); a4 rejected: a process that takes the fixed port first gets IPC | no open port                                                               |
| CPU and memory                                                    | medium | even                                                                                                                        | even                                                                       |
| Download size                                                     | medium | far better (2.4 MB)                                                                                                         | 115 MB                                                                     |
| Free auto-update on macOS                                         | medium | likely (to prove in Phase 1)                                                                                                | no, notice and link only                                                   |
| Tray, always on top, notification, fullscreen                     | medium | even                                                                                                                        | even                                                                       |
| Linux later                                                       | low    | WebKitGTK, same 153 problem                                                                                                 | Chromium                                                                   |

## Recommendation

**Electron.** The criteria are not even: on the first one, playback, Electron identifies itself
to YouTube the documented way on every platform with one line of code, while Tauri can do so
only on Windows and needs a `localhost` workaround on macOS and Linux. The workaround works
today but is not the identification YouTube documents, and a3 showed that the origin YouTube
sees can decide which videos play. YouTube already enforces identification (error 153); a
workaround that its check happens to accept today is a weaker footing than the documented method.
Electron also runs one engine on every platform, so what is tested on Windows holds on macOS; the
one video that got past CI's bot check autoplayed muted in Electron and was blocked in Tauri's
WebKit.

What Electron costs, and how the product handles it:

- **Download size, 115 MB instead of 2.4 MB.** Accepted: it is one download, and memory and CPU
  while watching are the same.
- **No silent auto-update on macOS without a paid Apple certificate.** Windows updates through
  electron-updater and NSIS; macOS checks GitHub Releases and offers the download. Revisit if
  the project ever gets free signing for open source on macOS.
- **A larger attack surface than Tauri.** Kept small: `contextIsolation`, `sandbox`, no Node in
  the renderer, a strict CSP served with the `app://` protocol, and the `Referer` added only to
  YouTube requests.

The alternative, if the owner prefers the lighter app: Tauri 2 with the WebView2 header (a2) on
Windows and the `localhost` wrapper (a3l) on macOS and Linux, accepting the workaround risk, a
loopback port and two engines to test. Before choosing it, the macOS checklist should show a3l
playing reliably on a real Mac, including live sports streams, and a WebKit autoplay setting
should be found that lets muted players start on their own.

Either way, playback should be checked once on a real Mac ([testing on a Mac](../testing-macos.md))
when the grid arrives.

## Consequences

- Phase 1 sets up Electron with electron-builder (NSIS on Windows, universal `.dmg` and `.zip` on
  macOS, ad-hoc signed), electron-updater for Windows and an update notice for macOS.
- The app is served from a custom `app://` protocol with its CSP in the response headers; YouTube
  requests get `Referer: https://com.mehmetburaktaskaya.splitwatch` (the app identifier).
- Player controls sit outside the player, and tiles never get smaller than 200 × 200 px.
- The product's self-test keeps the error-153 check in CI on both platforms; error 150 on CI runners
  is expected and is not a failure.
