// Channel names and payloads shared by the main process, the preload script and the renderer.

export const IPC = {
  appInfo: 'app:info',
  rendererReady: 'app:renderer-ready',
  updateState: 'update:state',
  updateInstall: 'update:install',
  openReleasePage: 'update:open-release-page',
} as const;

export interface AppInfo {
  version: string;
  platform: string;
  systemLocale: string;
}

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'none' }
  // canInstall is false on macOS, where the app offers the download instead of updating itself.
  | { status: 'available'; version: string; canInstall: boolean }
  | { status: 'downloading'; progress: number }
  | { status: 'ready'; version: string }
  | { status: 'error' };

export interface SplitwatchApi {
  getAppInfo(): Promise<AppInfo>;
  getUpdateState(): Promise<UpdateState>;
  onUpdateState(listener: (state: UpdateState) => void): () => void;
  installUpdate(): Promise<void>;
  openReleasePage(): Promise<void>;
  rendererReady(): void;
}
