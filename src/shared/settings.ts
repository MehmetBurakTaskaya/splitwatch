import { type LayoutId, MAX_STREAMS, isLayoutId, layoutFor, layoutById } from './layouts';
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

export type ColorScheme = 'system' | 'light' | 'dark';

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
  colorScheme: ColorScheme;
  animate: boolean;
  performance: boolean;
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
  colorScheme: 'system',
  animate: true,
  performance: false,
  session: { layout: '1', streams: [], selected: null, muted: false, masterVolume: 1, volumes: {}, sports: {} },
};

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
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

export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isRecord(raw)) return { ...d, shortcuts: {}, sports: [], session: sanitizeSession(null) };
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
    colorScheme: scheme === 'light' || scheme === 'dark' ? scheme : 'system',
    animate: raw.animate !== false,
    performance: raw.performance === true,
    session: sanitizeSession(raw.session),
  };
}
