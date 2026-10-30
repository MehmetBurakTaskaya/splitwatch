import { MAX_SAVED_LAYOUTS, type SavedLayout, layoutName } from '../../shared/settings';
import { setPrefs, usePrefs } from './prefs';
import { useSession } from './session';

// Saved layouts live in the settings file, newest first.

export type SaveResult = 'saved' | 'replaced' | 'empty' | 'full' | 'invalid';
export type RenameResult = 'renamed' | 'taken' | 'invalid';

const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');

const sameName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

function only<T>(record: Record<string, T>, ids: string[]): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => ids.includes(id)));
}

// Saves the grid as it is; a layout with the same name (in any case) is replaced.
export function saveLayout(rawName: string): SaveResult {
  const name = layoutName(rawName);
  if (!name) return 'invalid';
  const { layout, streams, selected, volumes, sports } = useSession.getState();
  if (!streams.length) return 'empty';
  const layouts = usePrefs.getState().layouts;
  const same = layouts.find((l) => sameName(l.name, name));
  if (!same && layouts.length >= MAX_SAVED_LAYOUTS) return 'full';
  const entry: SavedLayout = {
    id: same?.id ?? newId(),
    name,
    layout,
    streams,
    selected,
    volumes: only(volumes, streams),
    sports: only(sports, streams),
  };
  setPrefs({ layouts: [entry, ...layouts.filter((l) => l !== same)] });
  return same ? 'replaced' : 'saved';
}

export function openLayout(id: string): void {
  const entry = usePrefs.getState().layouts.find((l) => l.id === id);
  if (entry) useSession.getState().open(entry);
}

export function renameLayout(id: string, rawName: string): RenameResult {
  const name = layoutName(rawName);
  if (!name) return 'invalid';
  const layouts = usePrefs.getState().layouts;
  if (layouts.some((l) => l.id !== id && sameName(l.name, name))) return 'taken';
  setPrefs({ layouts: layouts.map((l) => (l.id === id ? { ...l, name } : l)) });
  return 'renamed';
}

// Returns what Undo needs.
export function deleteLayout(id: string): { entry: SavedLayout; index: number } | null {
  const layouts = usePrefs.getState().layouts;
  const index = layouts.findIndex((l) => l.id === id);
  if (index < 0) return null;
  setPrefs({ layouts: layouts.filter((l) => l.id !== id) });
  return { entry: layouts[index]!, index };
}

export function restoreLayout({ entry, index }: { entry: SavedLayout; index: number }): void {
  const layouts = usePrefs.getState().layouts.filter((l) => l.id !== entry.id);
  if (layouts.length >= MAX_SAVED_LAYOUTS) return;
  setPrefs({ layouts: [...layouts.slice(0, index), entry, ...layouts.slice(index)] });
}
