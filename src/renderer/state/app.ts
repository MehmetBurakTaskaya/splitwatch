import type { Theme } from '../../shared/themes';
import { create } from 'zustand';
import type { AppInfo, UpdateState } from '../../shared/ipc';
import type { SharedLayout } from '../../shared/share';

export type DialogName =
  'search' | 'shortcuts' | 'settings' | 'sport' | 'layouts' | 'event' | 'upcoming' | 'shared' | 'themeEditor' | null;

interface AppState {
  info: AppInfo | null;
  update: UpdateState;
  fullscreen: boolean;
  // false while the window is minimized or hidden.
  shown: boolean;
  // Mini mode: the window shows the picked stream only, on top of other windows.
  mini: boolean;
  dialog: DialogName;
  // The stream the sport dialog is about.
  dialogStream: string | null;
  // What the search opens with, when another view opens it.
  searchSeed: { query: string; sport: string | null } | null;
  // A layout from a splitwatch:// link, waiting for the user's answer.
  shared: SharedLayout | null;
  // Where the sound comes from: "grid" or a popped-out stream's window.
  audioOwner: string;
  // The stream whose live chat shows beside the grid.
  chat: string | null;
  // The panel that lines up the streams, beside the grid (instead of a chat).
  sync: boolean;
  // The theme the theme editor starts from, and whether saving makes a new theme.
  themeDraft: { theme: Theme; isNew: boolean } | null;
}

export const useAppStore = create<AppState>(() => ({
  info: null,
  update: { status: 'idle' },
  fullscreen: false,
  shown: true,
  mini: false,
  dialog: null,
  dialogStream: null,
  searchSeed: null,
  shared: null,
  audioOwner: 'grid',
  chat: null,
  sync: false,
  themeDraft: null,
}));

export const openDialog = (dialog: DialogName, stream: string | null = null) =>
  useAppStore.setState({ dialog, dialogStream: stream });

export const openSearch = (query: string, sport: string | null) =>
  useAppStore.setState({ dialog: 'search', dialogStream: null, searchSeed: { query, sport } });

// Pulls the app info and the update state from the main process and follows later changes.
export function connectHost(): void {
  void window.splitwatch.getAppInfo().then((info) => useAppStore.setState({ info }));
  void window.splitwatch.getUpdateState().then((update) => useAppStore.setState({ update }));
  window.splitwatch.onUpdateState((update) => useAppStore.setState({ update }));
  window.splitwatch.onFullscreenChange((fullscreen) => useAppStore.setState({ fullscreen }));
  window.splitwatch.onShownChange((shown) => useAppStore.setState({ shown }));
  void window.splitwatch.getAudioOwner().then((audioOwner) => useAppStore.setState({ audioOwner }));
  window.splitwatch.onAudioOwner((audioOwner) => useAppStore.setState({ audioOwner }));
  window.splitwatch.onMiniChange((mini) => useAppStore.setState({ mini, ...(mini ? { dialog: null } : {}) }));
}
