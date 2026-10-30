import { create } from 'zustand';
import type { AppInfo, UpdateState } from '../../shared/ipc';

export type DialogName = 'search' | 'shortcuts' | 'settings' | 'sport' | null;

interface AppState {
  info: AppInfo | null;
  update: UpdateState;
  fullscreen: boolean;
  // false while the window is minimized or hidden.
  shown: boolean;
  dialog: DialogName;
  // The stream the sport dialog is about.
  dialogStream: string | null;
}

export const useAppStore = create<AppState>(() => ({
  info: null,
  update: { status: 'idle' },
  fullscreen: false,
  shown: true,
  dialog: null,
  dialogStream: null,
}));

export const openDialog = (dialog: DialogName, stream: string | null = null) =>
  useAppStore.setState({ dialog, dialogStream: stream });

// Pulls the app info and the update state from the main process and follows later changes.
export function connectHost(): void {
  void window.splitwatch.getAppInfo().then((info) => useAppStore.setState({ info }));
  void window.splitwatch.getUpdateState().then((update) => useAppStore.setState({ update }));
  window.splitwatch.onUpdateState((update) => useAppStore.setState({ update }));
  window.splitwatch.onFullscreenChange((fullscreen) => useAppStore.setState({ fullscreen }));
  window.splitwatch.onShownChange((shown) => useAppStore.setState({ shown }));
}
