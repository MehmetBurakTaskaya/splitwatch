import { SOURCE_LOCALE, isSupportedLocale, matchLocale } from '../../shared/locales';
import { isPseudoLocale } from './pseudo';

export { SOURCE_LOCALE };

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

export function directionOf(locale: string): 'ltr' | 'rtl' {
  if (locale === 'ar-XB') return 'rtl';
  return RTL_LANGUAGES.has(locale.split('-')[0]!.toLowerCase()) ? 'rtl' : 'ltr';
}

// An explicitly requested locale (a supported one or a pseudo-locale) wins; otherwise the first
// system language that has a translation; otherwise English.
export function pickLocale(requested: string | null, preferred: readonly string[]): string {
  if (requested && (isPseudoLocale(requested) || isSupportedLocale(requested))) return requested;
  for (const tag of preferred) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return SOURCE_LOCALE;
}
