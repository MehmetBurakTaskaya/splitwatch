import { app, net } from 'electron';
import type { MedalTable } from '../shared/ipc';
import { parseMedalTable } from '../shared/medals';
import { getEvents } from './events-store';

// Reads an event's medal table from English Wikipedia, at most every ten minutes, in memory only.
const TTL = 10 * 60_000;
const cache = new Map<number, { at: number; table: MedalTable }>();
// Development and test runs only: a local stand-in for Wikipedia.
const base = () => (!app.isPackaged && process.env.SPLITWATCH_WIKIPEDIA_BASE) || 'https://en.wikipedia.org';

export async function medalTable(eventId: unknown): Promise<MedalTable | null> {
  const page = getEvents().find((e) => e.id === eventId)?.medalsPage;
  if (!page) return null;
  const hit = cache.get(page);
  if (hit && Date.now() - hit.at < TTL) return hit.table;
  try {
    const params = new URLSearchParams({
      action: 'parse',
      format: 'json',
      formatversion: '2',
      pageid: String(page),
      prop: 'wikitext',
    });
    const res = await net.fetch(`${base()}/w/api.php?${params}`, {
      headers: { 'user-agent': `Splitwatch/${app.getVersion()} (https://github.com/MehmetBurakTaskaya/splitwatch)` },
    });
    if (!res.ok) return hit?.table ?? null;
    const body = (await res.json()) as { parse?: { wikitext?: unknown } };
    const wikitext = typeof body.parse?.wikitext === 'string' ? body.parse.wikitext : '';
    const table: MedalTable = {
      rows: parseMedalTable(wikitext),
      url: `https://en.wikipedia.org/?curid=${page}`,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(page, { at: Date.now(), table });
    return table;
  } catch {
    return hit?.table ?? null;
  }
}
