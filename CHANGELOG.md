# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MehmetBurakTaskaya/splitwatch/releases/tag/v0.1.0
