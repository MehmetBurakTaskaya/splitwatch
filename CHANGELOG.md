# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.9.0] - 2026-10-31

Splitwatch now speaks twelve languages.

### Added

- The interface in Spanish, Simplified Chinese, Japanese, German, French, Brazilian Portuguese,
  Arabic (right to left), Korean, Italian, Russian and Turkish, besides English. Splitwatch follows
  your system's language; **Settings → Language** picks another, and the window, the tray menu and
  the notifications switch at once. No native speaker has checked these translations yet, and
  Settings says so; corrections are welcome.

### Changed

- The themes in Settings are in the order of their names in your language.

### Fixed

- In right-to-left languages, the hint in the link field showed its words in the wrong order.

## [0.8.0] - 2026-10-31

Splitwatch now pops streams out into windows of their own, shows the live chat, lines up streams
that run ahead of one another and lets you make your own themes.

### Added

- Pop a stream out into a window of its own (the button on a stream), for a second screen. Its sound
  goes along when it is the one you hear, and **Back to the grid** brings it back.
- The live chat of a stream beside the grid (the chat button on a stream), to read. **Chat in your
  browser** opens it in your browser, where you can sign in and write.
- Line up the streams (experimental; the button in the top bar, with two or more streams): hold back
  a stream that runs ahead, by seconds, until the streams show the same moment. It works on streams
  that YouTube lets you rewind.
- Your own themes (Settings, Appearance, **New theme**): colors for light and dark, a background and a
  heading font, with the whole app wearing the theme while you edit. A theme whose text would be hard
  to read cannot be saved. Themes go in and out as files, to share them.
- Your watching (in Live now, or Settings, Watch history): the time you watched in the last 7 and 30
  days, by sport and by channel, and the streams you watched lately, kept on this computer only.
- A waiting screen (on the start screen): a large clock over the theme's background that counts down
  to your reminders and the coming streams, and keeps the display on.
- Quiet theme sounds (Settings, Sound; off by default): soft sounds in the theme's style when a stream
  comes or goes, the layout changes or a reminded stream is about to start.
- Follow the channels of your YouTube subscriptions (Settings, Live notifications): pick them from the
  `subscriptions.csv` of a Google Takeout export.

### Changed

- A reminder now stays, marked, until an hour after its start, so the waiting screen and the coming
  week still show it.

### Fixed

- A live stream that paused out of sight could go on a few seconds behind where it was; it now goes
  on as far behind live as it was.
- A reminder that had gone out could come back and go out again after you set another one.

## [0.7.0] - 2026-10-31

Splitwatch now keeps spoilers out of sight, lists the coming week, shares layouts as links and runs on
Linux.

### Added

- Spoiler protection (Settings, Appearance): titles and thumbnails stay blurred until you point at
  them, and notifications leave titles out.
- The coming week (in Live now): the upcoming streams of your sports by day, with Remind me.
- When a stream ends, a banner offers a live stream of the same sport in its place.
- Layout links: copy a saved layout or the grid as a `splitwatch://` link; opening one asks whether
  to open it or keep it.
- The keyboard's media keys (Settings, Sound): play or pause the picked stream and pick the next or
  previous one, also from the background.
- A portable Windows ZIP, and an AppImage for Linux (experimental).

### Changed

- A dialog such as Settings now hides the grid and pauses its streams while it is open, since YouTube
  allows nothing in front of a player.

## [0.6.0] - 2026-10-31

Splitwatch now has modes for the Summer and Winter Games, with their look, a day-by-day schedule and
the medal table.

### Added

- Summer Games and Winter Games modes, offered in the top bar from 30 days before an edition opens
  and open to try at any time: floodlights or the northern lights and snow (also over each sport's
  own background), a band of the event's colors in the top bar and a short opening animation.
- A day-by-day schedule of sports and medal events, with the preset channels' live and upcoming
  streams of each day, Remind me, a search for a sport's live streams, and Watch the finals.
- The medal table from English Wikipedia, with your country highlighted (the system's region by
  default).
- Calendars for the 2026 Youth Summer Games in Dakar, the 2028 Summer Games in Los Angeles and the
  2026 Winter Games, and the dates of the 2030 Winter Games; they update from GitHub without a new
  release.

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

[Unreleased]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MehmetBurakTaskaya/splitwatch/releases/tag/v0.1.0
