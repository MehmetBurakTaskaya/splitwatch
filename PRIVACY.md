# Privacy policy

Splitwatch has no account, no tracking and no analytics. It sends nothing about you to its
developer. Everything it stores stays on your computer.

## What Splitwatch connects to

| Service                                 | When                                 | What is sent                                            |
| --------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| GitHub (`api.github.com`, `github.com`) | At start, to check for a new version | A normal web request with your IP address; nothing else |

As features arrive, this table grows, and this file changes in the same release. Planned:

| Service                                                         | When                                                              | What is sent                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| YouTube embedded player (`youtube.com`, `youtube-nocookie.com`) | While you watch                                                   | What any embedded YouTube player sends; YouTube may set cookies |
| YouTube Data API v3                                             | Only if you add your own API key: searching, checking live status | Your search terms and channel or video IDs, with your API key   |
| YouTube channel feeds (RSS)                                     | To find new videos of channels you follow                         | Channel IDs                                                     |
| GitHub (`raw.githubusercontent.com`)                            | To update the sport presets                                       | A normal web request                                            |

## YouTube

Splitwatch uses YouTube API Services: the official embedded player and, with your key, the YouTube
Data API. YouTube's use of your data is covered by the
[YouTube Terms of Service](https://www.youtube.com/t/terms) and the
[Google Privacy Policy](https://policies.google.com/privacy). You can revoke a key's access at any time
in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## What is stored on your computer

Your settings and, in later versions, your saved layouts, followed channels and a cache of stream
information, in Splitwatch's app data folder. A YouTube API key is kept in your system's credential
store (Windows Credential Manager or the macOS Keychain), never in a plain file. Uninstalling the app
and deleting its app data folder removes everything.

## Contact

Questions about privacy: open an issue at
[github.com/MehmetBurakTaskaya/splitwatch/issues](https://github.com/MehmetBurakTaskaya/splitwatch/issues).
