# ADR 0012: Polish for 1.0

- Status: accepted
- Date: 2026-10-31

## Context

Phase 9 prepares version 1.0: accessibility, performance, a first-run guide, the final icon, a way to
turn off the update check (which SignPath asks of the projects it signs for free), and the open
questions the translators of Phase 8 left.

## Decision

**Translation questions, by a panel.** The translators flagged 37 open points: a variety of Spanish,
terms, sport and theme names, key names, and the macOS and Google Cloud Console labels written from
memory. A panel of five reviewers, each with one lens (natural usage, the platforms' own labels
checked against Apple's and Google's documentation in each language, sports terminology from
federations and the language Wikipedias, UI writing, and a skeptic who defends the current text),
answered every question with reasons and sources, then read one another's answers and voted. A text
changed only with three votes of five for the same change. Sixteen points changed (74 messages):
Spanish now uses Agregar like the rest of its Latin American forms; German says "Streams
synchronisieren" and Sek., Min., Std.; French names the key Échap and the history "Votre historique";
Chinese writes 维基百科; a few sport names changed; the current macOS label "Login Items &
Extensions" and the Console's "APIs & Services" are used in every language, English included. The
same review found that "at {time}" needs an article that changes at 1 o'clock in Spanish,
Portuguese and Italian; those messages now put the time after a colon. The panel is no native
speaker, so no language counts as checked yet.

**Accessibility.** An end-to-end test runs axe-core against WCAG 2.1 A and AA in every view (the
first-run guide, the start screen, the waiting screen, Your watching, the grid, the line-up panel,
Settings, the theme editor and the other dialogs), in light and in dark. axe runs inside the page,
because its Playwright helper opens a page of its own, which Electron does not allow. YouTube's
players and chat are left out. Two problems came up and are fixed: the line-up buttons had names
that did not contain their visible text (WCAG 2.5.3), and the selected day of an event schedule
showed its number too faintly.

**Performance.** `scripts/measure-startup.mjs` measures the time to the top bar next to an empty
Electron window, and the memory with 0, 4 and 9 streams. Splitwatch adds about 0.3 seconds to what
Electron itself needs; memory is 0.5 GB on the start screen and 2 GB with nine streams, mostly
YouTube's players. Nothing needed changing; the numbers are in the README.

**First-run guide.** On the first start, the start screen's card explains, in three points, how to
add streams, which stream is heard and what Play all does, and that an API key is optional. It shows
only on the start screen, never over a player, and once (`welcomeSeen`); until the settings arrive,
the page assumes it was seen, so it does not flash for everyone else.

**Updates setting.** Settings can turn off the check for a new version at start; the app then
asks GitHub nothing about versions. Turning it back on checks at once.

**Icon.** The icon shows a grid of four streams, the heard one in the accent color with a play mark:
the app's idea, drawn here, like no sports body's mark. `scripts/build-icons.mjs` draws every size
from the SVG in Electron's Chromium and packs the Windows .ico and the macOS .icns itself, so no
image tool is needed. The tray marks and the mark in the top bar follow the same grid.

## Consequences

- Every new view should join the accessibility test.
- The translations still wait for native speakers; Settings keeps saying so.
- The panel's verified macOS labels follow macOS 15 and later; older versions say "Login Items".
