# ADR 0003: Languages, right-to-left layout and typography

- Status: accepted
- Date: 2026-10-30

## Context

The interface starts in English. A later phase adds Spanish, Simplified Chinese, Japanese, German,
French, Brazilian Portuguese, Arabic, Korean, Italian, Russian and Turkish. That means long strings
(German), Cyrillic, CJK scripts, Arabic written right to left, and plural rules from two forms
(English) to six (Arabic). Retrofitting any of this later is expensive, so the groundwork is in the
first version.

## Decision

**Messages.** i18next with react-i18next and i18next-icu: every message is ICU MessageFormat, so
plurals, numbers, percentages and dates follow each language's rules through `Intl`. English
(`src/renderer/i18n/locales/en.json`) is the source. ESLint's `i18next/no-literal-string` rule rejects
literal text in JSX, so no visible string can bypass the translation files. Unit tests parse every
message with `intl-messageformat`.

**Locale choice.** The first supported language in the system's preferred list, otherwise English.
A language setting comes with the translations.

**Pseudo-locales from day one.** `en-XA` accents every letter and makes each string about 40% longer;
`ar-XB` turns text right to left and switches the document to `dir="rtl"`. Both keep the ICU syntax
intact. Start the app with `--locale=en-XA` or `--locale=ar-XB`; the smoke tests check that the long
locale does not overflow and that the right-to-left one mirrors the layout.

**Right to left.** The document's `lang` and `dir` follow the locale. Styles use logical properties
only (`inline`/`block`, `inset-inline-start`); icons that point in a direction will be mirrored,
media controls will not. Text from YouTube (titles, channel names) will be shown with `dir="auto"`,
so a mixed title keeps its own direction.

**Typography.** System UI fonts, chosen per language through `:lang()`:

| Language                        | Windows                     | macOS                     | Fallback         |
| ------------------------------- | --------------------------- | ------------------------- | ---------------- |
| Latin, Greek, Cyrillic, Turkish | Segoe UI Variable, Segoe UI | system-ui (San Francisco) | Noto Sans        |
| Simplified Chinese              | Microsoft YaHei UI          | PingFang SC               | Noto Sans CJK SC |
| Japanese                        | Yu Gothic UI                | Hiragino Sans             | Noto Sans CJK JP |
| Korean                          | Malgun Gothic               | Apple SD Gothic Neo       | Noto Sans CJK KR |
| Arabic                          | Segoe UI                    | SF Arabic, Geeza Pro      | Noto Sans Arabic |

Bundled CJK fonts would add tens of megabytes; the system fonts are complete and native. The `lang`
attribute also makes Chinese and Japanese pick their own glyph forms for shared Han characters.
Korean uses `word-break: keep-all` so words are not broken mid-word. Sport themes (Phase 4) may add a
display face for headings, limited to Latin and Cyrillic, with the system font as the fallback.

**Translations.** Machine translations will be marked "needs review" in the translation files until a
native speaker checks them; CONTRIBUTING.md will describe how.

## Consequences

- Every new string goes into `en.json` first; the review of a pull request includes the text.
- Layouts are checked in `en-XA` and `ar-XB` as part of each phase.
- Dates and numbers are never formatted by hand.
