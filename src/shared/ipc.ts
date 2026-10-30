// Channel names and payloads shared by the main process, the preload script and the renderer.
import type { Settings } from './settings';

export const IPC = {
  appInfo: 'app:info',
  rendererReady: 'app:renderer-ready',
  updateState: 'update:state',
  updateInstall: 'update:install',
  openReleasePage: 'update:open-release-page',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  videoInfo: 'video:info',
  clipboardVideo: 'clipboard:video',
  windowMinSize: 'window:min-size',
  windowFullscreen: 'window:fullscreen',
  fullscreenChanged: 'window:fullscreen-changed',
} as const;

export interface AppInfo {
  version: string;
  platform: string;
  systemLocale: string;
}

export interface VideoInfo {
  title: string;
  channel: string;
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
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): void;
  getVideoInfo(videoId: string): Promise<VideoInfo | null>;
  // The video ID of a YouTube link on the clipboard, or null. Reads only when called.
  readClipboardVideo(): Promise<string | null>;
  setMinContentSize(size: { width: number; height: number }): void;
  setFullscreen(on: boolean): void;
  onFullscreenChange(listener: (on: boolean) => void): () => void;
}
