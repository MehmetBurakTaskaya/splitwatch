// The Summer and Winter Games: one JSON file per edition in events/ (see events/schema.json and
// CONTRIBUTING.md). The app ships a copy and refreshes it from GitHub, like the presets, so a
// schedule or a medal table page can be added without a release. Dates are the host's calendar
// days; every fact comes from a source listed in the file.

import type { EventKind } from './themes';

export type { EventKind };

// One sport on one day: medals is the number of medal events (finals), 0 for other competition.
export interface CalendarDay {
  date: string;
  sport: string;
  medals: number;
}

export interface EventSource {
  url: string;
  checked: string;
}

export interface GamesEvent {
  id: string;
  kind: EventKind;
  youth: boolean;
  year: number;
  place: string;
  timezone: string;
  // The opening and closing ceremony days. Some competition starts before the opening.
  start: string;
  end: string;
  calendar: CalendarDay[];
  // The English Wikipedia page ID of the medal table, once the page exists.
  medalsPage: number | null;
  sources: EventSource[];
}

export interface EventIndex {
  version: 1;
  events: string[];
}

// The mode is suggested this many days before the opening.
export const SUGGEST_DAYS = 30;

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isDate = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v));

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Returns the event, or null when anything in it is invalid (one bad field rejects the file).
export function validateEvent(raw: unknown): GamesEvent | null {
  if (!isRecord(raw)) return null;
  const { id, kind, youth, year, place, timezone, start, end, calendar, medalsPage, sources } = raw;
  if (typeof id !== 'string' || !SLUG.test(id) || (kind !== 'summer' && kind !== 'winter')) return null;
  if (typeof youth !== 'boolean' || typeof year !== 'number' || !Number.isInteger(year)) return null;
  if (!text(place, 80) || typeof timezone !== 'string' || !isTimeZone(timezone)) return null;
  if (!isDate(start) || !isDate(end) || end < start) return null;
  if (medalsPage !== null && !(typeof medalsPage === 'number' && Number.isInteger(medalsPage) && medalsPage > 0)) {
    return null;
  }
  if (!Array.isArray(calendar) || calendar.length > 2000) return null;
  const days: CalendarDay[] = [];
  for (const d of calendar) {
    if (!isRecord(d) || !isDate(d.date) || typeof d.sport !== 'string' || !SLUG.test(d.sport)) return null;
    if (typeof d.medals !== 'number' || !Number.isInteger(d.medals) || d.medals < 0 || d.medals > 99) return null;
    days.push({ date: d.date, sport: d.sport, medals: d.medals });
  }
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > 10) return null;
  const out: EventSource[] = [];
  for (const s of sources) {
    if (!isRecord(s) || !text(s.url, 300) || !s.url.startsWith('https://') || !isDate(s.checked)) return null;
    out.push({ url: s.url, checked: s.checked });
  }
  return { id, kind, youth, year, place, timezone, start, end, calendar: days, medalsPage, sources: out };
}

export function validateEventIndex(raw: unknown): EventIndex | null {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.events)) return null;
  const names = raw.events.filter((e): e is string => typeof e === 'string' && SLUG.test(e));
  return names.length === raw.events.length && names.length <= 50 ? { version: 1, events: names } : null;
}

// Today's date in the host's time zone.
export function localDate(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .slice(0, 10);
}

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

export function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * 86_400_000).toISOString().slice(0, 10);
}

export type EventPhase = { phase: 'before'; days: number } | { phase: 'during'; day: number } | { phase: 'after' };

// Days to the opening, or the day of the Games (1 = the opening day), in the host's calendar.
export function eventPhase(event: GamesEvent, now: Date): EventPhase {
  const today = localDate(now, event.timezone);
  if (today < event.start) return { phase: 'before', days: dayNumber(event.start) - dayNumber(today) };
  if (today > event.end) return { phase: 'after' };
  return { phase: 'during', day: dayNumber(today) - dayNumber(event.start) + 1 };
}

// The event to suggest: one under way, or the next one to open within SUGGEST_DAYS, unless the
// user said no to it.
export function suggestedEvent(events: GamesEvent[], now: Date, dismissed: string[]): GamesEvent | null {
  const candidates = events
    .filter((e) => !dismissed.includes(e.id))
    .map((e) => ({ e, p: eventPhase(e, now) }))
    .filter(({ p }) => p.phase === 'during' || (p.phase === 'before' && p.days <= SUGGEST_DAYS))
    .sort((a, b) => a.e.start.localeCompare(b.e.start));
  return candidates[0]?.e ?? null;
}

// The days that have competition, in order: from the first competition (or the opening) to the
// closing.
export function eventDays(event: GamesEvent): string[] {
  const first = event.calendar.reduce((min, d) => (d.date < min ? d.date : min), event.start);
  const days: string[] = [];
  for (let d = first; d <= event.end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function sportsOn(event: GamesEvent, date: string): CalendarDay[] {
  return event.calendar
    .filter((d) => d.date === date)
    .sort((a, b) => b.medals - a.medals || a.sport.localeCompare(b.sport));
}

// Events in display order: under way or coming first (soonest first), then past ones (latest first).
export function sortEvents(events: GamesEvent[], now: Date): GamesEvent[] {
  const over = (e: GamesEvent) => eventPhase(e, now).phase === 'after';
  return [...events].sort((a, b) =>
    over(a) !== over(b)
      ? over(a)
        ? 1
        : -1
      : over(a)
        ? b.start.localeCompare(a.start)
        : a.start.localeCompare(b.start),
  );
}

// A "remind me" for an upcoming stream: a notification when it starts.
export interface Reminder {
  videoId: string;
  title: string;
  channel: string;
  at: string;
  sport?: string;
}

export interface EventSettings {
  // The event whose mode is on (the user turned it on, or tried it).
  active: string | null;
  // Events whose suggestion the user declined.
  dismissed: string[];
  // Events whose opening animation has played.
  introSeen: string[];
  // The followed country, as an ISO 3166-1 alpha-2 code; null until the user picks one (the
  // system's region is the default).
  country: string | null;
  snow: number;
  reminders: Reminder[];
}

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  active: null,
  dismissed: [],
  introSeen: [],
  country: null,
  snow: 2,
  reminders: [],
};
export const MAX_REMINDERS = 50;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const slugs = (v: unknown) =>
  Array.isArray(v)
    ? [...new Set(v.filter((s): s is string => typeof s === 'string' && SLUG.test(s)))].slice(0, 50)
    : [];

export function sanitizeEventSettings(raw: unknown): EventSettings {
  if (!isRecord(raw)) return { ...DEFAULT_EVENT_SETTINGS, dismissed: [], introSeen: [], reminders: [] };
  const reminders: Reminder[] = [];
  if (Array.isArray(raw.reminders)) {
    for (const r of raw.reminders) {
      if (!isRecord(r) || typeof r.videoId !== 'string' || !VIDEO_ID.test(r.videoId)) continue;
      if (typeof r.at !== 'string' || Number.isNaN(Date.parse(r.at))) continue;
      if (reminders.some((known) => known.videoId === r.videoId)) continue;
      reminders.push({
        videoId: r.videoId,
        title: typeof r.title === 'string' ? r.title.slice(0, 300) : '',
        channel: typeof r.channel === 'string' ? r.channel.slice(0, 200) : '',
        at: new Date(r.at).toISOString(),
        ...(typeof r.sport === 'string' && SLUG.test(r.sport) ? { sport: r.sport } : {}),
      });
      if (reminders.length === MAX_REMINDERS) break;
    }
  }
  const snow = typeof raw.snow === 'number' && Number.isInteger(raw.snow) ? Math.min(3, Math.max(0, raw.snow)) : 2;
  return {
    active: typeof raw.active === 'string' && SLUG.test(raw.active) ? raw.active : null,
    dismissed: slugs(raw.dismissed),
    introSeen: slugs(raw.introSeen),
    country: typeof raw.country === 'string' && /^[A-Z]{2}$/.test(raw.country) ? raw.country : null,
    snow,
    reminders,
  };
}
