# ADR 0009: Dialogs over players, spoilers, reminders, layout links, media keys, more packages

- Status: accepted
- Date: 2026-10-31

## Context

Phase 7 brings extra features in two halves. The first half (0.7) starts with a rule left open in
0.6: YouTube's Required Minimum Functionality allows no "overlays, frames, or other visual elements
in front of any part of a YouTube embedded player", and Splitwatch's dialogs (Settings, search,
layouts, the event window) opened over the grid. Then: spoiler protection, a calendar of upcoming
streams with reminders, the next live stream when one ends, shareable layouts, the keyboard's media
keys, a portable Windows build and a Linux build.

## Decision

**A dialog takes the grid out of view.** While any dialog is open the grid is not displayed and its
players pause (the same path as the enlarged view and the mini player: `syncPlayback`), and they go
on when it closes. `display: none` rather than `visibility: hidden`: a hidden frame can be throttled
and stop answering. A player hidden while it still buffers may ignore the pause; the app asks again
every second, and a player that starts playing out of sight is paused at once.

**Spoiler protection** blurs titles and thumbnails wherever the app shows them (lists, tiles, the
event schedule, banners) until the pointer or the focus reaches them, and leaves titles out of
notifications and the tray. It blurs every title rather than guessing which ones hold a result: a
guess that misses spoils. YouTube's own player can still show a title over the video; the app may
not cover it.

**Reminders** are their own part of the settings (0.6 kept them with the events, and they are
carried over). The coming week lists the preset channels' upcoming streams from the same data as
Live now, so it costs no extra quota.

**The next live stream** is offered in a banner, never started by itself: an automatic start next to
other playing players is what YouTube's autoplay rule forbids.

**Layout links** use the `splitwatch://layout` scheme, with the streams, layout, sports and an
optional name as query parameters. A link can come from anywhere: every part is checked, anything
unknown is dropped, and the page asks before it replaces the grid. The installed app registers the
scheme (Windows at run time in the user's registry; macOS and Linux through the package); a
development build never does, so it cannot take the scheme from the installed app.

**Media keys** are global shortcuts, off by default because no other app can use them meanwhile. They
reach an open window only. macOS gives them to trusted accessibility clients only, and Settings says
so.

**Packages.** Windows releases add a ZIP of the app. It has no uninstaller next to it, which is how
the app knows not to update itself (it offers the download, like macOS). Linux gets an AppImage,
which electron-updater can update. Ubuntu 23.10 and later restrict the user namespaces that
Chromium's sandbox needs; the README explains the options instead of the app turning the sandbox
off. CI builds and starts the AppImage's app under a virtual display on a runner that allows the
namespaces.

## Consequences

- Opening Settings or the search pauses the grid; that is the price of the overlay rule.
- Spoiler protection is visual: screen readers still read titles.
- The scheme's registry entry stays on Windows after uninstalling, pointing to a missing program.
- The Linux build is experimental: tested in CI only, not on a desktop.
