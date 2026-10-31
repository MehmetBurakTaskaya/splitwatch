// "Remind me" for upcoming streams (from the coming week's list or an event's schedule): a
// notification shortly before each one starts (src/main/reminders.ts).

export interface Reminder {
  videoId: string;
  title: string;
  channel: string;
  // The scheduled start (ISO).
  at: string;
  sport?: string;
  // The notification went out; the reminder stays until an hour after the start (the waiting screen
  // and the coming week still show it).
  notified?: true;
}

export const MAX_REMINDERS = 50;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function sanitizeReminders(raw: unknown): Reminder[] {
  const reminders: Reminder[] = [];
  if (!Array.isArray(raw)) return reminders;
  for (const r of raw) {
    if (!isRecord(r) || typeof r.videoId !== 'string' || !VIDEO_ID.test(r.videoId)) continue;
    if (typeof r.at !== 'string' || Number.isNaN(Date.parse(r.at))) continue;
    if (reminders.some((known) => known.videoId === r.videoId)) continue;
    reminders.push({
      videoId: r.videoId,
      title: typeof r.title === 'string' ? r.title.slice(0, 300) : '',
      channel: typeof r.channel === 'string' ? r.channel.slice(0, 200) : '',
      at: new Date(r.at).toISOString(),
      ...(typeof r.sport === 'string' && SLUG.test(r.sport) ? { sport: r.sport } : {}),
      ...(r.notified === true ? { notified: true as const } : {}),
    });
    if (reminders.length === MAX_REMINDERS) break;
  }
  return reminders;
}

// A stream to wait for: a reminder, or a coming stream on the Live now channels.
export interface NextItem {
  videoId: string;
  title: string;
  channel: string;
  at: number;
  reminded: boolean;
}

// How long a stream that has started stays among the next ones, to be put on the grid.
export const STARTED_KEEP = 30 * 60_000;

// The next streams by start time, reminders first among the same stream, at most three.
export function nextUp(
  reminders: readonly Reminder[],
  upcoming: readonly { videoId: string; title: string; channel: string; live: string; scheduledStart?: string }[],
  now: number,
  limit = 3,
): NextItem[] {
  const items = new Map<string, NextItem>();
  for (const r of reminders) {
    items.set(r.videoId, {
      videoId: r.videoId,
      title: r.title,
      channel: r.channel,
      at: Date.parse(r.at),
      reminded: true,
    });
  }
  for (const u of upcoming) {
    if (u.live !== 'upcoming' || !u.scheduledStart || items.has(u.videoId)) continue;
    const at = Date.parse(u.scheduledStart);
    if (!Number.isNaN(at))
      items.set(u.videoId, { videoId: u.videoId, title: u.title, channel: u.channel, at, reminded: false });
  }
  return [...items.values()]
    .filter((i) => i.at > now - STARTED_KEEP)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}
