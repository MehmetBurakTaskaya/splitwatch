# ADR 0010: Pop-out windows, live chat, lining up streams, own themes, history, waiting screen, sounds

- Status: accepted
- Date: 2026-10-31

## Context

The second half of Phase 7 (0.8) brings the rest of the extra features: a stream in a window of its
own, the live chat, lining up streams that reach the viewer with different delays, themes of the
user's own, a watch history, a waiting screen, quiet sounds and following the channels of a YouTube
subscriptions list. Each of them meets YouTube's rules (one automatic start per screen, nothing over a
player, no playback out of sight, API data kept for 30 days at most) and the app's own (no tracking,
nothing stored outside the computer).

## Decision

**Pop-out windows.** A stream can move to a window of its own (up to four), which loads the same page
with `?popout=<id>`: one player and a bar, the settings read but the session never written. Its place
in the grid shows **Back to the grid**. The main process holds who is heard, `grid` or a popped-out
stream, and tells every window; the grid is silent while a window has the sound. A pop-out window
pauses while it is minimized or hidden, like the grid.

**Live chat.** YouTube's chat page answers in a frame only when it is told the embedding site,
`embed_domain`; the app gives its ID, the name it already sends YouTube as the Referer (without it
the page says `X-Frame-Options: SAMEORIGIN`). The chat shows in a panel beside the grid, never over a
player, read-only: writing needs a Google sign-in, which the app does not offer. The chat's own sign-in
button asks to send the whole window to Google; the frame may ask that only on a click
(`allow-top-navigation-by-user-activation`), the main process refuses every navigation away from the
app and, for that one, opens the stream's chat in the browser. `dark_theme=1` follows the app's mode;
`hl` is ignored, so the chat speaks the language of YouTube's own setting.

**Lining up streams** is experimental. A stream that runs ahead is held back by rewinding it by
seconds (up to ten minutes), which needs a stream that YouTube lets the viewer rewind. The delays live
with the session and are not saved. Measuring the delay to live is not possible: in a live player,
`getDuration()` changes only now and then, so seeking to it, as 0.7 did when a live stream came back
into view, could land seconds behind. A player paused out of sight now keeps where it stopped and
when, and goes on by as long as it was held; YouTube stops a seek past the live edge at the edge. This
keeps both a natural delay and one the user set.

**Own themes** have the shape of the theme files (`themes/schema.json`) plus a `name`, no sports and
no event, and are kept in the settings (twenty at most). The editor shows the theme on the whole app
while it is open (the theme engine stops choosing until it closes) and saves it only when every
contrast rule passes in both modes; a file comes in only on the same terms. An own theme never takes
an app theme's ID: an imported file with one gets a new ID from its name. Files go in and out through
the system's file dialogs, from the main process.

**Watch history.** Every 15 seconds the page tells the main process which streams played on screen,
each with its share of the time, so the parts add up to the time spent watching. `watch.json` keeps
per stream the title, channel, sport and seconds by day; YouTube's developer policies allow keeping
API data for 30 days at most, so an entry goes 30 days after the stream was last watched. The totals by
sport are the app's own data and stay until the history is cleared. One setting turns the history
off, which also stops keeping added streams for the search's suggestions; clearing deletes both.

**Waiting screen.** From the empty grid, a full-window clock over the backdrop counts down to the
next reminders and coming streams and keeps the display on (`powerSaveBlocker`) while it shows. A
stream that has started can go on the grid from it. A reminder that went out used to be removed; it
now stays, marked, until an hour after the start, so the waiting screen can still offer the stream.
The main process tells the page whenever it changes the reminders, since the page's copy would
otherwise write the old list back.

**Sounds.** Short cues made from plain tones with the Web Audio API, one voice per kind of backdrop
(water, a click, a knock, a bell, a soft tone), so the app ships no sound files. They are off by
default and silent while the window is hidden or the app is muted.

**Subscriptions.** Google publishes no description of Takeout's `subscriptions.csv`. Public notes
describe three columns (channel ID, URL, title) after a header row whose words follow the account's
language, so the parser ignores the header and finds the cell that is a channel ID and the first
other cell that is not a link. The user picks which channels to follow, within the 50 the app watches.

## Consequences

- A popped-out stream and its delay start over in the new window; its watch time is not counted.
- The chat cannot be written in, and its language may differ from the app's.
- Lining up depends on rewinding; without it, a stream cannot be held back.
- The history counts what plays, not what is watched: a stream left playing counts.
- A change in Takeout's format could break the import; the unit tests describe what is expected.
