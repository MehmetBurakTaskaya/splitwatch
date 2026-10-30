import { type LayoutId, MAX_STREAMS, isLayoutId, layoutFor, layoutById } from './layouts';
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
}

export interface Settings {
  version: 1;
  audioFocus: 'click' | 'hover';
  clipboardSuggestions: boolean;
  shortcuts: Partial<Record<ShortcutAction, string>>;
  session: Session;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  audioFocus: 'click',
  clipboardSuggestions: true,
  shortcuts: {},
  session: { layout: '1', streams: [], selected: null, muted: false, masterVolume: 1, volumes: {} },
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const volume = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

export function sanitizeSession(raw: unknown): Session {
  const d = DEFAULT_SETTINGS.session;
  if (!isRecord(raw)) return { ...d, volumes: {} };
  const streams = Array.isArray(raw.streams)
    ? [...new Set(raw.streams.filter((s): s is string => typeof s === 'string' && isVideoId(s)))].slice(0, MAX_STREAMS)
    : [];
  let layout = isLayoutId(raw.layout) ? raw.layout : layoutFor(streams.length);
  if (layoutById(layout).capacity < streams.length) layout = layoutFor(streams.length);
  const volumes: Record<string, number> = {};
  if (isRecord(raw.volumes)) {
    for (const id of streams) if (id in raw.volumes) volumes[id] = volume(raw.volumes[id], 1);
  }
  const selected = typeof raw.selected === 'string' && streams.includes(raw.selected) ? raw.selected : null;
  return {
    layout,
    streams,
    selected,
    muted: raw.muted === true,
    masterVolume: volume(raw.masterVolume, d.masterVolume),
    volumes,
  };
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isRecord(raw)) return { ...d, shortcuts: {}, session: sanitizeSession(null) };
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
    session: sanitizeSession(raw.session),
  };
}
