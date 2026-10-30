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

A later version (see the [roadmap](docs/ROADMAP.md)) adds Spanish, Simplified Chinese, Japanese, German,
French, Brazilian Portuguese, Arabic, Korean, Italian, Russian and Turkish. The first translations are machine-made and
marked "needs review"; native speakers reviewing them is one of the most useful contributions. The
translation guide will be added here with them.

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

Sport themes arrive in a later version, also as data files; how to add one will be described here.

## Code of conduct

Be kind and assume good intent. Harassment or discrimination is not tolerated; the maintainer may
remove comments, code or contributors that break this.
