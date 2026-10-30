import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings';

export type Prefs = Pick<Settings, 'audioFocus' | 'clipboardSuggestions' | 'shortcuts'>;

export const usePrefs = create<Prefs>(() => ({
  audioFocus: DEFAULT_SETTINGS.audioFocus,
  clipboardSuggestions: DEFAULT_SETTINGS.clipboardSuggestions,
  shortcuts: {},
}));

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
  window.splitwatch.saveSettings(patch);
}
