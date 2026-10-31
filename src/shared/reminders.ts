// "Remind me" for upcoming streams (from the coming week's list or an event's schedule): a
// notification shortly before each one starts (src/main/reminders.ts).

export interface Reminder {
  videoId: string;
  title: string;
  channel: string;
  // The scheduled start (ISO).
  at: string;
  sport?: string;
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
    });
    if (reminders.length === MAX_REMINDERS) break;
  }
  return reminders;
}
