# ADR 0014: Ready lists, and suggestions that follow the sport theme

- Status: accepted
- Date: 2026-10-31

## Context

The owner asked on 2026-10-31 for grids that are ready to watch: pick a sport and up to nine of its
streams open side by side, without pasting links one by one; a mix of nine different sports; a
choice between live streams and videos. Changing such a grid (removing a stream, putting a link of
one's own in its place) must not change the list. And when a sport's theme is picked, the start
screen's suggestions should be that sport's.

## Decision

**Ready lists** come from the preset channels (the sports' official channels), the same sources as
Live now, so they hold no unofficial copies of anyone's broadcast.

- A list is made from the channels' feeds each time it is asked for and is never stored. Opening it
  fills the grid like a saved layout; the grid is then the user's, and the list stays as it was.
  Removing a stream leaves its place empty, where "Add a stream" takes a link of one's own.
- It fills a whole grid: 9 streams, else 6, 4, 3, 2 or 1. The rest of the candidates are spares: a
  stream of the list that cannot play in an embedded player (errors 100, 101 and 150) gives its place
  to the next spare, without a click.
- **Live and videos** puts live streams first, then the newest videos; **Live only** and **Videos
  only** narrow it. Upcoming streams are left out, since nothing plays yet. Telling live from videos
  needs a key (one videos.list call per 50 videos, 1 unit), which also drops videos that cannot be
  embedded; without one, the list holds the newest videos and says so, and Live only is not offered.
- **The mix** takes the best stream of each of nine sports, the sports in a random order each time
  (**Shuffle again**); a video two sports share counts once.
- YouTube Shorts are left out, here and in Live now's newest videos: the feed links them as
  `/shorts/<id>`, and a tall clip of seconds shows poorly in a grid of wide players.
- The lists open from a button on the start screen and from Saved layouts. They start every stream,
  since the click asks for them (ADR 0007), and only the picked stream is heard. When the grid already
  holds streams, the button says that the list takes their place.

**Suggestions follow the theme.** While a sport's theme is picked in Appearance (not Automatic, the
neutral theme or an own theme), Live now on the start screen, and the waiting screen, show that
sport instead of the sports picked in Settings. The ready list starts with that sport too.

**More channels per sport.** One channel per sport gave too few videos for a grid of nine, so the
presets get more official channels (federations, tours and leagues, events), each checked as
before. Live now still reads at most 30 channels, now taken in turns (every sport's first channel
before any second), so a cap leaves no sport out.

## Consequences

- Live streams are rare: at a given moment a sport's official channels show none to a few, so a grid
  of nine live streams of one sport seldom exists. Live and videos fills the rest with videos. A
  search across all of YouTube would find more, but also unofficial streams, at 100 units a search;
  it is not used.
- The mix reads every preset channel's feed (free) and, with a key, one videos.list call per 50
  videos.
- A ready list is a starting point; to keep a changed grid, save it as a layout.
