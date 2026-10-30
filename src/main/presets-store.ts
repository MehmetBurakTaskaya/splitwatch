import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app, net } from 'electron';
import { type Preset, validateIndex, validatePreset } from '../shared/presets';

// The presets shipped with the app, refreshed once a day from the repository on GitHub, so new
// channels need no new release. A fetched set replaces the shipped one only if every file is valid.
const shipped: Preset[] = Object.values(
  import.meta.glob('../../presets/*.json', { eager: true, import: 'default' }) as Record<string, unknown>,
)
  .map(validatePreset)
  .filter((p): p is Preset => p !== null);

const REMOTE = 'https://raw.githubusercontent.com/MehmetBurakTaskaya/splitwatch/main/presets';
const DAY = 24 * 60 * 60 * 1000;
const file = () => path.join(app.getPath('userData'), 'presets-cache.json');
let current: Preset[] | null = null;

export function getPresets(): Preset[] {
  if (!current) {
    current = shipped;
    try {
      const cache = JSON.parse(readFileSync(file(), 'utf8')) as { presets?: unknown[] };
      const presets = (cache.presets ?? []).map(validatePreset);
      if (presets.length && presets.every((p) => p !== null)) current = presets as Preset[];
    } catch {
      // No cache yet: the shipped presets stay.
    }
  }
  return current;
}

export async function refreshPresets(): Promise<void> {
  if (!app.isPackaged && process.env.SPLITWATCH_NO_REMOTE_PRESETS) return;
  try {
    const cache = JSON.parse(readFileSync(file(), 'utf8')) as { fetchedAt?: number };
    if (typeof cache.fetchedAt === 'number' && Date.now() - cache.fetchedAt < DAY) return;
  } catch {
    // No cache: fetch now.
  }
  try {
    const index = validateIndex(await fetchJson(`${REMOTE}/index.json`));
    if (!index) return;
    const presets = (await Promise.all(index.presets.map((name) => fetchJson(`${REMOTE}/${name}.json`)))).map(
      validatePreset,
    );
    if (!presets.length || presets.some((p) => p === null)) return;
    current = presets as Preset[];
    writeFileSync(file(), JSON.stringify({ fetchedAt: Date.now(), presets: current }));
  } catch {
    // Offline or GitHub unreachable: keep what we have.
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await net.fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
