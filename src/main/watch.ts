import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app, ipcMain } from 'electron';
import { localDate } from '../shared/events';
import { IPC } from '../shared/ipc';
import { type WatchHistory, addWatch, emptyWatch, pruneWatch, readReports, sanitizeWatch } from '../shared/watch';
import { clearSeen } from './history';
import { getSettings } from './settings-store';

// watch.json in the app data folder (see shared/watch.ts), written atomically at most once a minute
// and when the app quits.
const file = () => path.join(app.getPath('userData'), 'watch.json');
const today = () => localDate(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
let current: WatchHistory | null = null;
let timer: NodeJS.Timeout | null = null;

function load(): WatchHistory {
  if (!current) {
    try {
      current = sanitizeWatch(JSON.parse(readFileSync(file(), 'utf8')), Date.now(), today());
    } catch {
      current = emptyWatch();
    }
  }
  return current;
}

export function flushWatch(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!current) return;
  try {
    const tmp = `${file()}.tmp`;
    writeFileSync(tmp, JSON.stringify(current));
    renameSync(tmp, file());
  } catch {
    // The history is a convenience; a failed write loses nothing important.
  }
}

export function registerWatchIpc(): void {
  ipcMain.on(IPC.watchReport, (_e, raw: unknown) => {
    if (!getSettings().watchHistory) return;
    const reports = readReports(raw);
    if (!reports.length) return;
    current = addWatch(load(), reports, Date.now(), today());
    timer ??= setTimeout(flushWatch, 60_000);
  });
  ipcMain.handle(IPC.watchGet, () => (current = pruneWatch(load(), Date.now(), today())));
  // Clearing also forgets the streams kept for the search's suggestions.
  ipcMain.handle(IPC.watchClear, () => {
    current = emptyWatch();
    flushWatch();
    clearSeen();
  });
  app.on('will-quit', flushWatch);
}
