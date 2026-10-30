# ADR 0005: YouTube Data API layer, presets and quota

- Status: accepted
- Date: 2026-10-30

## Context

Search and live checks need the YouTube Data API v3. The app is open source, so it cannot ship a key:
each user brings their own free key (BYOK), and everything must also work, more simply, without one.
Facts checked in the official documentation on 2026-10-30:

- `search.list` draws from a separate "Search Queries" bucket of 100 calls a day by default; each call
  counts 1. Older material, including this project's brief, still says 100 units from the general pool.
- `videos.list`, `channels.list` and `playlistItems.list` cost 1 unit each from 10,000 units a day.
- Every request counts, invalid ones included. Quotas reset at midnight Pacific Time.
- Developer Policies III.E.4: API data may be cached for at most 30 days, then refreshed or deleted,
  and the latest data must be shown.
- Channel feeds (`/feeds/videos.xml?channel_id=…`) are public Atom feeds of a channel's latest 15
  videos and cost no quota.
- Electron 45 deprecates the synchronous `safeStorage` API (removal planned for Electron 46).

## Decision

**All API calls in the main process.** The key never reaches the page. The renderer asks for search
results, "Live now" and live states over IPC.

**Key storage.** `safeStorage`'s asynchronous API encrypts the key; only the encrypted bytes are
written (`youtube-api-key.bin` in the app data folder). On macOS the encryption key lives in the
Keychain (the first use may ask for permission); on Windows it is DPAPI, bound to the Windows user.
The brief asked for Windows Credential Manager. A module that writes there directly needs native
binaries per architecture, which breaks the universal macOS build; DPAPI gives the same protection
(other Windows users cannot read it, the same user's apps can, as with Credential Manager) without a
native dependency. Where no secure backend exists (some Linux desktops), no key is stored at all.
A new key is tested with the cheapest call (videos.list, 1 unit) before it is saved.

**Quota.** A local ledger (`quota.json`) counts both buckets per Pacific day and stops before the
limits; the limits are settings (default 100 searches, 10,000 units) for projects with more quota.
Background work (live checks) stops at 90% of the units, so the user's own actions keep working.
When the API reports a bucket as exhausted, the app stops using it until the reset. The search
palette shows the cost and the searches left before every search.

**Live now without search.** For the preset channels, the feeds give the latest videos (free); one
`videos.list` call per 50 of them (1 unit) gives live state, schedule and embeddability. Results are
cached in memory for minutes (live 2, upcoming 5, others 30; feeds 10; searches 10) and refreshed
only while the window is visible. Without a key, "Live now" becomes "Latest from your sports", from
the feeds alone.

**Presets as data.** One JSON file per sport in `presets/`, checked by `presets/schema.json` and by
`validatePreset`. Only official channels of organizers, leagues or federations go in, by channel ID,
with the day the ID was checked and a review note when ownership is not confirmed. The app ships the
files and refreshes them once a day from the repository's raw files on GitHub; a fetched set replaces
the shipped one only if every file is valid. Sports without a verified official channel get no preset
rather than a keyword search, which would surface unofficial re-streams.

**History.** Streams the user added are kept (video ID, title, channel) for local suggestions, for at
most 30 days and 100 items.

**Tests.** Unpackaged builds accept `SPLITWATCH_YOUTUBE_API_BASE`, `SPLITWATCH_FEEDS_BASE`,
`SPLITWATCH_TEST_API_KEY` and `SPLITWATCH_NO_REMOTE_PRESETS`, so the smoke tests run against a local
fake API without real quota or the Keychain. Packaged builds ignore them.

## Consequences

- A YouTube key is optional everywhere: link pasting, presets and feeds work without one.
- PRIVACY.md lists the API, the feeds and GitHub as services the app talks to.
- Live notifications (phase 5) reuse the same feeds, cache and ledger, with a slower background pace.
