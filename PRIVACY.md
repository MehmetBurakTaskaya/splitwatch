# Privacy policy

Splitwatch has no account, no tracking and no analytics. It sends nothing about you to its
developer. Everything it stores stays on your computer.

## What Splitwatch connects to

| Service                                     | When                                                                                                                                                                                                  | What is sent                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube embedded player (`youtube.com`)     | While streams are in the grid                                                                                                                                                                         | What any embedded YouTube player sends; YouTube may set cookies. The app identifies itself to YouTube as `com.mehmetburaktaskaya.splitwatch` |
| YouTube oEmbed (`youtube.com/oembed`)       | When a stream is added, to show its title and channel                                                                                                                                                 | The video ID                                                                                                                                 |
| YouTube channel feeds (`youtube.com/feeds`) | Every few minutes while the window is visible, for "Live now"; with live notifications or the tray on, also in the background                                                                         | The IDs of the preset channels and of the channels you follow                                                                                |
| YouTube Data API v3 (`googleapis.com`)      | Only with your own API key: when you search, every few minutes while the window is visible to check which streams are live, and in the background for live notifications and the tray's Live now list | Your search words, video IDs and your API key                                                                                                |
| GitHub (`raw.githubusercontent.com`)        | Once a day, to update the sport presets and the Summer and Winter Games calendars                                                                                                                     | A normal web request                                                                                                                         |
| English Wikipedia (`en.wikipedia.org`)      | When you open an event's medal table, at most every ten minutes                                                                                                                                       | The page ID of the medal table; nothing about you                                                                                            |
| GitHub (`api.github.com`, `github.com`)     | At start, to check for a new version                                                                                                                                                                  | A normal web request with your IP address; nothing else                                                                                      |

When the window is hidden, Splitwatch makes no requests for "Live now" or live states, unless you
turned on live notifications (every ten minutes) or keep Splitwatch in the notification area with a
key (its Live now list, every five minutes).

## Notifications, links and starting with the system

The installed app registers itself for `splitwatch://` links (on Windows in your account's registry,
on macOS and Linux through the app's package), so a layout link opens in Splitwatch. A link only
shows what it holds until you choose to open or keep it.

Live notifications are shown by your system; Splitwatch sends nothing anywhere to show them. Starting
Splitwatch when you sign in adds it to your system's list of startup apps (on Windows, the Run entry
of your account; on macOS, Login Items), and turning it off removes it.

## The clipboard

When the Splitwatch window comes to the front, it looks at the clipboard once for a YouTube link and,
if it finds one that is not in the grid, offers to add it. Nothing else on the clipboard is used, kept
or sent. You can turn this off in **Settings → Offer to add YouTube links I copy**. Splitwatch writes
to the clipboard only when you copy a layout link.

## YouTube

Splitwatch uses YouTube API Services: the official embedded player and, with your key, the YouTube
Data API. YouTube's use of your data is covered by the
[YouTube Terms of Service](https://www.youtube.com/t/terms) and the
[Google Privacy Policy](https://policies.google.com/privacy). You can revoke a key's access at any time
in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), and remove it from
Splitwatch in **Settings → YouTube API key → Remove key**.

## What is stored on your computer

In Splitwatch's app data folder:

- `settings.json`: your settings, keyboard shortcuts, chosen sports, theme and quota limits, the
  streams in your grid (video IDs, layout, volumes, sports), so the grid comes back next time, your
  saved layouts, where the mini player was, the channels you follow (their IDs and names), and for
  the Summer and Winter Games modes the mode you turned on and the country you follow, and your
  reminders (video IDs, titles and start times).
- `youtube-api-key.bin`: your API key, if you add one, encrypted by your system (the macOS Keychain or,
  on Windows, the Data Protection API tied to your Windows account). It is never stored as plain text.
- `quota.json`: how many API requests and searches were made today, to stay within your quota.
- `history.json`: video IDs, titles and channels of streams you added, for search suggestions. Entries
  are deleted after 30 days.
- `presets-cache.json`: the latest sport presets from GitHub.
- `events-cache.json`: the latest Summer and Winter Games calendars from GitHub.
- `notified.json`: the IDs of the live streams Splitwatch told you about, so it tells only once.
  Entries are deleted after two days.

Live states, feeds and search results are kept in memory only, for a few minutes. Uninstalling the app
and deleting its app data folder removes everything.

## Contact

Questions about privacy: open an issue at
[github.com/MehmetBurakTaskaya/splitwatch/issues](https://github.com/MehmetBurakTaskaya/splitwatch/issues).
