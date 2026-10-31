import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { StreamItem } from '../shared/ipc';
import { isVideoId } from '../shared/youtube';
import { getSettings } from './settings-store';
import { getVideoInfo } from './video-info';

// Streams the user added before, for the search palette's local suggestions. YouTube's developer
// policies allow keeping such data for 30 days at most, so older entries are dropped.
interface Seen {
  videoId: string;
  title: string;
  channel: string;
  seenAt: number;
}

const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 100;
const file = () => path.join(app.getPath('userData'), 'history.json');
let items: Seen[] | null = null;

function load(): Seen[] {
  if (!items) {
    try {
      const raw = JSON.parse(readFileSync(file(), 'utf8')) as unknown[];
      items = raw.filter(
        (s): s is Seen =>
          typeof s === 'object' &&
          s !== null &&
          isVideoId((s as Seen).videoId) &&
          typeof (s as Seen).title === 'string' &&
          typeof (s as Seen).channel === 'string' &&
          typeof (s as Seen).seenAt === 'number',
      );
    } catch {
      items = [];
    }
  }
  const cutoff = Date.now() - MAX_AGE;
  items = items.filter((s) => s.seenAt >= cutoff);
  return items;
}

export function getHistory(): StreamItem[] {
  return load().map((s) => ({ videoId: s.videoId, title: s.title, channel: s.channel, live: 'unknown' }));
}

export async function rememberStream(videoId: unknown): Promise<void> {
  if (typeof videoId !== 'string' || !isVideoId(videoId) || !getSettings().watchHistory) return;
  const info = await getVideoInfo(videoId);
  if (!info) return;
  const next = [{ videoId, ...info, seenAt: Date.now() }, ...load().filter((s) => s.videoId !== videoId)];
  items = next.slice(0, MAX_ITEMS);
  try {
    writeFileSync(file(), JSON.stringify(items));
  } catch {
    // Suggestions are a convenience; a failed write loses nothing important.
  }
}

export function clearSeen(): void {
  items = [];
  try {
    writeFileSync(file(), '[]');
  } catch {
    // nothing kept to clear
  }
}
