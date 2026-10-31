// The watch history, kept on this computer only. Time is counted while streams play on screen; when
// several play at once, each gets its share, so the parts add up to the time spent watching. YouTube's
// developer policies allow keeping data from YouTube (titles, channel names) for 30 days at most, so
// a stream's entry goes 30 days after it was last watched. Only the totals by sport, which are the
// app's own data, stay until the history is cleared.
import { addDays } from './events';
import { isVideoId } from './youtube';

export const KEEP_DAYS = 30;
export const MAX_ENTRIES = 300;
// The most seconds one report can add for one stream (reports come every 15 seconds).
export const MAX_REPORT_SECONDS = 60;

export interface WatchEntry {
  videoId: string;
  title: string;
  channel: string;
  sport: string | null;
  lastAt: number;
  seconds: number;
  // Seconds by local day (YYYY-MM-DD), for the last 30 days.
  days: Record<string, number>;
}

export interface WatchTotals {
  seconds: number;
  // Seconds by sport ("none" for streams without one).
  sports: Record<string, number>;
  // When counting began, or null when nothing was counted yet.
  since: number | null;
}

export interface WatchHistory {
  entries: WatchEntry[];
  totals: WatchTotals;
}

// One report from the grid: a stream that played, and its share of the time since the last report.
export interface WatchReport {
  videoId: string;
  title: string;
  channel: string;
  sport: string | null;
  seconds: number;
}

export const emptyWatch = (): WatchHistory => ({ entries: [], totals: { seconds: 0, sports: {}, since: null } });

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const seconds = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v.length <= 300 ? v : null);

function readEntry(raw: unknown): WatchEntry | null {
  if (!isRecord(raw) || typeof raw.videoId !== 'string' || !isVideoId(raw.videoId)) return null;
  const title = text(raw.title);
  const channel = text(raw.channel);
  const total = seconds(raw.seconds);
  if (title === null || channel === null || total === null || typeof raw.lastAt !== 'number') return null;
  const days: Record<string, number> = {};
  if (isRecord(raw.days)) {
    for (const [day, value] of Object.entries(raw.days)) {
      const s = seconds(value);
      if (DATE.test(day) && s !== null) days[day] = s;
    }
  }
  const sport = typeof raw.sport === 'string' && SLUG.test(raw.sport) ? raw.sport : null;
  return { videoId: raw.videoId, title, channel, sport, lastAt: raw.lastAt, seconds: total, days };
}

// Drops what is older than 30 days: entries not watched since, and day counts before then.
export function pruneWatch(history: WatchHistory, now: number, today: string): WatchHistory {
  const cutoff = now - KEEP_DAYS * 86_400_000;
  const first = addDays(today, -(KEEP_DAYS - 1));
  const entries = history.entries
    .filter((e) => e.lastAt >= cutoff)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, MAX_ENTRIES)
    .map((e) => ({ ...e, days: Object.fromEntries(Object.entries(e.days).filter(([day]) => day >= first)) }));
  return { entries, totals: history.totals };
}

export function sanitizeWatch(raw: unknown, now: number, today: string): WatchHistory {
  if (!isRecord(raw)) return emptyWatch();
  const entries: WatchEntry[] = [];
  if (Array.isArray(raw.entries)) {
    for (const item of raw.entries) {
      const entry = readEntry(item);
      if (entry && !entries.some((e) => e.videoId === entry.videoId)) entries.push(entry);
    }
  }
  const t = isRecord(raw.totals) ? raw.totals : {};
  const sports: Record<string, number> = {};
  if (isRecord(t.sports)) {
    for (const [sport, value] of Object.entries(t.sports)) {
      const s = seconds(value);
      if ((sport === 'none' || SLUG.test(sport)) && s !== null) sports[sport] = s;
    }
  }
  const totals = { seconds: seconds(t.seconds) ?? 0, sports, since: typeof t.since === 'number' ? t.since : null };
  return pruneWatch({ entries, totals }, now, today);
}

export function readReports(raw: unknown): WatchReport[] {
  if (!Array.isArray(raw)) return [];
  const out: WatchReport[] = [];
  for (const item of raw.slice(0, 16)) {
    if (!isRecord(item) || typeof item.videoId !== 'string' || !isVideoId(item.videoId)) continue;
    const title = text(item.title);
    const channel = text(item.channel);
    const s = seconds(item.seconds);
    if (title === null || channel === null || s === null) continue;
    const sport = typeof item.sport === 'string' && SLUG.test(item.sport) ? item.sport : null;
    out.push({ videoId: item.videoId, title, channel, sport, seconds: Math.min(MAX_REPORT_SECONDS, s) });
  }
  return out;
}

export function addWatch(
  history: WatchHistory,
  reports: readonly WatchReport[],
  now: number,
  today: string,
): WatchHistory {
  if (!reports.length) return history;
  const entries = [...history.entries];
  const sports = { ...history.totals.sports };
  let total = history.totals.seconds;
  for (const r of reports) {
    const i = entries.findIndex((e) => e.videoId === r.videoId);
    const before = i >= 0 ? entries[i] : undefined;
    const entry: WatchEntry = {
      videoId: r.videoId,
      // The newest title and channel: this keeps them fresh.
      title: r.title,
      channel: r.channel,
      sport: r.sport,
      lastAt: now,
      seconds: (before?.seconds ?? 0) + r.seconds,
      days: { ...before?.days, [today]: (before?.days[today] ?? 0) + r.seconds },
    };
    if (i >= 0) entries[i] = entry;
    else entries.push(entry);
    const sport = r.sport ?? 'none';
    sports[sport] = (sports[sport] ?? 0) + r.seconds;
    total += r.seconds;
  }
  return pruneWatch({ entries, totals: { seconds: total, sports, since: history.totals.since ?? now } }, now, today);
}

export interface WatchStats {
  week: number;
  month: number;
  total: number;
  since: number | null;
  // Most first.
  sports: { sport: string | null; seconds: number }[];
  channels: { channel: string; seconds: number }[];
  recent: WatchEntry[];
}

export function watchStats(history: WatchHistory, today: string): WatchStats {
  const weekStart = addDays(today, -6);
  let week = 0;
  let month = 0;
  const channels = new Map<string, number>();
  for (const entry of history.entries) {
    for (const [day, s] of Object.entries(entry.days)) {
      month += s;
      if (day >= weekStart) week += s;
    }
    const inMonth = Object.values(entry.days).reduce((a, b) => a + b, 0);
    if (inMonth > 0) channels.set(entry.channel, (channels.get(entry.channel) ?? 0) + inMonth);
  }
  return {
    week,
    month,
    total: history.totals.seconds,
    since: history.totals.since,
    sports: Object.entries(history.totals.sports)
      .map(([sport, seconds]) => ({ sport: sport === 'none' ? null : sport, seconds }))
      .sort((a, b) => b.seconds - a.seconds),
    channels: [...channels]
      .map(([channel, seconds]) => ({ channel, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5),
    recent: [...history.entries].sort((a, b) => b.lastAt - a.lastAt).slice(0, 20),
  };
}
