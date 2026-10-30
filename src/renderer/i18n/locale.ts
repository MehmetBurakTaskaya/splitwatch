import { isPseudoLocale } from './pseudo';

export const SOURCE_LOCALE = 'en';
// Languages with finished translations. More arrive in later versions (see docs/ROADMAP.md).
export const SUPPORTED_LOCALES: readonly string[] = ['en'];

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

export function directionOf(locale: string): 'ltr' | 'rtl' {
  if (locale === 'ar-XB') return 'rtl';
  return RTL_LANGUAGES.has(locale.split('-')[0]!.toLowerCase()) ? 'rtl' : 'ltr';
}

// An explicitly requested locale (a supported one or a pseudo-locale) wins; otherwise the first
// system language that is supported, by exact tag or by language; otherwise English.
export function pickLocale(requested: string | null, preferred: readonly string[]): string {
  if (requested && (isPseudoLocale(requested) || SUPPORTED_LOCALES.includes(requested))) return requested;
  for (const tag of preferred) {
    if (SUPPORTED_LOCALES.includes(tag)) return tag;
    const language = tag.split('-')[0];
    if (language && SUPPORTED_LOCALES.includes(language)) return language;
  }
  return SOURCE_LOCALE;
}
