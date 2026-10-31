// Channel names and payloads shared by the main process, the preload script and the renderer.
import type { GamesEvent } from './events';
import type { MedalRow } from './medals';
import type { FollowedChannel } from './notify';
import type { Preset } from './presets';
import type { Reminder } from './reminders';
import type { SharedLayout } from './share';
import type { QuotaBucket, QuotaLimits } from './quota';
import type { Settings } from './settings';
import type { Theme } from './themes';
import type { WatchHistory, WatchReport } from './watch';

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
  command: 'app:command',
  loginGet: 'login:get',
  loginSet: 'login:set',
  youtubeStatus: 'youtube:status',
  youtubeStatusChanged: 'youtube:status-changed',
  youtubeSetKey: 'youtube:set-key',
  youtubeRemoveKey: 'youtube:remove-key',
  youtubeSearch: 'youtube:search',
  youtubeLiveNow: 'youtube:live-now',
  youtubeLiveStates: 'youtube:live-states',
  youtubeStreamSports: 'youtube:stream-sports',
  youtubeStreamChannels: 'youtube:stream-channels',
  notifyTest: 'notify:test',
  eventsList: 'events:list',
  eventMedals: 'events:medals',
  copyText: 'clipboard:copy',
  themeImport: 'theme:import',
  themeExport: 'theme:export',
  watchReport: 'watch:report',
  watchGet: 'watch:get',
  watchClear: 'watch:clear',
  keepAwake: 'power:keep-awake',
  subscriptionsImport: 'follows:import',
  localeChanged: 'app:locale-changed',
  mediaKeysState: 'media-keys:state',
  popoutOpen: 'popout:open',
  popoutClose: 'popout:close',
  popoutClosed: 'popout:closed',
  audioOwner: 'audio:owner',
  audioOwnerChanged: 'audio:owner-changed',
  audioClaim: 'audio:claim',
  presetsList: 'presets:list',
  historyList: 'history:list',
  historyRemember: 'history:remember',
} as const;

export interface AppInfo {
  version: string;
  platform: string;
  systemLocale: string;
  // The interface language that the system's languages pick (Settings shows it for "system").
  systemLanguage: string;
  // The system's region (ISO 3166-1 alpha-2), or an empty string.
  country: string;
}

export interface MedalTable {
  rows: MedalRow[];
  // The Wikipedia page, for the attribution link.
  url: string;
  fetchedAt: string;
}

// Asks from the tray and the notifications, which the page carries out.
export type AppCommand =
  | { type: 'add'; videoId: string; sport?: string }
  | { type: 'toggleMute' }
  | { type: 'mini' }
  // The media keys.
  | { type: 'playPause' }
  | { type: 'selectNext' }
  | { type: 'selectPrevious' }
  // A splitwatch:// link, checked; the page asks before it opens it.
  | { type: 'sharedLayout'; layout: SharedLayout }
  // The main process changed the reminders: one went out (fired) or went stale.
  | { type: 'reminders'; reminders: Reminder[]; fired: string | null };

// on: the setting; held: Splitwatch has the keys (another app may hold them); needsAccessibility:
// macOS has not yet trusted Splitwatch as an accessibility client.
export interface MediaKeysState {
  on: boolean;
  held: boolean;
  needsAccessibility: boolean;
}

// Starting with the system works in the installed app on Windows and macOS. status is macOS's
// answer (enabled, requires-approval, not-registered, not-found).
// A theme file the user opened: the theme, or why it cannot be used.
export type ThemeImport = { theme: Theme } | { error: 'invalid' | 'contrast' };

// A subscriptions list from Google Takeout: its channels, or why it cannot be used.
export type SubscriptionsImport = { channels: FollowedChannel[] } | { error: 'invalid' };

export interface LoginState {
  supported: boolean;
  openAtLogin: boolean;
  status?: string;
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
  onCommand(listener: (command: AppCommand) => void): () => void;
  getLoginState(): Promise<LoginState>;
  setOpenAtLogin(on: boolean): Promise<LoginState>;
  getYouTubeStatus(): Promise<YouTubeStatus>;
  onYouTubeStatus(listener: (status: YouTubeStatus) => void): () => void;
  setApiKey(key: string): Promise<SetKeyResult>;
  removeApiKey(): Promise<void>;
  search(query: string, sport: string | null): Promise<SearchResult>;
  getLiveNow(): Promise<LiveNow>;
  getLiveStates(videoIds: string[]): Promise<Record<string, LiveState>>;
  // The sport of each stream whose channel is a preset channel, or null.
  getStreamSports(videoIds: string[]): Promise<Record<string, string | null>>;
  // The channel of each stream (needs a key), or null.
  getStreamChannels(videoIds: string[]): Promise<Record<string, FollowedChannel | null>>;
  // Shows a notification; false when the system did not show it.
  testNotification(): Promise<boolean>;
  getEvents(): Promise<GamesEvent[]>;
  // null when the event has no medal table page yet, or it could not be read.
  getMedalTable(eventId: string): Promise<MedalTable | null>;
  copyText(text: string): void;
  // Opens a theme file the user picks; null when the user cancels.
  importTheme(): Promise<ThemeImport | null>;
  // Saves a theme to a file the user picks; false when the user cancels.
  exportTheme(theme: Theme): Promise<boolean>;
  reportWatch(reports: WatchReport[]): void;
  getWatch(): Promise<WatchHistory>;
  // Clears the watch history and the streams kept for the search's suggestions.
  clearWatch(): Promise<void>;
  // Keeps the display from sleeping (the waiting screen).
  keepAwake(on: boolean): void;
  // Opens a subscriptions.csv the user picks; null when the user cancels.
  importSubscriptions(): Promise<SubscriptionsImport | null>;
  // The language setting changed: the page switches to this locale.
  onLocaleChange(listener: (locale: string) => void): () => void;
  getMediaKeysState(): Promise<MediaKeysState>;
  // A stream in a window of its own, and back.
  openPopout(videoId: string, live: boolean): void;
  closePopout(videoId: string): void;
  onPopoutClosed(listener: (videoId: string) => void): () => void;
  // Where the sound comes from: "grid" or the video ID of a popped-out stream.
  getAudioOwner(): Promise<string>;
  onAudioOwner(listener: (owner: string) => void): () => void;
  claimAudio(owner: string): void;
  getPresets(): Promise<Preset[]>;
  getHistory(): Promise<StreamItem[]>;
  rememberStream(videoId: string): void;
}
