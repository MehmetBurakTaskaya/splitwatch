# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] - 2026-10-31

Splitwatch now keeps your layouts, shrinks to a mini player, waits in the notification area and tells
you when a channel goes live.

### Added

- Saved layouts: save the grid under a name (Ctrl + S, or Cmd + S, or the bookmark in the top bar),
  then open, rename or delete it; up to twenty.
- A mini player (I, or the button on a stream): the picked stream in a small window that stays on top
  of other windows, where you last put it. Escape goes back to the grid.
- Keep Splitwatch in the notification area (the menu bar on macOS) when its window closes. Its menu
  opens the window or the mini player, mutes, and lists what is live.
- Start Splitwatch when you sign in, optionally in the notification area only (installed app).
- Live notifications, with your own API key: for the official channels of the sports you pick and for
  channels you follow with the bell on a stream. A click adds the stream.
- A light or dark button in the top bar.
- Dialogs close with a click outside them or the close button in their corner, and Settings says that
  its changes are saved at once.

### Changed

- Following YouTube's rules for embedded players, only the stream you picked last starts by itself
  when Splitwatch opens; **Play all** starts the others. Streams pause while they are out of sight
  (behind the enlarged stream or the mini player, or in a minimized window) and go on when they come
  back, live streams at their live edge.
- The settings button is a gear.
- In narrow windows the top bar stays on one line.

## [0.4.0] - 2026-10-30

Splitwatch now dresses in the sport you watch: twelve sport themes, with backgrounds drawn by the app.

### Added

- Twelve sport themes, each with its own colors in light and dark and a background drawn by the app:
  Pool, Track, Transition, Peloton, Singletrack, Court, Beach, Hardwood, Swell, Rink, Slalom and
  Halfpipe.
- Automatic theme: the window takes the theme of the sport you watch. With mixed sports it stays
  neutral and each stream shows its own sport's color.
- A sport icon under each stream; click it to set the stream's sport. Streams from Live now, from a
  sport search or from a preset channel know their sport by themselves.
- Settings → Appearance: the theme, light or dark, animated backgrounds and performance mode.
- Theme headings in the Oswald and Exo 2 fonts.

## [0.3.0] - 2026-10-30

Splitwatch now finds live sports: Live now from official channels, and live-stream search with your own
YouTube API key.

### Added

- "Live now": live and upcoming streams from the official YouTube channels of 17 sports, ready to add
  in one click. Without an API key it shows their newest videos instead.
- Sport presets as data files in `presets/`, updated from GitHub once a day without a new release.
- Search for live streams (Ctrl + K, or Cmd + K on macOS), with sport filters, suggestions from Live now
  and recently added streams, and the cost shown before each search.
- Your own YouTube Data API key, in Settings, with a step-by-step guide; it is tested before it is
  saved and kept encrypted by the system.
- A LIVE or Upcoming badge on streams in the grid.
- Today's quota in Settings (searches and other requests, and when they reset); Splitwatch stops before
  the limits and keeps the last tenth of the requests for what you do yourself.
- Sports to show in Live now, in Settings.

## [0.2.0] - 2026-10-30

Splitwatch now plays streams: a grid of YouTube streams added by link.

### Added

- The stream grid: 1, 2, 3, 4, 6 or 9 streams, or one large stream with a side strip. The grid grows
  as streams are added, and every player stays at least 200 × 200 px.
- Add a stream by pasting a YouTube link (watch, youtu.be, live, embed, shorts) or a video ID. When the
  window comes to the front with a YouTube link on the clipboard, Splitwatch offers to add it.
- Each stream shows its title and channel, with sound, volume, play or pause, back and forward
  10 seconds, enlarge, "Open on YouTube" and remove below the player.
- Sound follows the stream you pick (by click, or under the pointer in Settings); a main volume and mute.
- Enlarge a stream to fullscreen; drag streams, or press Alt + arrow keys, to reorder them without
  restarting them.
- Clear messages for videos that cannot be embedded, removed or private videos and other player errors.
- Keyboard shortcuts, with a list (press ?) where each one can be changed.
- Settings, and the grid of the last session, come back on the next start.

## [0.1.1] - 2026-10-30

This version tests the update path: 0.1.0 on Windows should find it, download it and install it after
a restart. The app itself is unchanged.

### Changed

- Release notes are now built from this changelog by a Node.js script.

## [0.1.0] - 2026-10-30

The first version: the app's foundation and its release pipeline, without stream watching yet.

### Added

- Desktop app for Windows (NSIS installer) and macOS (universal `.dmg` and `.zip`).
- Automatic updates on Windows; an update notice with a download link on macOS.
- Interface language system with English, ready for right-to-left languages.
- Light and dark appearance that follows the system.
- Security baseline: sandboxed, isolated renderer without Node.js, strict Content Security Policy,
  hardened Electron fuses.

[Unreleased]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MehmetBurakTaskaya/splitwatch/releases/tag/v0.1.0
