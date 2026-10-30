import { useEffect } from 'react';
import { type ShortcutAction, actionFor, keyName, resolveShortcuts } from '../../shared/shortcuts';
import { seekBy, togglePlay } from '../player/players';
import { openDialog, useAppStore } from '../state/app';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';

export function setEnlarged(on: boolean): void {
  const { selected, setMaximized } = useSession.getState();
  setMaximized(on ? selected : null);
  window.splitwatch.setFullscreen(on && selected !== null);
}

// Mini mode needs a picked stream; it replaces the large view.
export function setMini(on: boolean): void {
  if (on) {
    if (!useSession.getState().selected) return;
    setEnlarged(false);
  }
  window.splitwatch.setMini(on);
}

function run(action: ShortcutAction): void {
  const s = useSession.getState();
  switch (action) {
    case 'toggleMute':
      return s.toggleMute();
    case 'enlarge':
      return setEnlarged(s.maximized === null);
    case 'playPause':
      return togglePlay(s.selected);
    case 'seekBack':
      return seekBy(s.selected, -10);
    case 'seekForward':
      return seekBy(s.selected, 10);
    case 'nextLayout':
      return s.cycleLayout();
    case 'moveEarlier':
      return s.selected ? s.move(s.selected, -1) : undefined;
    case 'moveLater':
      return s.selected ? s.move(s.selected, 1) : undefined;
    case 'miniPlayer':
      return setMini(!useAppStore.getState().mini);
    case 'help':
      return openDialog('shortcuts');
  }
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || useAppStore.getState().dialog) return;
      // Ctrl + K (Cmd + K on macOS) opens the search and Ctrl + S the saved layouts, even from a
      // text box.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.code === 'KeyK' || e.code === 'KeyS')) {
        e.preventDefault();
        return openDialog(e.code === 'KeyK' ? 'search' : 'layouts');
      }
      if (isTyping(e.target)) return;
      if (e.key === 'Escape') {
        if (useAppStore.getState().mini) setMini(false);
        else if (useSession.getState().maximized || useAppStore.getState().fullscreen) setEnlarged(false);
        return;
      }
      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        useSession.getState().selectIndex(Number(e.key) - 1);
        return e.preventDefault();
      }
      const name = keyName(e);
      const action = name ? actionFor(name, resolveShortcuts(usePrefs.getState().shortcuts)) : null;
      if (!action) return;
      e.preventDefault();
      run(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

// A click inside a YouTube player moves the focus into its iframe; the parent page only sees its
// window lose focus. Pick that stream, then take the focus back so the shortcuts keep working.
export function useIframeFocus(): void {
  useEffect(() => {
    const onBlur = () =>
      setTimeout(() => {
        const frame = document.activeElement;
        if (!(frame instanceof HTMLIFrameElement)) return;
        const tile = frame.closest<HTMLElement>('[data-stream]');
        const id = tile?.dataset.stream;
        if (!tile || !id) return;
        if (usePrefs.getState().audioFocus === 'click') useSession.getState().select(id, { unmute: true });
        tile.focus({ preventScroll: true });
      }, 0);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  // Leaving fullscreen from the system (macOS green button, a gesture) also leaves the large view,
  // and leaving the large view another way (adding a stream) also leaves fullscreen.
  useEffect(() => {
    const offApp = useAppStore.subscribe((s, prev) => {
      if (prev.fullscreen && !s.fullscreen) useSession.getState().setMaximized(null);
    });
    const offSession = useSession.subscribe((s, prev) => {
      if (prev.maximized && !s.maximized && useAppStore.getState().fullscreen) window.splitwatch.setFullscreen(false);
      // The mini player's stream was removed.
      if (!s.selected && useAppStore.getState().mini) setMini(false);
    });
    return () => {
      offApp();
      offSession();
    };
  }, []);
}
