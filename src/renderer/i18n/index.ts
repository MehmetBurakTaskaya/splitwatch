import i18next from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import { SOURCE_LOCALE, directionOf, pickLocale } from './locale';
import en from './locales/en.json';
import { isPseudoLocale, pseudoLocalize } from './pseudo';

// Messages use ICU MessageFormat: plurals, numbers and dates follow the user's locale through Intl.
export async function initI18n(requested: string | null): Promise<string> {
  const lng = pickLocale(requested, navigator.languages);
  const resources: Record<string, { translation: typeof en }> = { en: { translation: en } };
  if (isPseudoLocale(lng)) resources[lng] = { translation: pseudoLocalize(en, lng) };

  await i18next
    .use(ICU)
    .use(initReactI18next)
    .init({ resources, lng, fallbackLng: SOURCE_LOCALE, interpolation: { escapeValue: false } });

  document.documentElement.lang = lng;
  document.documentElement.dir = directionOf(lng);
  return lng;
}
