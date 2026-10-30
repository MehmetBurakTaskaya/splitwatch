// Sport presets: curated official channels per sport, kept as JSON files in presets/ (see
// presets/schema.json and CONTRIBUTING.md). The app ships a copy and refreshes it from GitHub.
import { isChannelId } from './feeds';

export interface PresetChannel {
  id: string;
  name: string;
  // The day someone confirmed that the ID belongs to the named channel and that it is active.
  checked: string;
  // Anything a maintainer should look at, such as unconfirmed ownership.
  review?: string;
}

export interface Preset {
  id: string;
  sport: string;
  channels: PresetChannel[];
  keywords: string[];
}

export interface PresetIndex {
  version: 1;
  presets: string[];
}

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

// Returns the preset, or null when anything in it is invalid: presets come from the network, so
// one bad field rejects the whole file rather than half-loading it.
export function validatePreset(raw: unknown): Preset | null {
  if (!isRecord(raw)) return null;
  const { id, sport, channels, keywords } = raw;
  if (typeof id !== 'string' || !SLUG.test(id) || typeof sport !== 'string' || !SLUG.test(sport)) return null;
  if (!Array.isArray(channels) || channels.length < 1 || channels.length > 20) return null;
  if (!Array.isArray(keywords) || keywords.length > 10 || !keywords.every((k) => text(k, 60))) return null;
  const out: PresetChannel[] = [];
  for (const c of channels) {
    if (!isRecord(c) || typeof c.id !== 'string' || !isChannelId(c.id) || !text(c.name, 100)) return null;
    if (typeof c.checked !== 'string' || !DATE.test(c.checked)) return null;
    if (c.review !== undefined && !text(c.review, 300)) return null;
    out.push({
      id: c.id,
      name: c.name as string,
      checked: c.checked,
      ...(c.review ? { review: c.review as string } : {}),
    });
  }
  return { id, sport, channels: out, keywords: keywords as string[] };
}

export function validateIndex(raw: unknown): PresetIndex | null {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.presets)) return null;
  const names = raw.presets.filter((p): p is string => typeof p === 'string' && SLUG.test(p));
  return names.length === raw.presets.length && names.length <= 100 ? { version: 1, presets: names } : null;
}
