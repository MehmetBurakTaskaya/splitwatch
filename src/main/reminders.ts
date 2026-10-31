import type { Reminder } from '../shared/reminders';
import { t } from './i18n';
import { sendCommand } from './main-window';
import { showNotification } from './notify';
import { getSettings, onSettingsChange, saveSettings } from './settings-store';

// "Remind me" for upcoming streams: a notification shortly before each one starts, while the app
// runs (also from the tray); a click adds the stream. A reminder is marked once it fires, and goes an
// hour after the start, whether it fired or was missed (the app was closed).

const EARLY = 2 * 60_000;
const LATE = 60 * 60_000;
// setTimeout cannot wait longer than about 24 days; later reminders are picked up by the hourly look.
const HORIZON = 20 * 24 * 60 * 60_000;
const timers = new Map<string, NodeJS.Timeout>();

function fire(reminder: Reminder): void {
  timers.delete(reminder.videoId);
  saveSettings({
    reminders: getSettings().reminders.map((r) =>
      r.videoId === reminder.videoId ? { ...r, notified: true as const } : r,
    ),
  });
  const body = getSettings().spoilers ? t('notify.spoilerBody') : reminder.title;
  void showNotification(t('notify.reminderTitle', { channel: reminder.channel }), body, () =>
    sendCommand({ type: 'add', videoId: reminder.videoId, ...(reminder.sport ? { sport: reminder.sport } : {}) }),
  );
}

function schedule(): void {
  const now = Date.now();
  const reminders = getSettings().reminders;
  for (const [id, timer] of timers) {
    if (!reminders.some((r) => r.videoId === id)) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }
  const stale = reminders.filter((r) => Date.parse(r.at) < now - LATE);
  if (stale.length) {
    saveSettings({ reminders: reminders.filter((r) => !stale.includes(r)) });
    return;
  }
  for (const r of reminders) {
    const wait = Date.parse(r.at) - EARLY - now;
    if (r.notified || timers.has(r.videoId) || wait > HORIZON) continue;
    timers.set(
      r.videoId,
      setTimeout(() => fire(r), Math.max(0, wait)),
    );
  }
}

export function setupReminders(): void {
  schedule();
  onSettingsChange((s, before) => {
    if (s.reminders !== before.reminders) schedule();
  });
  setInterval(schedule, 60 * 60_000);
}
