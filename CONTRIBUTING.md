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

## Sport presets and themes

Presets (curated channels per sport) and themes arrive in later versions, as data files that can be
changed without a new release. How to add one will be described here.

## Code of conduct

Be kind and assume good intent. Harassment or discrimination is not tolerated; the maintainer may
remove comments, code or contributors that break this.
