import type { StreamItem } from './ipc';
import type { LayoutId } from './layouts';

// Ready lists (ADR 0014): up to nine streams of one sport, or one stream each of nine sports, from the
// preset channels, opened side by side in one click. A list is made anew from the channels each time
// and is never stored, so whatever the user changes in the grid stays with the grid.

export const READY_KINDS = ['all', 'live', 'videos'] as const;
export type ReadyKind = (typeof READY_KINDS)[number];
export const isReadyKind = (value: unknown): value is ReadyKind => READY_KINDS.includes(value as ReadyKind);

// The "sport" of the list that takes one stream from each of nine sports.
export const MIX = 'mix';
export const MAX_READY = 9;

// A list fills a whole grid: 9 streams, else 6, 4, 3, 2 or 1.
const GRIDS: readonly (readonly [number, LayoutId])[] = [
  [9, '9'],
  [6, '6'],
  [4, '4'],
  [3, '3'],
  [2, '2'],
  [1, '1'],
];

export interface ReadyCandidate extends StreamItem {
  published?: string;
}

export interface ReadyList {
  layout: LayoutId | null;
  // In grid order, each with its sport.
  items: StreamItem[];
  // The next candidates, to take the place of a stream that cannot play in the app.
  spare: StreamItem[];
  // Without a key the app cannot tell live streams from videos.
  liveKnown: boolean;
}

export const readySize = (count: number): number => GRIDS.find(([size]) => count >= size)?.[0] ?? 0;
export const readyLayout = (count: number): LayoutId | null => GRIDS.find(([size]) => count >= size)?.[1] ?? null;

const time = (iso: string | undefined) => {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? 0 : t;
};

function item(candidate: ReadyCandidate): StreamItem {
  const { videoId, title, channel, live, sport } = candidate;
  return { videoId, title, channel, live, ...(sport ? { sport } : {}) };
}

// The channels in turns, each one's newest first, so that a channel that posts many videos a day
// does not fill the grid alone.
function inTurns(newestFirst: readonly ReadyCandidate[]): ReadyCandidate[] {
  const byChannel = new Map<string, ReadyCandidate[]>();
  for (const c of newestFirst) byChannel.set(c.channel, [...(byChannel.get(c.channel) ?? []), c]);
  const queues = [...byChannel.values()];
  const out: ReadyCandidate[] = [];
  for (let i = 0; out.length < newestFirst.length; i++) {
    for (const queue of queues) {
      const next = queue[i];
      if (next) out.push(next);
    }
  }
  return out;
}

// The candidates that fit the kind, best first: live streams, then videos, newest first and the
// channels in turns. Upcoming streams are left out, since nothing plays yet; without a key every
// candidate counts as a video.
export function ranked(candidates: readonly ReadyCandidate[], kind: ReadyKind): ReadyCandidate[] {
  const seen = new Set<string>();
  const unique = candidates.filter((c) => !seen.has(c.videoId) && seen.add(c.videoId));
  const newest = (a: ReadyCandidate, b: ReadyCandidate) => time(b.published) - time(a.published);
  const live = inTurns(unique.filter((c) => c.live === 'live').sort(newest));
  const videos = inTurns(unique.filter((c) => c.live === 'none' || c.live === 'unknown').sort(newest));
  return kind === 'live' ? live : kind === 'videos' ? videos : [...live, ...videos];
}

export function readyList(candidates: readonly ReadyCandidate[], kind: ReadyKind, liveKnown: boolean): ReadyList {
  const pool = ranked(candidates, kind);
  const size = readySize(Math.min(pool.length, MAX_READY));
  return {
    layout: readyLayout(size),
    items: pool.slice(0, size).map(item),
    spare: pool.slice(size, size + MAX_READY).map(item),
    liveKnown,
  };
}

// One stream from each of up to nine sports, the sports in a random order each time; a stream that
// two sports share counts for the first only, and a channel already in the mix comes after the
// others (still after no live stream).
export function mixList(
  bySport: ReadonlyMap<string, readonly ReadyCandidate[]>,
  kind: ReadyKind,
  liveKnown: boolean,
  random: () => number = Math.random,
): ReadyList {
  const used = new Set<string>();
  const usedChannels = new Set<string>();
  const sports = [...bySport.keys()];
  for (let i = sports.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [sports[i], sports[j]] = [sports[j]!, sports[i]!];
  }
  const firsts: ReadyCandidate[] = [];
  const seconds: ReadyCandidate[] = [];
  const rank = (c: ReadyCandidate) => (c.live === 'live' ? 0 : 2) + (usedChannels.has(c.channel) ? 1 : 0);
  for (const sport of sports) {
    const [first, second] = ranked(bySport.get(sport) ?? [], kind)
      .filter((c) => !used.has(c.videoId))
      .sort((a, b) => rank(a) - rank(b));
    if (!first) continue;
    used.add(first.videoId);
    usedChannels.add(first.channel);
    firsts.push(first);
    if (second) seconds.push(second);
  }
  const size = readySize(Math.min(firsts.length, MAX_READY));
  return {
    layout: readyLayout(size),
    items: firsts.slice(0, size).map(item),
    spare: [...firsts.slice(size), ...seconds].slice(0, MAX_READY).map(item),
    liveKnown,
  };
}
