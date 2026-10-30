# ADR 0004: Stream grid and players

- Status: accepted
- Date: 2026-10-30

## Context

The grid holds up to nine YouTube players. YouTube's rules set the frame: the official embedded player
only, players at least 200 × 200 px, nothing drawn over a player. Several browser behaviors matter:
an iframe reloads when it moves in the DOM, a click inside a cross-origin iframe takes the keyboard
focus into it, and YouTube's player has its own keyboard shortcuts and fullscreen button.

## Decision

**Players.** One IFrame Player API player per tile, created once and kept while the tile lives, with
`autoplay=1&mute=1` (Electron's autoplay policy is `no-user-gesture-required`, set explicitly),
`fs=0` (enlarging goes through the app), `disablekb=1` (the app's shortcuts are the only ones),
`rel=0`, `iv_load_policy=3` and `playsinline=1`. Sound is set from the session in one place
(`src/renderer/player/players.ts`): only the picked stream is unmuted, at its volume times the main
volume; the others play muted.

**No reloads when reordering.** Tiles are rendered in a fixed DOM order (sorted by video ID) and placed
with the CSS `order` property. Moving, swapping or adding a stream never moves an existing iframe in
the DOM, so no stream restarts. The large view hides the other tiles with `display: none`, which keeps
their players running.

**Sizes.** Each layout knows its minimum content size (`src/shared/layouts.ts`): 200 × 200 px per
player plus a 36 px control bar per tile, 4 px gaps, a 48 px top bar. The main process turns it into
the window's minimum size, never larger than the screen's work area. Three rows fit a 1080p screen at
125% scaling. Narrow tiles hide the volume slider, the seek buttons and the YouTube link (container
queries); the keyboard still seeks.

**Nothing over the player.** Titles, channel names and every control sit in the bar under the player.
When a player fails, it is replaced, not covered, by a panel with the reason and an "Open on YouTube"
link. Error codes: 101 and 150 not embeddable, 100 removed or private, 2 invalid ID, 5 playback error,
153 missing identification (should never happen; the message asks for a report), and the app's own
-1 when the IFrame API script cannot load.

**Picking a stream.** Clicking a tile's title or number, its sound button, the keys 1–9, or a click
inside the player picks it. A click inside the player is noticed through the page's `blur` event
with the iframe as `document.activeElement`; the app then takes the focus back so its shortcuts keep
working. In the hover setting, the stream under the pointer is the one you hear.

**Titles.** YouTube's oEmbed endpoint gives the title and channel without an API key or quota. The main
process fetches it and caches the answer for the session.

**Clipboard.** When the window gains focus, the renderer asks the main process for a YouTube video ID
on the clipboard. The main process reads the clipboard only then, only with the setting on, and returns
only a video ID. Each link is offered once.

**Settings and session.** A versioned `settings.json` in the app data folder, written atomically and at
most every 400 ms, and validated field by field on load (`src/shared/settings.ts`), so a damaged file
falls back to defaults instead of stopping the app. The last grid comes back on the next start.

**Shortcuts.** Keys are named from the keyboard event (`Alt+ArrowLeft`, `Shift+?`); on non-Latin
layouts and with Alt, letters use the physical key, so `M` works on a Russian or Turkish keyboard.
Every action can be reassigned except 1–9, Escape, Tab and Enter.

## Consequences

- A live stream's "LIVE" badge and the sport icon need the Data API and the theme engine (phases 3, 4).
- YouTube's own player controls (play, volume, captions, quality) stay available inside each player.
- On CI runners YouTube's bot check answers many embeds with error 150; the smoke test fails only on 153.
