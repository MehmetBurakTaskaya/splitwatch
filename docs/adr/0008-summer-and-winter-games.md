# ADR 0008: Summer and Winter Games modes

- Status: accepted
- Date: 2026-10-31

## Context

Phase 6 asks for two event modes for the multi-sport Games: a suggestion and a countdown as an
edition comes near, an opening animation, the Summer Games under stadium light and the Winter Games
under the northern lights with adjustable snow, each sport's theme blended with the event, a daily
schedule in the user's time zone matched to upcoming YouTube streams with reminders, a followed
country, ready-made finals layouts, and a medal table only if a free source with a license that
allows it exists. Two constraints come first: no names, emblems, pictograms, torches or other marks
of the Games or of their organizers anywhere in the project, and no invented data.

Research on 2026-10-31:

- Dates: 14–30 July 2028 for Los Angeles (the organizers' schedule, v3.0 of March 2026, and many
  reports); 1–17 February 2030 for the French Alps; 31 October–13 November 2026 for the Youth Summer
  Games in Dakar (the IOC's announcement); 6–22 February 2026 for the last Winter Games.
- Schedules: the organizers publish them as PDFs and web pages without an open license. The Games'
  English Wikipedia articles carry a calendar table (sports and medal events per day) that follows
  them, under CC BY-SA 4.0. No source gives session times for 2028 in a reusable form, and none
  exists yet for 2030.
- Medal tables: the official results and the commercial feeds are not free to reuse. English
  Wikipedia's medal table pages ({{Medals table}}, CC BY-SA 4.0) are, and volunteers update them
  within minutes during the Games. The 2028 and 2030 pages do not exist yet; Dakar 2026 has none.

## Decision

**Events are data**, one JSON file per edition in `events/`, shipped and refreshed from GitHub once
a day like the presets, so a calendar or a medal table page arrives without a release.
`scripts/event-calendar.mjs` fills a calendar from the article's table and checks each row against
the row's own total; the 2026 Winter Games add up to the 116 events their article states, Dakar to 153. For Los Angeles the table adds up to 353 while the article states 351; the schedule is marked
"subject to change" by its organizers, so the app says that times can still change. Sources are
listed in each file by Wikipedia page ID, which keeps the Games' names out of the repository.

**The medal table** is read in the main process from English Wikipedia by page ID (at most every ten
minutes, in memory only), parsed from the template's per-team values and ranked by gold, silver and
bronze. The table names its source and license and links to the page. Teams are named through ISO
country codes (from Wikidata, CC0) and `Intl.DisplayNames`, so the names follow the interface
language. Without a page, the table says when it will appear.

**The schedule** shows each day's sports and medal events in the host's calendar, since that is
what the sources give. The user's time zone applies where times exist: the preset channels' upcoming
streams of the day, which can be added or set to "Remind me". Reminders are kept in the settings and
notify two minutes before the start while the app runs. "Watch the finals" opens the day's live
streams of sports with medal events (from the preset channels) in one grid. Broadcasters that stream
the Games on YouTube differ by country and are not presets; "Find live streams" searches YouTube for
a sport instead. Streams that name the followed country (in the interface language or English, or
by its team code) come first.

**The mode** is offered from 30 days before an edition opens until it closes, unless declined, and
can be tried for any edition at any time. It swaps the neutral theme for an event theme (Stadium or
Aurora) and draws a frame over a sport's own backdrop (floodlights and a warm evening light, or the
northern lights and snow), so a sport keeps its picture. The top bar gets a band of the event's
colors.

**The opening animation** plays once per edition. It covers the window, so the grid is hidden and its
players are paused while it plays (YouTube allows nothing in front of a player and no playback from
a player the user cannot see), and resumed after. A click or a key skips it; with reduced motion
only the name fades in.

## Consequences

- During the Games the app depends on Wikipedia for the medal table; a vandalized or late page shows
  as it is, with the source named.
- Calendars for future editions need a maintainer to run the script and check the result once the
  articles carry them.
- The schedule has no session times until a reusable source exists.
- "Watch the finals" finds only what the preset channels stream, which is little during the Games.
