import { app, net } from 'electron';
import { type FeedEntry, feedUrl, parseFeed } from '../shared/feeds';
import type { LiveNow, LiveState, StreamItem } from '../shared/ipc';
import type { FollowedChannel } from '../shared/notify';
import type { Preset } from '../shared/presets';
import type { VideoFacts } from '../shared/youtube-data';
import { loadKey } from './key-store';
import { getPresets } from './presets-store';
import { getSettings } from './settings-store';
import { videoFacts } from './youtube-api';

// "Live now" from the preset channels, kind to the quota: channel feeds (free) list each channel's
// latest videos, and one videos.list call per 50 of them (1 unit) tells which are live or coming up.
// Everything is cached in memory only, for minutes; nothing is kept on disk.

const FEED_TTL = 10 * 60_000;
const LIVE_NOW_TTL = 2 * 60_000;
const PER_CHANNEL = 5;
const MAX_CHANNELS = 30;
const UPCOMING_WINDOW = 7 * 24 * 60 * 60_000;

const feeds = new Map<string, { at: number; entries: FeedEntry[] }>();
const facts = new Map<string, { at: number; facts: VideoFacts }>();
let liveNowCache: { at: number; key: string; value: LiveNow } | null = null;

const feedsBase = () => (!app.isPackaged && process.env.SPLITWATCH_FEEDS_BASE) || 'https://www.youtube.com';

export async function channelFeed(channelId: string): Promise<FeedEntry[]> {
  const hit = feeds.get(channelId);
  if (hit && Date.now() - hit.at < FEED_TTL) return hit.entries;
  try {
    const res = await net.fetch(feedUrl(channelId, feedsBase()));
    const entries = res.ok ? parseFeed(await res.text()) : [];
    feeds.set(channelId, { at: Date.now(), entries });
    return entries;
  } catch {
    return hit?.entries ?? [];
  }
}

// Live and upcoming streams change state often; finished videos do not.
function factsTtl(f: VideoFacts): number {
  return f.live === 'live' ? 2 * 60_000 : f.live === 'upcoming' ? 5 * 60_000 : 30 * 60_000;
}

// Facts of the videos from the cache or one videos.list call per 50 (background work: it stops at
// the background share of the quota).
export async function factsFor(ids: string[]): Promise<Map<string, VideoFacts> | null> {
  const now = Date.now();
  const stale = ids.filter((id) => {
    const hit = facts.get(id);
    return !hit || now - hit.at >= factsTtl(hit.facts);
  });
  if (stale.length) {
    const result = await videoFacts(stale, true);
    if (!result.ok) return null;
    for (const f of result.data) facts.set(f.videoId, { at: now, facts: f });
    // Videos the API did not return are gone or private.
    for (const id of stale) {
      if (!result.data.some((f) => f.videoId === id)) {
        facts.set(id, { at: now, facts: { videoId: id, title: '', channel: '', live: 'none', embeddable: false } });
      }
    }
  }
  return new Map(ids.flatMap((id) => (facts.has(id) ? [[id, facts.get(id)!.facts] as const] : [])));
}

// The presets' channels, each with its sport when it serves one sport only: a channel that serves
// several (road and mountain cycling, say) gets no sport label.
export function channelSports(presets: Preset[]): Map<string, string | null> {
  const sportsOf = new Map<string, Set<string>>();
  for (const p of presets)
    for (const c of p.channels) sportsOf.set(c.id, (sportsOf.get(c.id) ?? new Set()).add(p.sport));
  return new Map([...sportsOf].map(([id, set]) => [id, set.size === 1 ? [...set][0]! : null]));
}

// The presets' channels in turns, every sport's first channel before any sport's second, so that a
// cap on the number of channels leaves no sport out.
export function fairChannels(presets: Preset[]): string[] {
  const out: string[] = [];
  for (let i = 0; presets.some((p) => i < p.channels.length); i++) {
    for (const p of presets) {
      const id = p.channels[i]?.id;
      if (id && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

// Live now for the given sports (a sport theme's, so the start screen suggests the sport on screen),
// or for the sports picked in Settings (empty: all).
export async function liveNow(only: string[] | null = null): Promise<LiveNow> {
  const sports = only ?? getSettings().sports;
  const chosen = getPresets().filter((p) => sports.length === 0 || sports.includes(p.sport));
  const sportOf = channelSports(chosen);
  const channels = fairChannels(chosen).slice(0, MAX_CHANNELS);
  const cacheKey = channels.join(',');
  if (liveNowCache && liveNowCache.key === cacheKey && Date.now() - liveNowCache.at < LIVE_NOW_TTL) {
    return liveNowCache.value;
  }

  // Shorts are never live and show poorly in the grid.
  const entries = (await Promise.all(channels.map((id) => channelFeed(id)))).flatMap((list) =>
    list.filter((e) => !e.short).slice(0, PER_CHANNEL),
  );
  const byId = new Map(entries.map((e) => [e.videoId, e]));
  const known = (await loadKey()) ? await factsFor([...byId.keys()]) : null;

  let value: LiveNow;
  if (known) {
    const now = Date.now();
    const items: StreamItem[] = [...known.values()]
      .filter((f) => f.embeddable && (f.live === 'live' || f.live === 'upcoming'))
      .filter((f) => f.live === 'live' || !f.scheduledStart || Date.parse(f.scheduledStart) - now < UPCOMING_WINDOW)
      .map((f) => {
        const entry = byId.get(f.videoId);
        const sport = entry ? sportOf.get(entry.channelId) : null;
        return { ...withoutEmbeddable(f), title: f.title || entry?.title || '', ...(sport ? { sport } : {}) };
      })
      .sort(
        (a, b) =>
          (a.live === 'live' ? 0 : 1) - (b.live === 'live' ? 0 : 1) ||
          Date.parse(a.scheduledStart ?? '') - Date.parse(b.scheduledStart ?? ''),
      );
    value = { mode: 'live', items };
  } else {
    const items = [...entries]
      .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
      .slice(0, 24)
      .map((e) => {
        const sport = sportOf.get(e.channelId);
        return {
          videoId: e.videoId,
          title: e.title,
          channel: e.channel,
          live: 'unknown' as const,
          ...(sport ? { sport } : {}),
        };
      });
    value = { mode: 'latest', items };
  }
  liveNowCache = { at: Date.now(), key: cacheKey, value };
  return value;
}

export async function liveStates(ids: string[]): Promise<Record<string, LiveState>> {
  const unknown = Object.fromEntries(ids.map((id) => [id, 'unknown' as LiveState]));
  if (!ids.length || !(await loadKey())) return unknown;
  const known = await factsFor(ids);
  if (!known) return unknown;
  return Object.fromEntries(ids.map((id) => [id, known.get(id)?.live ?? 'unknown']));
}

// The sport of each stream whose channel is a preset channel of one sport. With a key, the channel
// comes from videos.list (the same cached facts as the live states); without one, from the
// channels' feeds, which list their latest 15 videos.
export async function streamSports(ids: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = Object.fromEntries(ids.map((id) => [id, null]));
  if (!ids.length) return out;
  const presets = getPresets();
  const sportOf = channelSports(presets);
  let unknown = ids;
  if (await loadKey()) {
    const known = await factsFor(ids);
    if (known) {
      for (const id of ids) out[id] = sportOf.get(known.get(id)?.channelId ?? '') ?? null;
      unknown = ids.filter((id) => !known.get(id)?.channelId);
    }
  }
  if (unknown.length) {
    const channels = fairChannels(presets).slice(0, MAX_CHANNELS);
    const feedsByChannel = await Promise.all(channels.map(async (id) => [id, await channelFeed(id)] as const));
    for (const [channelId, entries] of feedsByChannel) {
      for (const e of entries) if (unknown.includes(e.videoId)) out[e.videoId] = sportOf.get(channelId) ?? null;
    }
  }
  return out;
}

// The channel of each stream, for following it (needs a key: videos.list names the channel).
export async function streamChannels(ids: string[]): Promise<Record<string, FollowedChannel | null>> {
  const out: Record<string, FollowedChannel | null> = Object.fromEntries(ids.map((id) => [id, null]));
  if (!ids.length || !(await loadKey())) return out;
  const known = await factsFor(ids);
  for (const id of ids) {
    const f = known?.get(id);
    if (f?.channelId) out[id] = { id: f.channelId, name: f.channel || f.channelId };
  }
  return out;
}

function withoutEmbeddable(f: VideoFacts): StreamItem {
  return {
    videoId: f.videoId,
    title: f.title,
    channel: f.channel,
    live: f.live,
    ...(f.scheduledStart ? { scheduledStart: f.scheduledStart } : {}),
  };
}
