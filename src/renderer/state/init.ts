import { usePrefs } from './prefs';
import { sessionSnapshot, useSession } from './session';

// Restores the settings and the last session, then saves the session whenever it changes.
export async function loadState(): Promise<void> {
  const settings = await window.splitwatch.getSettings();
  usePrefs.setState({
    audioFocus: settings.audioFocus,
    clipboardSuggestions: settings.clipboardSuggestions,
    shortcuts: settings.shortcuts,
  });
  useSession.setState(settings.session);

  let timer: ReturnType<typeof setTimeout> | undefined;
  useSession.subscribe((s, prev) => {
    const changed =
      s.layout !== prev.layout ||
      s.streams !== prev.streams ||
      s.selected !== prev.selected ||
      s.muted !== prev.muted ||
      s.masterVolume !== prev.masterVolume ||
      s.volumes !== prev.volumes ||
      s.sports !== prev.sports;
    if (!changed) return;
    clearTimeout(timer);
    timer = setTimeout(() => window.splitwatch.saveSettings({ session: sessionSnapshot(useSession.getState()) }), 300);
  });
}
