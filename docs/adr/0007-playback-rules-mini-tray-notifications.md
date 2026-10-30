# ADR 0007: Playback rules, saved layouts, mini player, tray and live notifications

- Status: accepted
- Date: 2026-10-31

## Context

Phase 5 adds saved layouts, a mini mode, a tray (menu bar) icon, live notifications and starting with
the system. Planning it, YouTube's rules were read again (Required Minimum Functionality, updated
2026-10-15, and the Developer Policies):

- "A page or screen must not have more than one YouTube player that automatically plays content
  simultaneously". Automatic playback covers the `autoplay` parameter and playback started through
  the IFrame API; the rules do not define it further.
- An API client must not "play content … from a background player", one "not displayed in the page,
  tab, or screen that the user is viewing" (Developer Policies III.I.9).

Until 0.4, every restored stream started by itself, and the enlarged view hid the other players with
`display: none` while they kept playing muted.

## Decision

**Playback started by the user is not automatic.** The user chose this reading on 2026-10-31. Adding
a stream, a tile's play button, **Play all**, opening a saved layout, a click in the tray or on a
notification, and going back to the grid are the user asking for those streams. Only a restore (the
app opening, or a new window after the old one closed) starts streams without being asked, so it
starts one: the selected stream. The others wait with YouTube's own play button until **Play all** or
their own button (`SessionState.waiting`).

**No player plays out of sight.** `src/renderer/player/players.ts` knows which streams are on screen:
none while the window is minimized or hidden (the main process reports it), the enlarged one in the
enlarged view, the picked one in the mini player, otherwise all. A playing player that leaves the screen
is paused and remembered; when it comes back it resumes, a live stream at its live edge (for a live
stream `getDuration()` is the time since it began). Adding a stream leaves the enlarged view, so a new
player never starts hidden. A window covered by other windows still counts as shown: the app cannot
know it reliably, and it is not a feature that plays in the background.

**Saved layouts** live in `settings.json` (up to twenty): the streams, their order, the layout, the
picked stream, volumes and sports. Sound on or off and the main volume are not part of a layout.

**Mini mode** reuses the main window rather than opening a second one, so the picked stream's player
(and its place in the live stream) stays as it is. The window keeps its frame, stays on top, shrinks to
one tile whose player is at least 200 × 200 px, and comes back to its earlier bounds; the mini bounds
are kept for next time.

**Tray.** With "keep running" on, closing the window destroys it (its players stop and its memory is
freed), and the app stays in the tray. The next window restores the grid under the restore rule above.
The tray's menu and the notifications are made in the main process with the page's messages
(`src/main/i18n.ts`, the same `en.json` and locale choice), since they show while no page exists. The
main process therefore bundles i18next; the packaged app ships no node_modules except electron-updater.

**Live notifications** need a key: the free channel feeds list a channel's latest videos but not
whether one is live. Every ten minutes the feeds of the watched channels (the preset channels of the
chosen sports and the followed channels, 50 at most) and one `videos.list` call per 50 videos find the
live streams, within the background share of the quota. Each stream is told about once (`notified.json`,
two days), three at most per check. Following a channel uses the channel from the same `videos.list`
answer that the LIVE badges use.

**Starting with the system** uses `app.setLoginItemSettings`, and the system's own list is the source
of truth. On Windows "start in the tray" is a `--hidden` argument in the startup entry; on macOS the
app checks `wasOpenedAtLogin`. Development builds do not offer it, since they would register the bare
Electron binary.

## Consequences

- A restored grid of several streams needs one click (Play all) to play fully.
- Covering the window does not pause it; minimizing it does.
- On macOS, notifications and login items may not work while the app has no developer signature
  (Electron's documentation says so for both); Settings reports a test notification that did not show,
  and macOS's "requires approval" state for login items. Both are unverified on a real Mac.
- On Windows, notifications use the Start menu shortcut that the installer creates with the app's ID;
  a development build shows them under that shortcut only if Splitwatch is installed.
