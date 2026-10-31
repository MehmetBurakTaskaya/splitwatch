import { usePrefs } from './prefs';
import { sessionSnapshot, useSession } from './session';

// Restores the settings and the last session, then saves the session whenever it changes. Of the
// restored streams only the selected one starts by itself; the others wait (see SessionState.waiting).
export async function loadState(): Promise<void> {
  const settings = await window.splitwatch.getSettings();
  const {
    audioFocus,
    clipboardSuggestions,
    shortcuts,
    sports,
    theme,
    colorScheme,
    animate,
    performance,
    spoilers,
    mediaKeys,
    layouts,
    background,
    startHidden,
    notify,
    event,
    reminders,
  } = settings;
  usePrefs.setState({
    audioFocus,
    clipboardSuggestions,
    shortcuts,
    sports,
    theme,
    colorScheme,
    animate,
    performance,
    spoilers,
    mediaKeys,
    layouts,
    background,
    startHidden,
    notify,
    event,
    reminders,
  });
  const { session } = settings;
  const starter = session.selected ?? session.streams[0] ?? null;
  useSession.setState({ ...session, waiting: session.streams.filter((id) => id !== starter) });

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
    timer = setTimeout(save, 300);
  });
  // The window can close within the 300 ms.
  window.addEventListener('pagehide', save);
}

function save(): void {
  window.splitwatch.saveSettings({ session: sessionSnapshot(useSession.getState()) });
}
