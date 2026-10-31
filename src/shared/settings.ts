import { isSupportedLocale } from './locales';
import { type LayoutId, MAX_STREAMS, MINI_MIN, isLayoutId, layoutFor, layoutById } from './layouts';
import { DEFAULT_EVENT_SETTINGS, type EventSettings, sanitizeEventSettings } from './events';
import { DEFAULT_NOTIFY, type NotifySettings, sanitizeNotify } from './notify';
import { type Reminder, sanitizeReminders } from './reminders';
import { type Theme, sanitizeCustomThemes } from './themes';
import { DEFAULT_LIMITS, type QuotaLimits, sanitizeLimits } from './quota';
import { SHORTCUT_ACTIONS, type ShortcutAction, isReservedKey } from './shortcuts';
import { isVideoId } from './youtube';

// Settings are a versioned JSON file in the app data folder. Anything unknown or invalid falls back
// to the default, so a damaged or older file never stops the app.

export interface Session {
  layout: LayoutId;
  streams: string[];
  selected: string | null;
  muted: boolean;
  masterVolume: number;
  volumes: Record<string, number>;
  // The sport of a stream, when it came with the stream or was picked by hand; "none" means no
  // sport. Streams without an entry get the sport the app finds for them.
  sports: Record<string, string>;
}

// A grid saved under a name, to open again later. Sound on or off and the main volume stay as
// they are when it opens.
export interface SavedLayout {
  id: string;
  name: string;
  layout: LayoutId;
  streams: string[];
  selected: string | null;
  volumes: Record<string, number>;
  sports: Record<string, string>;
}

export const MAX_SAVED_LAYOUTS = 20;
export const MAX_LAYOUT_NAME = 60;

export type ColorScheme = 'system' | 'light' | 'dark';

// Where the mini player was last, as content bounds in screen coordinates.
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Settings {
  version: 1;
  audioFocus: 'click' | 'hover';
  clipboardSuggestions: boolean;
  shortcuts: Partial<Record<ShortcutAction, string>>;
  // Sports whose presets feed "Live now"; empty means all.
  sports: string[];
  quotaLimits: QuotaLimits;
  // "auto" (follows the streams' sport) or a theme ID.
  theme: string;
  // "system" (the system's languages decide) or a supported locale (src/shared/locales.ts).
  language: string;
  // Themes the user made or imported.
  customThemes: Theme[];
  // Keep a watch history on this computer (see shared/watch.ts), and the added streams for the
  // search's suggestions.
  watchHistory: boolean;
  // Quiet sounds in the theme's style (src/renderer/theme/sounds.ts).
  sounds: boolean;
  colorScheme: ColorScheme;
  animate: boolean;
  performance: boolean;
  // Titles and thumbnails stay blurred until pointed at, and notifications leave titles out.
  spoilers: boolean;
  // The keyboard's media keys control the grid, also from the background.
  mediaKeys: boolean;
  layouts: SavedLayout[];
  miniBounds: Bounds | null;
  // Closing the window leaves the app in the tray (the menu bar on macOS).
  background: boolean;
  // When the system starts the app at sign-in, it stays in the tray (needs background).
  startHidden: boolean;
  notify: NotifySettings;
  event: EventSettings;
  reminders: Reminder[];
  session: Session;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  audioFocus: 'click',
  clipboardSuggestions: true,
  shortcuts: {},
  sports: [],
  quotaLimits: DEFAULT_LIMITS,
  theme: 'auto',
  language: 'system',
  customThemes: [],
  watchHistory: true,
  sounds: false,
  colorScheme: 'system',
  animate: true,
  performance: false,
  spoilers: false,
  mediaKeys: false,
  layouts: [],
  miniBounds: null,
  background: false,
  startHidden: false,
  notify: DEFAULT_NOTIFY,
  event: DEFAULT_EVENT_SETTINGS,
  reminders: [],
  session: { layout: '1', streams: [], selected: null, muted: false, masterVolume: 1, volumes: {}, sports: {} },
};

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const LAYOUT_ID = /^[a-z0-9]{8,32}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const volume = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

export function sanitizeSession(raw: unknown): Session {
  const d = DEFAULT_SETTINGS.session;
  if (!isRecord(raw)) return { ...d, volumes: {}, sports: {} };
  const streams = Array.isArray(raw.streams)
    ? [...new Set(raw.streams.filter((s): s is string => typeof s === 'string' && isVideoId(s)))].slice(0, MAX_STREAMS)
    : [];
  let layout = isLayoutId(raw.layout) ? raw.layout : layoutFor(streams.length);
  if (layoutById(layout).capacity < streams.length) layout = layoutFor(streams.length);
  const volumes: Record<string, number> = {};
  if (isRecord(raw.volumes)) {
    for (const id of streams) if (id in raw.volumes) volumes[id] = volume(raw.volumes[id], 1);
  }
  const sports: Record<string, string> = {};
  if (isRecord(raw.sports)) {
    for (const id of streams) {
      const sport = raw.sports[id];
      if (typeof sport === 'string' && SLUG.test(sport)) sports[id] = sport;
    }
  }
  const selected = typeof raw.selected === 'string' && streams.includes(raw.selected) ? raw.selected : null;
  return {
    layout,
    streams,
    selected,
    muted: raw.muted === true,
    masterVolume: volume(raw.masterVolume, d.masterVolume),
    volumes,
    sports,
  };
}

// Names are trimmed, single-line and at most MAX_LAYOUT_NAME characters; empty means invalid.
export function layoutName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = [...raw.replace(/[\s\p{Cc}]+/gu, ' ').trim()].slice(0, MAX_LAYOUT_NAME).join('').trim();
  return name || null;
}

export function sanitizeSavedLayouts(raw: unknown): SavedLayout[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedLayout[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || !LAYOUT_ID.test(item.id)) continue;
    const name = layoutName(item.name);
    if (!name || out.some((l) => l.id === item.id)) continue;
    const { layout, streams, selected, volumes, sports } = sanitizeSession(item);
    if (!streams.length) continue;
    out.push({ id: item.id, name, layout, streams, selected, volumes, sports });
    if (out.length === MAX_SAVED_LAYOUTS) break;
  }
  return out;
}

export function sanitizeBounds(raw: unknown): Bounds | null {
  if (!isRecord(raw)) return null;
  const { x, y, width, height } = raw;
  const int = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  if (!int(x, -100_000, 100_000) || !int(y, -100_000, 100_000)) return null;
  if (!int(width, MINI_MIN.width, 10_000) || !int(height, MINI_MIN.height, 10_000)) return null;
  return { x, y, width, height };
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isRecord(raw)) {
    return {
      ...d,
      shortcuts: {},
      sports: [],
      layouts: [],
      customThemes: [],
      notify: sanitizeNotify(null),
      event: sanitizeEventSettings(null),
      reminders: [],
      session: sanitizeSession(null),
    };
  }
  const scheme = raw.colorScheme;
  const shortcuts: Partial<Record<ShortcutAction, string>> = {};
  const used = new Set<string>();
  if (isRecord(raw.shortcuts)) {
    for (const action of SHORTCUT_ACTIONS) {
      const key = raw.shortcuts[action];
      if (typeof key === 'string' && key.length > 0 && key.length <= 40 && !isReservedKey(key) && !used.has(key)) {
        shortcuts[action] = key;
        used.add(key);
      }
    }
  }
  return {
    version: 1,
    audioFocus: raw.audioFocus === 'hover' ? 'hover' : 'click',
    clipboardSuggestions: raw.clipboardSuggestions !== false,
    shortcuts,
    sports: Array.isArray(raw.sports)
      ? [...new Set(raw.sports.filter((v): v is string => typeof v === 'string' && SLUG.test(v)))]
      : [],
    quotaLimits: sanitizeLimits(raw.quotaLimits),
    theme: typeof raw.theme === 'string' && (raw.theme === 'auto' || SLUG.test(raw.theme)) ? raw.theme : d.theme,
    language: isSupportedLocale(raw.language) ? raw.language : 'system',
    customThemes: sanitizeCustomThemes(raw.customThemes),
    watchHistory: raw.watchHistory !== false,
    sounds: raw.sounds === true,
    colorScheme: scheme === 'light' || scheme === 'dark' ? scheme : 'system',
    animate: raw.animate !== false,
    performance: raw.performance === true,
    spoilers: raw.spoilers === true,
    mediaKeys: raw.mediaKeys === true,
    layouts: sanitizeSavedLayouts(raw.layouts),
    miniBounds: sanitizeBounds(raw.miniBounds),
    background: raw.background === true,
    startHidden: raw.background === true && raw.startHidden === true,
    notify: sanitizeNotify(raw.notify),
    event: sanitizeEventSettings(raw.event),
    // 0.6 kept the reminders with the event settings.
    reminders: sanitizeReminders(raw.reminders ?? (isRecord(raw.event) ? raw.event.reminders : undefined)),
    session: sanitizeSession(raw.session),
  };
}
