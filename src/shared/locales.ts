// The interface languages. English is the source; the others are translations, counted as checked
// once a native speaker has reviewed them (CONTRIBUTING.md).
export const SOURCE_LOCALE = 'en';

export const SUPPORTED_LOCALES = [
  'en',
  'es',
  'zh-CN',
  'ja',
  'de',
  'fr',
  'pt-BR',
  'ar',
  'ko',
  'it',
  'ru',
  'tr',
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Each language's name in itself, as the language list shows it.
export const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  'zh-CN': '简体中文',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
  'pt-BR': 'Português (Brasil)',
  ar: 'العربية',
  ko: '한국어',
  it: 'Italiano',
  ru: 'Русский',
  tr: 'Türkçe',
};

// Translations a native speaker has checked; the others say so in Settings.
export const REVIEWED_LOCALES: ReadonlySet<string> = new Set([SOURCE_LOCALE]);

export const isSupportedLocale = (value: unknown): value is SupportedLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

// The supported locale for a language tag of the system, or null. Chinese in simplified script and
// Portuguese of any region get the translations there are; traditional Chinese gets none.
export function matchLocale(tag: string): SupportedLocale | null {
  if (isSupportedLocale(tag)) return tag;
  const [first = '', ...rest] = tag.split(/[-_]/);
  const language = first.toLowerCase();
  if (language === 'zh') return rest.some((part) => /^(hant|tw|hk|mo)$/i.test(part)) ? null : 'zh-CN';
  if (language === 'pt') return 'pt-BR';
  return isSupportedLocale(language) ? language : null;
}
