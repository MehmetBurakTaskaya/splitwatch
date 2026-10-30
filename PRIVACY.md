# Privacy policy

Splitwatch has no account, no tracking and no analytics. It sends nothing about you to its
developer. Everything it stores stays on your computer.

## What Splitwatch connects to

| Service                                     | When                                                                                                                           | What is sent                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube embedded player (`youtube.com`)     | While streams are in the grid                                                                                                  | What any embedded YouTube player sends; YouTube may set cookies. The app identifies itself to YouTube as `com.mehmetburaktaskaya.splitwatch` |
| YouTube oEmbed (`youtube.com/oembed`)       | When a stream is added, to show its title and channel                                                                          | The video ID                                                                                                                                 |
| YouTube channel feeds (`youtube.com/feeds`) | Every few minutes while the window is visible, for "Live now"                                                                  | The IDs of the preset channels                                                                                                               |
| YouTube Data API v3 (`googleapis.com`)      | Only with your own API key: when you search, and every few minutes while the window is visible to check which streams are live | Your search words, video IDs and your API key                                                                                                |
| GitHub (`raw.githubusercontent.com`)        | Once a day, to update the sport presets                                                                                        | A normal web request                                                                                                                         |
| GitHub (`api.github.com`, `github.com`)     | At start, to check for a new version                                                                                           | A normal web request with your IP address; nothing else                                                                                      |

When the window is hidden, Splitwatch makes no requests for "Live now" or live states.

## The clipboard

When the Splitwatch window comes to the front, it looks at the clipboard once for a YouTube link and,
if it finds one that is not in the grid, offers to add it. Nothing else on the clipboard is used, kept
or sent. You can turn this off in **Settings → Offer to add YouTube links I copy**.

## YouTube

Splitwatch uses YouTube API Services: the official embedded player and, with your key, the YouTube
Data API. YouTube's use of your data is covered by the
[YouTube Terms of Service](https://www.youtube.com/t/terms) and the
[Google Privacy Policy](https://policies.google.com/privacy). You can revoke a key's access at any time
in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), and remove it from
Splitwatch in **Settings → YouTube API key → Remove key**.

## What is stored on your computer

In Splitwatch's app data folder:

- `settings.json`: your settings, keyboard shortcuts, chosen sports and quota limits, and the streams
  in your grid (video IDs, layout, volumes), so the grid comes back next time.
- `youtube-api-key.bin`: your API key, if you add one, encrypted by your system (the macOS Keychain or,
  on Windows, the Data Protection API tied to your Windows account). It is never stored as plain text.
- `quota.json`: how many API requests and searches were made today, to stay within your quota.
- `history.json`: video IDs, titles and channels of streams you added, for search suggestions. Entries
  are deleted after 30 days.
- `presets-cache.json`: the latest sport presets from GitHub.

Live states, feeds and search results are kept in memory only, for a few minutes. Uninstalling the app
and deleting its app data folder removes everything.

## Contact

Questions about privacy: open an issue at
[github.com/MehmetBurakTaskaya/splitwatch/issues](https://github.com/MehmetBurakTaskaya/splitwatch/issues).
