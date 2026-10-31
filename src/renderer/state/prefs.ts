import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings';

export type Prefs = Pick<
  Settings,
  | 'audioFocus'
  | 'clipboardSuggestions'
  | 'shortcuts'
  | 'sports'
  | 'theme'
  | 'language'
  | 'customThemes'
  | 'watchHistory'
  | 'sounds'
  | 'checkUpdates'
  | 'welcomeSeen'
  | 'colorScheme'
  | 'animate'
  | 'performance'
  | 'spoilers'
  | 'mediaKeys'
  | 'layouts'
  | 'background'
  | 'startHidden'
  | 'notify'
  | 'event'
  | 'reminders'
>;

export const usePrefs = create<Prefs>(() => ({
  audioFocus: DEFAULT_SETTINGS.audioFocus,
  clipboardSuggestions: DEFAULT_SETTINGS.clipboardSuggestions,
  shortcuts: {},
  sports: [],
  theme: DEFAULT_SETTINGS.theme,
  language: DEFAULT_SETTINGS.language,
  customThemes: [],
  watchHistory: DEFAULT_SETTINGS.watchHistory,
  sounds: DEFAULT_SETTINGS.sounds,
  checkUpdates: DEFAULT_SETTINGS.checkUpdates,
  welcomeSeen: true,
  colorScheme: DEFAULT_SETTINGS.colorScheme,
  animate: DEFAULT_SETTINGS.animate,
  performance: DEFAULT_SETTINGS.performance,
  spoilers: DEFAULT_SETTINGS.spoilers,
  mediaKeys: DEFAULT_SETTINGS.mediaKeys,
  layouts: [],
  background: DEFAULT_SETTINGS.background,
  startHidden: DEFAULT_SETTINGS.startHidden,
  notify: DEFAULT_SETTINGS.notify,
  event: DEFAULT_SETTINGS.event,
  reminders: [],
}));

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
  window.splitwatch.saveSettings(patch);
}
