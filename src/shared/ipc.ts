// Channel names and payloads shared by the main process, the preload script and the renderer.
import type { Preset } from './presets';
import type { QuotaBucket, QuotaLimits } from './quota';
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
  shownChanged: 'window:shown-changed',
  windowMini: 'window:mini',
  miniChanged: 'window:mini-changed',
  youtubeStatus: 'youtube:status',
  youtubeStatusChanged: 'youtube:status-changed',
  youtubeSetKey: 'youtube:set-key',
  youtubeRemoveKey: 'youtube:remove-key',
  youtubeSearch: 'youtube:search',
  youtubeLiveNow: 'youtube:live-now',
  youtubeLiveStates: 'youtube:live-states',
  youtubeStreamSports: 'youtube:stream-sports',
  presetsList: 'presets:list',
  historyList: 'history:list',
  historyRemember: 'history:remember',
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

// none: no key; valid: the last call with it worked; invalid: YouTube refused it;
// unavailable: the system offers no secure storage, so no key can be kept.
export type KeyState = 'none' | 'valid' | 'invalid' | 'unavailable';

export interface YouTubeStatus {
  key: KeyState;
  used: { units: number; searches: number };
  limits: QuotaLimits;
  exhausted: QuotaBucket[];
  resetsAt: string; // ISO time of the next reset (midnight Pacific Time)
}

export type LiveState = 'live' | 'upcoming' | 'none' | 'unknown';

export interface StreamItem {
  videoId: string;
  title: string;
  channel: string;
  live: LiveState;
  scheduledStart?: string;
  sport?: string;
}

export type ApiFailure = 'no-key' | 'invalid-key' | 'quota' | 'api-disabled' | 'network' | 'error';

export type SearchResult = { ok: true; items: StreamItem[] } | { ok: false; reason: ApiFailure };

export type SetKeyResult = { ok: true } | { ok: false; reason: ApiFailure | 'unavailable' };

// "live": live and upcoming streams of the preset channels (needs a key); "latest": their newest
// videos from the channel feeds, without live status (no key, or no quota left).
export interface LiveNow {
  mode: 'live' | 'latest';
  items: StreamItem[];
}

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
  // false while the window is minimized or hidden.
  onShownChange(listener: (shown: boolean) => void): () => void;
  // Mini mode: a small window on top of the others that shows the picked stream.
  setMini(on: boolean): void;
  onMiniChange(listener: (on: boolean) => void): () => void;
  getYouTubeStatus(): Promise<YouTubeStatus>;
  onYouTubeStatus(listener: (status: YouTubeStatus) => void): () => void;
  setApiKey(key: string): Promise<SetKeyResult>;
  removeApiKey(): Promise<void>;
  search(query: string, sport: string | null): Promise<SearchResult>;
  getLiveNow(): Promise<LiveNow>;
  getLiveStates(videoIds: string[]): Promise<Record<string, LiveState>>;
  // The sport of each stream whose channel is a preset channel, or null.
  getStreamSports(videoIds: string[]): Promise<Record<string, string | null>>;
  getPresets(): Promise<Preset[]>;
  getHistory(): Promise<StreamItem[]>;
  rememberStream(videoId: string): void;
}
