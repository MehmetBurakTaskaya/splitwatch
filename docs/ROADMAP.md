# Roadmap

Each phase ends with a release that is tested on Windows and, where possible, on macOS.

| Phase | Content                                                                                                                                              | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0     | Technical spike: Tauri 2 or Electron ([ADR 0001](adr/0001-desktop-framework.md))                                                                     | done   |
| 1     | Project skeleton, languages system, CI on both platforms, installers, updates (v0.1.0)                                                               | done   |
| 2     | Stream grid, adding streams by link, player control, audio focus, keyboard shortcuts (v0.2.0)                                                        | done   |
| 3     | YouTube Data API layer (your own key, kept in the system credential store), quota manager, cache, channel feeds, search, sport presets, keyless mode | done   |
| 4     | Theme engine, the first 12 sport themes, sport icons                                                                                                 | done   |
| 5     | Saved layouts, mini mode, tray or menu bar, live notifications, start with the system                                                                | done   |
| 6     | Summer Games and Winter Games event modes                                                                                                            | done   |
| 7     | Extra features (below)                                                                                                                               |        |
| 8     | Languages: Spanish, Simplified Chinese, Japanese, German, French, Brazilian Portuguese, Arabic, Korean, Italian, Russian, Turkish                    |        |
| 9     | Polish: accessibility, performance, onboarding, final icon, v1.0.0                                                                                   |        |

## Phase 7 extra features

- Spoiler protection: hide titles and thumbnails that may show a score
- Upcoming streams calendar with reminders, outside the event modes too
- Pop a tile out into its own window (multiple monitors)
- Live chat panel, if YouTube's chat embed works in the app
- Delay alignment between streams (experimental, for streams with DVR)
- Shareable layout links (`splitwatch://`)
- Quiet theme sound effects
- Community themes and a theme editor
- Watch history and statistics, kept on the computer
- Ambient mode: a themed waiting screen when nothing is live
- Linux build (AppImage)
- Replace a stream that has ended with the next live one from the same preset
- Global media keys and system-wide shortcuts
- Portable Windows build (ZIP, no installer)
- Import followed channels from a Google Takeout subscriptions file

## Later

- Presets for more sports, once an official channel that streams on YouTube is verified: climbing
  (IFSC), archery (World Archery), figure skating (ISU) and others
- More sport themes after the first 12
- Windows on ARM build
- Free Windows code signing through SignPath Foundation ([signing](signing.md))
- A setting to turn off update checks
