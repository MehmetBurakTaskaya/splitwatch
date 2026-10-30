# Privacy policy

Splitwatch has no account, no tracking and no analytics. It sends nothing about you to its
developer. Everything it stores stays on your computer.

## What Splitwatch connects to

| Service                                 | When                                                  | What is sent                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube embedded player (`youtube.com`) | While streams are in the grid                         | What any embedded YouTube player sends; YouTube may set cookies. The app identifies itself to YouTube as `com.mehmetburaktaskaya.splitwatch` |
| YouTube oEmbed (`youtube.com/oembed`)   | When a stream is added, to show its title and channel | The video ID                                                                                                                                 |
| GitHub (`api.github.com`, `github.com`) | At start, to check for a new version                  | A normal web request with your IP address; nothing else                                                                                      |

As features arrive, this table grows, and this file changes in the same release. Planned:

| Service                              | When                                                              | What is sent                                                  |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| YouTube Data API v3                  | Only if you add your own API key: searching, checking live status | Your search terms and channel or video IDs, with your API key |
| YouTube channel feeds (RSS)          | To find new videos of channels you follow                         | Channel IDs                                                   |
| GitHub (`raw.githubusercontent.com`) | To update the sport presets                                       | A normal web request                                          |

## The clipboard

When the Splitwatch window comes to the front, it looks at the clipboard once for a YouTube link and,
if it finds one that is not in the grid, offers to add it. Nothing else on the clipboard is used, kept
or sent. You can turn this off in **Settings → Offer to add YouTube links I copy**.

## YouTube

Splitwatch uses YouTube API Services: the official embedded player and, with your key, the YouTube
Data API. YouTube's use of your data is covered by the
[YouTube Terms of Service](https://www.youtube.com/t/terms) and the
[Google Privacy Policy](https://policies.google.com/privacy). You can revoke a key's access at any time
in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## What is stored on your computer

`settings.json` in Splitwatch's app data folder: your settings, your keyboard shortcuts and the
streams in your grid (their video IDs, layout and volumes), so the grid comes back next time. Later
versions add saved layouts, followed channels and a cache of stream information there. A YouTube API
key will be kept in your system's credential store (Windows Credential Manager or the macOS Keychain),
never in a plain file. Uninstalling the app and deleting its app data folder removes everything.

## Contact

Questions about privacy: open an issue at
[github.com/MehmetBurakTaskaya/splitwatch/issues](https://github.com/MehmetBurakTaskaya/splitwatch/issues).
