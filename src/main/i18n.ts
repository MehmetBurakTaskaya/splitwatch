import { app } from 'electron';
import i18next from 'i18next';
import ICU from 'i18next-icu';
import { SOURCE_LOCALE, pickLocale } from '../renderer/i18n/locale';
import en from '../renderer/i18n/locales/en.json';
import { isPseudoLocale, pseudoLocalize } from '../renderer/i18n/pseudo';

// The tray menu and the notifications speak the page's language: the same messages, picked the
// same way (src/renderer/i18n), because they show while no window is open.
const i18n = i18next.createInstance();

export async function initI18n(requested: string | undefined): Promise<void> {
  const lng = pickLocale(requested ?? null, app.getPreferredSystemLanguages());
  const resources: Record<string, { translation: typeof en }> = { en: { translation: en } };
  if (isPseudoLocale(lng)) resources[lng] = { translation: pseudoLocalize(en, lng) };
  await i18n.use(ICU).init({ resources, lng, fallbackLng: SOURCE_LOCALE, interpolation: { escapeValue: false } });
}

export const t = (key: string, values: Record<string, unknown> = {}): string => i18n.t(key, values);
