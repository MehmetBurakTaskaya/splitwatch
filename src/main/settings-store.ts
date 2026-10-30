import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { type Settings, sanitizeSettings } from '../shared/settings';

// settings.json in the app data folder, written atomically and at most every 400 ms.
let current: Settings | null = null;
let timer: NodeJS.Timeout | null = null;
const listeners = new Set<(settings: Settings, before: Settings) => void>();

const file = () => path.join(app.getPath('userData'), 'settings.json');

export function getSettings(): Settings {
  if (!current) {
    try {
      current = sanitizeSettings(JSON.parse(readFileSync(file(), 'utf8')));
    } catch {
      current = sanitizeSettings(null);
    }
  }
  return current;
}

export function saveSettings(patch: unknown): Settings {
  const base = getSettings();
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) return base;
  current = sanitizeSettings({ ...base, ...patch });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushSettings, 400);
  for (const listener of listeners) listener(current, base);
  return current;
}

export function onSettingsChange(listener: (settings: Settings, before: Settings) => void): void {
  listeners.add(listener);
}

export function flushSettings(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!current) return;
  try {
    const tmp = `${file()}.tmp`;
    writeFileSync(tmp, JSON.stringify(current, null, 2));
    renameSync(tmp, file());
  } catch {
    // A failed write keeps the previous file; the next change tries again.
  }
}
