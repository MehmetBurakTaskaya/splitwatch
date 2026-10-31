import i18next from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import { SOURCE_LOCALE, directionOf, pickLocale } from './locale';
import en from './locales/en.json';
import { isPseudoLocale, pseudoLocalize } from './pseudo';

type Messages = typeof en;

// English is in the bundle; another language is loaded when it is needed.
const loaders = import.meta.glob<Messages>(['./locales/*.json', '!./locales/en.json'], { import: 'default' });

async function messagesFor(lng: string): Promise<Messages> {
  if (isPseudoLocale(lng)) return pseudoLocalize(en, lng);
  const load = loaders[`./locales/${lng}.json`];
  return load ? await load() : en;
}

function applyToDocument(lng: string): void {
  document.documentElement.lang = lng;
  document.documentElement.dir = directionOf(lng);
}

// Messages use ICU MessageFormat: plurals, numbers and dates follow the user's locale through Intl.
// The main process passes the language in the page's address (the setting, else the system's).
export async function initI18n(requested: string | null): Promise<string> {
  const lng = pickLocale(requested, navigator.languages);
  const resources: Record<string, { translation: Messages }> = { en: { translation: en } };
  if (lng !== SOURCE_LOCALE) resources[lng] = { translation: await messagesFor(lng) };

  await i18next
    .use(ICU)
    .use(initReactI18next)
    .init({ resources, lng, fallbackLng: SOURCE_LOCALE, interpolation: { escapeValue: false } });

  applyToDocument(lng);
  return lng;
}

// Switches the open page to another language (the language setting changed).
export async function changeLocale(lng: string): Promise<void> {
  if (!i18next.hasResourceBundle(lng, 'translation')) {
    i18next.addResourceBundle(lng, 'translation', await messagesFor(lng));
  }
  await i18next.changeLanguage(lng);
  applyToDocument(lng);
}
