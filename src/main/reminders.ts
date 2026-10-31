import type { Reminder } from '../shared/events';
import { t } from './i18n';
import { sendCommand } from './main-window';
import { showNotification } from './notify';
import { getSettings, onSettingsChange, saveSettings } from './settings-store';

// "Remind me" for upcoming streams: a notification shortly before each one starts, while the app
// runs (also from the tray); a click adds the stream. A reminder is removed once it fires; one
// missed by more than an hour (the app was closed) is dropped.

const EARLY = 2 * 60_000;
const LATE = 60 * 60_000;
// setTimeout cannot wait longer than about 24 days; later reminders are picked up by the hourly look.
const HORIZON = 20 * 24 * 60 * 60_000;
const timers = new Map<string, NodeJS.Timeout>();

function fire(reminder: Reminder): void {
  timers.delete(reminder.videoId);
  const event = getSettings().event;
  saveSettings({ event: { ...event, reminders: event.reminders.filter((r) => r.videoId !== reminder.videoId) } });
  const body = getSettings().spoilers ? t('notify.spoilerBody') : reminder.title;
  void showNotification(t('notify.reminderTitle', { channel: reminder.channel }), body, () =>
    sendCommand({ type: 'add', videoId: reminder.videoId, ...(reminder.sport ? { sport: reminder.sport } : {}) }),
  );
}

function schedule(): void {
  const now = Date.now();
  const reminders = getSettings().event.reminders;
  for (const [id, timer] of timers) {
    if (!reminders.some((r) => r.videoId === id)) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }
  const stale = reminders.filter((r) => Date.parse(r.at) < now - LATE);
  if (stale.length) {
    const event = getSettings().event;
    saveSettings({ event: { ...event, reminders: reminders.filter((r) => !stale.includes(r)) } });
    return;
  }
  for (const r of reminders) {
    const wait = Date.parse(r.at) - EARLY - now;
    if (timers.has(r.videoId) || wait > HORIZON) continue;
    timers.set(
      r.videoId,
      setTimeout(() => fire(r), Math.max(0, wait)),
    );
  }
}

export function setupReminders(): void {
  schedule();
  onSettingsChange((s, before) => {
    if (s.event.reminders !== before.event.reminders) schedule();
  });
  setInterval(schedule, 60 * 60_000);
}
