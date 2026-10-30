# ADR 0006: Theme engine, sport backgrounds and icons

- Status: accepted
- Date: 2026-10-30

## Context

Phase 4 asks for a theme per sport (twelve to start), original sport icons, smooth changes between
themes and a light footprint next to up to nine playing videos. Constraints:

- Nothing may cover a player (YouTube's Required Minimum Functionality), so a background can only
  show around the players: on the start screen, in empty places of the grid and in the 4 px gaps.
- No marks, logos, pictograms or photos of any sports body, league, team or broadcaster, and nothing
  that resembles the emblems of the multi-sport Games.
- Every theme must stay readable in light and dark, and themes should be addable by contributors.
- The interface runs in twelve languages later, including Chinese, Japanese, Korean and Arabic.

## Decision

**Themes are data.** One JSON file per theme in `themes/` (schema in `themes/schema.json`, checked by
`validateTheme`): nine interface colors and five background colors for each of light and dark, the
sports that show it, the background to draw and an optional heading font. The interface colors go
into the CSS custom properties that the stylesheets already use, so no component knows about themes.
The neutral theme is a file too, and a unit test keeps it equal to `tokens.css`, which paints the
window before the engine runs. Unit tests check every theme against WCAG 2.1 AA (text 4.5:1, accent
3:1) and check each theme's accent on every other theme's surfaces, because tiles show their own
sport's color whatever the window's theme is. `scripts/theme-palette.mjs` derives passing colors
from a hue.

**Backgrounds are drawn in code**, on a canvas behind the whole window, by one small module per kind
(lanes and ropes, a track bend, three bands, ridge lines, contour lines, an indoor court, a beach, a
basketball floor, waves, a rink, a slope with gates, a halfpipe). Code instead of image files keeps the
pictures original, sharp at any size, cheap to tint for light and dark, and small (no image assets).
Each background has a still part, drawn once per size and palette into an offscreen canvas, and an
optional moving part drawn on top; positions follow from the time alone, so there is no simulation
state.

**Motion only where it shows.** The painter animates at 30 frames a second on the start screen, at 15
when the grid has empty places, and not at all when players fill the grid (one still frame is drawn
then). It stops when the window is hidden, when the system asks for reduced motion, when the user
turns animation off, and in performance mode, which also drops textures and particles, draws at one
pixel per CSS pixel and turns transitions off. Theme changes cross-fade between two stacked canvases
(400 ms) and the interface colors fade with CSS transitions. Measured cost: README, "Themes".

**Which theme shows.** "Automatic" by default: when every stream with a known sport points to the
same theme, that theme; mixed sports keep the window neutral and give each tile its sport's accent
and icon; with no streams, the sports picked for Live now decide the same way. A stream's sport comes
from where it was added (Live now, a sport search), from its channel when that is a preset channel of
one sport (from the `videos.list` answer that the live badges already fetch, or from the free channel
feeds without a key), or from the user, who can set it on each tile. Settings can also fix one theme.

**Light and dark** follow the system, or a setting that sets Electron's `nativeTheme.themeSource`, so
the window frame and the page's `prefers-color-scheme` change together.

**Fonts.** Body text stays in the system font, which covers every planned language. Themes may set a
heading font: Oswald or Exo 2, bundled from Fontsource (SIL Open Font License 1.1; the license texts
ship in `licenses/`). Only the Latin, Latin Extended and Cyrillic subsets are bundled (about 200 KB);
other scripts fall back to the system font letter by letter. A font loads the first time a theme
uses it.

**Icons.** Seventeen line icons on the interface's 20 × 20 grid, one per preset sport, each showing
an object of the sport and never a person, so none resembles an event's pictograms.

## Consequences

- A new theme is a JSON file and a name in `en.json`; a new kind of background is one module.
- Community themes and a theme editor (phase 7) can load the same JSON format at run time, checked by
  the same validation and contrast rules.
- Sports without a theme (table tennis, badminton, wrestling, rowing, canoe) show their icon and keep
  the neutral colors until they get one.
- The tests catch missing names, missing icons and weak contrast, but not whether a picture is good:
  new backgrounds need screenshots in light and dark in their pull request.
