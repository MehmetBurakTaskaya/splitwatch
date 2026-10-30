import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Notification, app, ipcMain } from 'electron';
import type { FeedEntry } from '../shared/feeds';
import { IPC } from '../shared/ipc';
import { pruneTold, toTell, watchedChannels } from '../shared/notify';
import { t } from './i18n';
import { loadKey } from './key-store';
import { channelFeed, channelSports, factsFor } from './live';
import { sendCommand } from './main-window';
import { getPresets } from './presets-store';
import { getSettings, onSettingsChange } from './settings-store';

// Live notifications. Every ten minutes, while the app runs (also from the tray), the free channel
// feeds list the watched channels' latest videos and one videos.list call per 50 of them (1 unit,
// background share of the quota) tells which went live. Each stream is told about once; the IDs
// told about are kept in notified.json for two days. Without a key nothing is checked: the feeds
// alone cannot tell a live stream from an upload.

const PER_CHANNEL = 5;
const MAX_SHOWN = 3;
// Development and test runs only: a shorter interval.
const every = () => (!app.isPackaged && Number(process.env.SPLITWATCH_NOTIFY_EVERY)) || 10 * 60_000;

let timer: NodeJS.Timeout | null = null;
let first: NodeJS.Timeout | null = null;
// Notifications lose their click handler once garbage-collected, so they are kept until closed.
const open = new Set<Notification>();

const file = () => path.join(app.getPath('userData'), 'notified.json');

function loadTold(): Record<string, number> {
  try {
    const raw: unknown = JSON.parse(readFileSync(file(), 'utf8'));
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])),
    );
  } catch {
    return {};
  }
}

function saveTold(told: Record<string, number>): void {
  try {
    writeFileSync(file(), JSON.stringify(told));
  } catch {
    // Kept in memory until the next check tries again.
  }
}

export function showNotification(title: string, body: string, onClick: () => void): Promise<boolean> {
  if (!Notification.isSupported()) return Promise.resolve(false);
  return new Promise((resolve) => {
    const n = new Notification({ title, body });
    open.add(n);
    const done = () => open.delete(n);
    n.on('show', () => resolve(true));
    // macOS reports this for apps without a developer signature.
    n.on('failed', () => {
      done();
      resolve(false);
    });
    n.on('click', () => {
      done();
      onClick();
    });
    n.on('close', done);
    n.show();
    setTimeout(() => resolve(false), 10_000);
  });
}

async function check(): Promise<void> {
  const { notify, session } = getSettings();
  if (!notify.on || !(await loadKey())) return;
  const presets = getPresets();
  const entries = new Map<string, FeedEntry>();
  const feeds = await Promise.all(watchedChannels(notify, presets).map((id) => channelFeed(id)));
  for (const list of feeds) for (const e of list.slice(0, PER_CHANNEL)) entries.set(e.videoId, e);
  if (!entries.size) return;
  const known = await factsFor([...entries.keys()]);
  if (!known) return;
  const live = [...known.values()].filter((f) => f.live === 'live' && f.embeddable).map((f) => f.videoId);
  const told = pruneTold(loadTold(), Date.now());
  const fresh = toTell(live, told, session.streams);
  if (!fresh.length) return saveTold(told);
  const sportOf = channelSports(presets);
  for (const id of fresh.slice(0, MAX_SHOWN)) {
    const entry = entries.get(id);
    const facts = known.get(id);
    const sport = entry ? sportOf.get(entry.channelId) : null;
    const channel = facts?.channel || entry?.channel || '';
    void showNotification(t('notify.title', { channel }), facts?.title || entry?.title || '', () =>
      sendCommand({ type: 'add', videoId: id, ...(sport ? { sport } : {}) }),
    );
  }
  // More at once are not shown one by one; Live now lists them.
  for (const id of fresh) told[id] = Date.now();
  saveTold(told);
}

function sync(): void {
  const on = getSettings().notify.on;
  if (on && !timer) {
    timer = setInterval(() => void check(), every());
    // The first look comes soon after the start, once the window had its turn with the network.
    first = setTimeout(() => void check(), Math.min(30_000, every()));
  } else if (!on && timer) {
    clearInterval(timer);
    if (first) clearTimeout(first);
    timer = first = null;
  }
}

export function setupNotifications(): void {
  sync();
  onSettingsChange((s, before) => {
    if (s.notify.on !== before.notify.on) sync();
  });
  // Shown when notifications are turned on, so the user sees whether the system lets them through.
  ipcMain.handle(IPC.notifyTest, () => showNotification(t('notify.testTitle'), t('notify.testBody'), () => undefined));
}
