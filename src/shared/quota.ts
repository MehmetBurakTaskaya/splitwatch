// The YouTube Data API v3 quota, as documented on 2026-10-30
// (developers.google.com/youtube/v3/determine_quota_cost):
// - search.list draws from a separate "Search Queries" bucket: 100 calls a day by default;
// - videos.list, channels.list and playlistItems.list cost 1 unit each from 10,000 units a day;
// - every request counts, invalid ones included;
// - both reset at midnight Pacific Time.

export type QuotaBucket = 'units' | 'searches';

export interface QuotaLimits {
  units: number;
  searches: number;
}

export interface QuotaLedger {
  day: string; // the Pacific Time date the counts belong to, YYYY-MM-DD
  units: number;
  searches: number;
  exhausted: QuotaBucket[]; // buckets the API reported as used up today
}

export const DEFAULT_LIMITS: QuotaLimits = { units: 10_000, searches: 100 };

// Background work (live checks) stops when this share of the units is used, so searches and
// the user's own actions keep working until the reset.
export const BACKGROUND_SHARE = 0.9;

const PACIFIC = 'America/Los_Angeles';

export function pacificDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// The moment of the next midnight in Pacific Time.
export function nextReset(now: Date): Date {
  const [y, m, d] = pacificDay(now).split('-').map(Number) as [number, number, number];
  const offsetAt = (instant: Date) => {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: PACIFIC, timeZoneName: 'shortOffset' })
      .formatToParts(instant)
      .find((p) => p.type === 'timeZoneName')?.value;
    const match = /GMT([+-]\d+)(?::(\d+))?/.exec(name ?? '');
    return match ? Number(match[1]) * 60 + Math.sign(Number(match[1])) * Number(match[2] ?? 0) : -480;
  };
  // Midnight of the next Pacific day, using the offset that applies at that moment (DST aware).
  const guess = new Date(Date.UTC(y, m - 1, d + 1, 0, 0) - offsetAt(now) * 60_000);
  return new Date(Date.UTC(y, m - 1, d + 1, 0, 0) - offsetAt(guess) * 60_000);
}

export function freshLedger(now: Date): QuotaLedger {
  return { day: pacificDay(now), units: 0, searches: 0, exhausted: [] };
}

// A ledger from an earlier Pacific day starts over.
export function currentLedger(ledger: QuotaLedger | null, now: Date): QuotaLedger {
  return ledger && ledger.day === pacificDay(now) ? ledger : freshLedger(now);
}

export function remaining(ledger: QuotaLedger, limits: QuotaLimits, bucket: QuotaBucket): number {
  if (ledger.exhausted.includes(bucket)) return 0;
  return Math.max(0, limits[bucket] - ledger[bucket]);
}

export function canSpend(
  ledger: QuotaLedger,
  limits: QuotaLimits,
  bucket: QuotaBucket,
  cost: number,
  background = false,
): boolean {
  if (ledger.exhausted.includes(bucket)) return false;
  const cap = background && bucket === 'units' ? Math.floor(limits.units * BACKGROUND_SHARE) : limits[bucket];
  return ledger[bucket] + cost <= cap;
}

export function spend(ledger: QuotaLedger, bucket: QuotaBucket, cost: number): QuotaLedger {
  return { ...ledger, [bucket]: ledger[bucket] + cost };
}

export function markExhausted(ledger: QuotaLedger, bucket: QuotaBucket): QuotaLedger {
  return ledger.exhausted.includes(bucket) ? ledger : { ...ledger, exhausted: [...ledger.exhausted, bucket] };
}

export function sanitizeLedger(raw: unknown, now: Date): QuotaLedger {
  if (typeof raw !== 'object' || raw === null) return freshLedger(now);
  const r = raw as Record<string, unknown>;
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const ledger: QuotaLedger = {
    day: typeof r.day === 'string' ? r.day : '',
    units: count(r.units),
    searches: count(r.searches),
    exhausted: Array.isArray(r.exhausted)
      ? r.exhausted.filter((b): b is QuotaBucket => b === 'units' || b === 'searches')
      : [],
  };
  return currentLedger(ledger, now);
}

export function sanitizeLimits(raw: unknown): QuotaLimits {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const limit = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10_000_000 ? v : fallback;
  return { units: limit(r.units, DEFAULT_LIMITS.units), searches: limit(r.searches, DEFAULT_LIMITS.searches) };
}
