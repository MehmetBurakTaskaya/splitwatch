import { MAX_REMINDERS, type Reminder } from '../../shared/reminders';
import { setPrefs, usePrefs } from './prefs';

// Sets or clears a reminder for an upcoming stream.
export function toggleReminder(reminder: Reminder): void {
  const { reminders } = usePrefs.getState();
  const others = reminders.filter((r) => r.videoId !== reminder.videoId);
  setPrefs({ reminders: others.length === reminders.length ? [...others, reminder].slice(-MAX_REMINDERS) : others });
}
