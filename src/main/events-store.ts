import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app, net } from 'electron';
import { type GamesEvent, validateEvent, validateEventIndex } from '../shared/events';

// The events shipped with the app, refreshed once a day from the repository on GitHub (like the
// presets), so a schedule or a medal table page arrives without a release. A fetched set replaces
// the shipped one only if every file is valid.
const shipped: GamesEvent[] = Object.values(
  import.meta.glob(['../../events/*.json', '!../../events/index.json', '!../../events/schema.json'], {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>,
)
  .map(validateEvent)
  .filter((e): e is GamesEvent => e !== null);

const REMOTE = 'https://raw.githubusercontent.com/MehmetBurakTaskaya/splitwatch/main/events';
const DAY = 24 * 60 * 60 * 1000;
const file = () => path.join(app.getPath('userData'), 'events-cache.json');
let current: GamesEvent[] | null = null;

export function getEvents(): GamesEvent[] {
  if (!current) {
    current = shipped;
    try {
      const cache = JSON.parse(readFileSync(file(), 'utf8')) as { events?: unknown[] };
      const events = (cache.events ?? []).map(validateEvent);
      if (events.length && events.every((e) => e !== null)) current = events as GamesEvent[];
    } catch {
      // No cache yet: the shipped events stay.
    }
  }
  return current;
}

export async function refreshEvents(): Promise<void> {
  if (!app.isPackaged && process.env.SPLITWATCH_NO_REMOTE_PRESETS) return;
  try {
    const cache = JSON.parse(readFileSync(file(), 'utf8')) as { fetchedAt?: number };
    if (typeof cache.fetchedAt === 'number' && Date.now() - cache.fetchedAt < DAY) return;
  } catch {
    // No cache: fetch now.
  }
  try {
    const index = validateEventIndex(await fetchJson(`${REMOTE}/index.json`));
    if (!index) return;
    const events = (await Promise.all(index.events.map((name) => fetchJson(`${REMOTE}/${name}.json`)))).map(
      validateEvent,
    );
    if (!events.length || events.some((e) => e === null)) return;
    current = events as GamesEvent[];
    writeFileSync(file(), JSON.stringify({ fetchedAt: Date.now(), events: current }));
  } catch {
    // Offline or GitHub unreachable: keep what we have.
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await net.fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
