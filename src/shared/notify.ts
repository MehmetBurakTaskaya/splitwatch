import { isChannelId } from './feeds';
import type { Preset } from './presets';

// Live notifications: the app watches the preset channels of chosen sports and the channels the
// user follows, and tells about each stream once, when it goes live.

export interface FollowedChannel {
  id: string;
  name: string;
}

export interface NotifySettings {
  on: boolean;
  // Sports whose preset channels are watched.
  sports: string[];
  channels: FollowedChannel[];
}

export const DEFAULT_NOTIFY: NotifySettings = { on: false, sports: [], channels: [] };
export const MAX_FOLLOWED = 50;
// Channels watched per check: each costs one free feed request.
export const MAX_WATCHED = 50;
// A stream is told about once; the record of it is kept this long.
export const TOLD_KEEP = 48 * 60 * 60_000;

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function sanitizeNotify(raw: unknown): NotifySettings {
  if (!isRecord(raw)) return { ...DEFAULT_NOTIFY, sports: [], channels: [] };
  const sports = Array.isArray(raw.sports)
    ? [...new Set(raw.sports.filter((s): s is string => typeof s === 'string' && SLUG.test(s)))]
    : [];
  const channels: FollowedChannel[] = [];
  if (Array.isArray(raw.channels)) {
    for (const c of raw.channels) {
      if (!isRecord(c) || typeof c.id !== 'string' || !isChannelId(c.id)) continue;
      if (channels.some((known) => known.id === c.id)) continue;
      const name =
        typeof c.name === 'string'
          ? c.name
              .replace(/[\s\p{Cc}]+/gu, ' ')
              .trim()
              .slice(0, 100)
          : '';
      channels.push({ id: c.id, name: name || c.id });
      if (channels.length === MAX_FOLLOWED) break;
    }
  }
  return { on: raw.on === true, sports, channels };
}

// The preset channels of the chosen sports, then the followed channels, without repeats.
export function watchedChannels(notify: NotifySettings, presets: Preset[], max = MAX_WATCHED): string[] {
  const ids = [
    ...presets.filter((p) => notify.sports.includes(p.sport)).flatMap((p) => p.channels.map((c) => c.id)),
    ...notify.channels.map((c) => c.id),
  ];
  return [...new Set(ids)].slice(0, max);
}

// Live streams to tell about: not told before and not in the grid already.
export function toTell(live: string[], told: Record<string, number>, inGrid: string[]): string[] {
  return live.filter((id) => !(id in told) && !inGrid.includes(id));
}

export function pruneTold(told: Record<string, number>, now: number): Record<string, number> {
  return Object.fromEntries(Object.entries(told).filter(([, at]) => now - at < TOLD_KEEP));
}
