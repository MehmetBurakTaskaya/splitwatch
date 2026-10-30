import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings';

export type Prefs = Pick<
  Settings,
  | 'audioFocus'
  | 'clipboardSuggestions'
  | 'shortcuts'
  | 'sports'
  | 'theme'
  | 'colorScheme'
  | 'animate'
  | 'performance'
  | 'layouts'
  | 'background'
  | 'startHidden'
  | 'notify'
>;

export const usePrefs = create<Prefs>(() => ({
  audioFocus: DEFAULT_SETTINGS.audioFocus,
  clipboardSuggestions: DEFAULT_SETTINGS.clipboardSuggestions,
  shortcuts: {},
  sports: [],
  theme: DEFAULT_SETTINGS.theme,
  colorScheme: DEFAULT_SETTINGS.colorScheme,
  animate: DEFAULT_SETTINGS.animate,
  performance: DEFAULT_SETTINGS.performance,
  layouts: [],
  background: DEFAULT_SETTINGS.background,
  startHidden: DEFAULT_SETTINGS.startHidden,
  notify: DEFAULT_SETTINGS.notify,
}));

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
  window.splitwatch.saveSettings(patch);
}
