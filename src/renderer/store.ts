import { create } from 'zustand';
import type { AppInfo, UpdateState } from '../shared/ipc';

interface AppState {
  info: AppInfo | null;
  update: UpdateState;
}

export const useAppStore = create<AppState>(() => ({ info: null, update: { status: 'idle' } }));

// Pulls the app info and the update state from the main process and follows later changes.
export function connectHost(): void {
  void window.splitwatch.getAppInfo().then((info) => useAppStore.setState({ info }));
  void window.splitwatch.getUpdateState().then((update) => useAppStore.setState({ update }));
  window.splitwatch.onUpdateState((update) => useAppStore.setState({ update }));
}
