import { app } from 'electron';
import i18next from 'i18next';
import ICU from 'i18next-icu';
import { SOURCE_LOCALE, pickLocale } from '../renderer/i18n/locale';
import en from '../renderer/i18n/locales/en.json';
import { isPseudoLocale, pseudoLocalize } from '../renderer/i18n/pseudo';
import { getSettings, onSettingsChange } from './settings-store';

// The tray menu and the notifications speak the page's language: the same messages, picked the
// same way (src/renderer/i18n), because they show while no window is open. Every translation is in
// the bundle.
type Messages = typeof en;
const files = import.meta.glob<Messages>('../renderer/i18n/locales/*.json', { eager: true, import: 'default' });

const i18n = i18next.createInstance();
let requested: string | undefined;
let current = SOURCE_LOCALE;
const listeners = new Set<(lng: string) => void>();

function messagesFor(lng: string): Messages {
  if (isPseudoLocale(lng)) return pseudoLocalize(en, lng);
  return files[`../renderer/i18n/locales/${lng}.json`] ?? en;
}

// --locale (for layout tests) wins over the language setting, which wins over the system's languages.
function effectiveLocale(): string {
  const setting = getSettings().language;
  return pickLocale(requested ?? (setting === 'system' ? null : setting), app.getPreferredSystemLanguages());
}

// The language that the system's own list picks.
export const systemLocale = (): string => pickLocale(null, app.getPreferredSystemLanguages());

export async function initI18n(arg: string | undefined): Promise<string> {
  requested = arg;
  current = effectiveLocale();
  const resources: Record<string, { translation: Messages }> = { en: { translation: en } };
  resources[current] = { translation: messagesFor(current) };
  await i18n
    .use(ICU)
    .init({ resources, lng: current, fallbackLng: SOURCE_LOCALE, interpolation: { escapeValue: false } });
  onSettingsChange((s, before) => {
    if (s.language !== before.language) void switchTo(effectiveLocale());
  });
  return current;
}

async function switchTo(lng: string): Promise<void> {
  if (lng === current) return;
  current = lng;
  if (!i18n.hasResourceBundle(lng, 'translation')) i18n.addResourceBundle(lng, 'translation', messagesFor(lng));
  await i18n.changeLanguage(lng);
  for (const listener of listeners) listener(lng);
}

export function onLanguageChange(listener: (lng: string) => void): void {
  listeners.add(listener);
}

export const t = (key: string, values: Record<string, unknown> = {}): string => i18n.t(key, values);
