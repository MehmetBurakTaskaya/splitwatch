import { create } from 'zustand';
import type { AppInfo, UpdateState } from '../../shared/ipc';

export type DialogName = 'shortcuts' | 'settings' | null;

interface AppState {
  info: AppInfo | null;
  update: UpdateState;
  fullscreen: boolean;
  dialog: DialogName;
}

export const useAppStore = create<AppState>(() => ({
  info: null,
  update: { status: 'idle' },
  fullscreen: false,
  dialog: null,
}));

export const openDialog = (dialog: DialogName) => useAppStore.setState({ dialog });

// Pulls the app info and the update state from the main process and follows later changes.
export function connectHost(): void {
  void window.splitwatch.getAppInfo().then((info) => useAppStore.setState({ info }));
  void window.splitwatch.getUpdateState().then((update) => useAppStore.setState({ update }));
  window.splitwatch.onUpdateState((update) => useAppStore.setState({ update }));
  window.splitwatch.onFullscreenChange((fullscreen) => useAppStore.setState({ fullscreen }));
}
