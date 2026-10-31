# ADR 0011: Eleven more interface languages

- Status: accepted
- Date: 2026-10-31

## Context

ADR 0003 laid the groundwork in the first version: ICU messages, pseudo-locales, logical CSS, system
fonts per script and a direction per locale. Phase 8 adds the translations themselves (Spanish,
Simplified Chinese, Japanese, German, French, Brazilian Portuguese, Arabic, Korean, Italian, Russian
and Turkish), a way to pick the language, and the checks that keep twelve files in step.

## Decision

**Choosing the language.** Settings has a language list, at its top: "Same as the system" (the
default, with the language it gives in brackets) and each language by its own name. The main process
decides the page's language, in this order: `--locale` (for layout tests), the setting, the system's
list of preferred languages; English if none of them has a translation. A system language matches
by its exact tag or its language; Chinese in simplified script matches `zh-CN` and traditional
Chinese matches nothing, Portuguese of any region matches `pt-BR`.

**Passing it on.** The language goes into every window's address (`?locale=`), and a change goes to
every open window at once (`app:locale-changed`), which loads the translation and switches without a
reload, so streams keep playing. The tray menu and the notifications switch with it. The page
carries English and loads another language only when it is needed; the main process carries them all,
since it may need any of them before a window opens.

**Translations.** Each language was drafted in one pass from the English with a shared brief (terms,
tone, the ICU rules and the words that must not appear) and has not yet been checked by a native
speaker. `src/shared/locales.ts` lists the checked ones (English only for now), and Settings says so
under every other language, with an invitation to send corrections. This replaces the "needs review"
marks in the files that ADR 0003 planned: JSON has no comments, and a marker in each message would
reach the screen.

**Checks.** `scripts/check-locale.mjs <tag>` compares a translation with English: the same keys, every
message valid ICU in that language that formats with sample values, the same arguments, and none of
the protected words. The unit tests run the same checks for every language. The protected words
(`src/shared/protected-words.ts`) now include their forms in these languages and scripts, and the
scan over the tracked files uses them all. An end-to-end test opens the app in each language with the
longest top bar (the event chip, Play all) at four widths and checks that it stays on one line; the
other end-to-end tests set English, so a machine's own languages cannot change what they see.

**Details found on the way.** A link field forced left to right showed an Arabic hint in the wrong
order; such fields now follow the page's direction while empty. Theme names sort in the page's
language.

## Consequences

- Every new English message needs eleven translations in the same change; the checks fail without
  them. A contributor who cannot translate may leave the English text in a file, which the check
  accepts; it then shows in English.
- The translations may hold mistakes until native speakers review them.
- The main process bundle grows by the translations (about 300 KB).
