# Contributing

Thanks for helping. Issues, ideas and pull requests are welcome.

## Set up

You need Node.js 24 and npm.

```sh
npm ci
npm start              # build and run the app
npm run check          # type check, lint, format check, unit tests
npm run build && npm run test:e2e   # Electron smoke tests
```

The smoke tests keep their settings folders in `test-data/`, which each run empties first.

The code layout and the reasons behind it are in [docs/adr](docs/adr). `src/main` is the Electron main
process, `src/preload` the bridge, `src/renderer` the React interface and `src/shared` what they share.

## Pull requests

- One topic per pull request, with tests for new logic.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat: …`, `fix: …`, `docs: …`, `test: …`, `chore: …`.
- `npm run check` and the smoke tests pass.
- User-facing changes get a line in [CHANGELOG.md](CHANGELOG.md) under "Unreleased".

## Text and translations

Every word in the interface comes from a translation file; ESLint rejects literal text in JSX.

- English is the source: `src/renderer/i18n/locales/en.json`. Messages use
  [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/), so plurals,
  numbers and dates follow each language's rules: `{count, plural, one {# stream} other {# streams}}`.
- Write the layout with logical CSS properties (`margin-inline-start`, `padding-block`, `inset-inline-end`),
  never left and right, so right-to-left languages mirror it.
- Try your change in the two pseudo-locales: `npx electron . --locale=en-XA` makes every string about
  40% longer, `--locale=ar-XB` switches to right to left.

Splitwatch also speaks Spanish (`es`), Simplified Chinese (`zh-CN`), Japanese (`ja`), German (`de`),
French (`fr`), Brazilian Portuguese (`pt-BR`), Arabic (`ar`), Korean (`ko`), Italian (`it`), Russian
(`ru`) and Turkish (`tr`), each a file next to `en.json`. No native speaker has checked them yet, and
reviewing one is among the most useful contributions:

- Use the app in your language (**Settings → Language**) and fix what reads wrong, in that file.
  Keep every `{argument}` as it is, use your language's plural categories (`one`, `few`, `many`,
  `other`…; `other` is required), and never put a grammatical suffix on an argument.
- Run `node scripts/check-locale.mjs <tag>`: it checks the keys, the ICU syntax, the arguments and
  the protected words (see Themes below), as the tests do.
- Once a native speaker has read the whole file, add its tag to `REVIEWED_LOCALES` in
  `src/shared/locales.ts`; Settings then stops calling it unchecked.
- A new English message goes into every file in the same change. If you cannot translate it, copy the
  English text; it shows in English until someone translates it.

## Releases and download numbers

A tag such as `v1.2.3` builds a draft release (`.github/workflows/release.yml`); publishing it turns
the older releases into drafts (`hide-old-releases.yml`). File names carry no version. To see how
often Splitwatch is downloaded and about how many copies are in use, run `npm run stats` (with the
GitHub CLI signed in) or start **Actions → Download numbers** (ADR 0013).

## Icons

The app icon is `build/icon.svg` and the tray marks are `build/tray.svg` and `build/tray-template.svg`
(macOS colors the template itself). After changing one, run `node scripts/build-icons.mjs`: it draws
every size from the SVG with Electron and writes `build/icon.png`, `build/icon.ico`, `build/icon.icns`
and the tray PNGs in `src/main/assets/`. Like the themes, the icon is drawn here and is no one's mark.

## Demo GIF

`docs/assets/demo.gif`, at the top of the README, is recorded from the built app with
`node scripts/record-demo.mjs` (it needs the internet and ffmpeg). The windows open off the screen
with their sound muted. The streams are FISU's highlights, published under CC BY 3.0 and credited in
the README; a new recording uses only videos whose owner publishes them under a license that allows
this.

## Sport presets

A preset lists the official YouTube channels of one sport; "Live now" checks them for live and upcoming
streams. Presets are JSON files in [`presets/`](presets), described by
[`presets/schema.json`](presets/schema.json). The app downloads them from this repository once a day,
so a merged change reaches everyone without a new release.

Rules:

- Only channels that belong to a sport's organizer, league or federation and that stream on YouTube.
  No re-upload or fan channels, and no keyword-only presets (they surface unofficial streams).
- Use the channel ID (`UC` followed by 22 characters), not the @handle. To find it, open the channel,
  then **More about this channel → Share channel → Copy channel ID**.
- Check that the ID is right and the channel is active, and put that day in `checked`.
- If something is not certain (for example, who runs the channel), say so in `review`.
- Add the file name to `presets/index.json`, and the sport's name to
  `src/renderer/i18n/locales/en.json` under `sports`.

`npm test` checks every preset against the rules. Wanted: verified official channels for climbing,
archery, figure skating and more.

## Themes

A theme is a JSON file in [`themes/`](themes), described by [`themes/schema.json`](themes/schema.json):
interface colors and background colors for light and dark, the sports that show it, one of the
backgrounds the app can draw (`src/renderer/theme/backdrops/`) and an optional heading font.

- `node scripts/theme-palette.mjs <hue> <saturation>` suggests interface colors that pass the
  contrast checks; adjust them by eye. `npm test` checks every theme against WCAG 2.1 AA (4.5:1 for
  text, 3:1 for the accent) and checks that each theme's accent stays visible on every other theme.
- The theme's name goes in `src/renderer/i18n/locales/en.json` under `themes`.
- A theme made in **Settings → Appearance → New theme** and exported has the same shape, with a
  `name`. To propose it for the app, give it an `id`, its sports and a name in `en.json`, and leave
  `name` out.
- A new background is a TypeScript module next to the others: a `still` part drawn once and cached,
  and an optional `moving` part drawn on each frame. Keep the moving part light (the measurements in
  the README come from `node scripts/measure-cpu.mjs`), skip textures and particles when `low` is set,
  and draw it so that the time alone decides the picture.
- Every picture is drawn in code and is your own. No logos, marks, pictograms, mascots, torches or
  photos of any sports body, league, team or broadcaster, and no rings or other emblems of the
  multi-sport Games; their names stay out of themes too. Sport icons show objects (a ball, goggles,
  a paddle), never people.

## Summer and Winter Games

Each edition is a JSON file in [`events/`](events), described by [`events/schema.json`](events/schema.json)
and listed in `events/index.json`. Like the presets, the app refreshes these files from GitHub once a
day, so a schedule or a medal table page arrives without a new release.

- Dates are the host's calendar days (opening and closing ceremonies), with the host's time zone.
  Every file lists its sources and the day they were checked.
- `node scripts/event-calendar.mjs <id>` fills the day-by-day calendar from the calendar table of
  the Games' English Wikipedia article (add the article's page ID and the table's first day to the
  script first). It warns when a row's days do not add up to the row's total; compare the result
  with the organizers' schedule before you open a pull request. New sports need an English name in
  `en.json` under `sports`.
- `medalsPage` is the page ID of the English Wikipedia medal table, once that page exists. Page IDs
  keep the Games' names out of the repository.
- `node scripts/ioc-codes.mjs` refreshes `src/shared/ioc-codes.json` (team codes to country codes)
  from Wikidata.
- The names, marks and emblems of the Games and of their organizers stay out, as in the themes.

## Code of conduct

Be kind and assume good intent. Harassment or discrimination is not tolerated; the maintainer may
remove comments, code or contributors that break this.
