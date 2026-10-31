import type { StreamItem } from '../../shared/ipc';
import type { ReadyList } from '../../shared/ready-lists';
import { themeById } from '../theme/engine';
import { usePrefs } from './prefs';
import { useSession } from './session';
import { refreshLiveNow, setSuggestedSports } from './youtube';

// Ready lists in the grid (ADR 0014). Opening one fills the grid like a saved layout; the list is
// not kept, so removing or adding streams afterwards changes the grid only. A stream of the list that
// cannot play here gives its place to the next candidate.

// Player errors of a video that cannot play here: removed or private (100), or not allowed in
// embedded players (101, 150).
const UNPLAYABLE = new Set([100, 101, 150]);

let spare: StreamItem[] = [];
let fromList = new Set<string>();

export function openReadyList(list: ReadyList): void {
  const streams = list.items.map((i) => i.videoId);
  if (!list.layout || !streams.length) return;
  useSession.getState().open({
    layout: list.layout,
    streams,
    selected: streams[0]!,
    volumes: {},
    sports: Object.fromEntries(list.items.flatMap((i) => (i.sport ? [[i.videoId, i.sport]] : []))),
  });
  spare = [...list.spare];
  fromList = new Set(streams);
}

function replaceUnplayable(): void {
  const { streams, status } = useSession.getState();
  for (const id of streams) {
    const s = status[id];
    if (!fromList.has(id) || s?.state !== 'error' || !UNPLAYABLE.has(s.error ?? -1)) continue;
    fromList.delete(id);
    const next = spare.find((c) => !streams.includes(c.videoId));
    if (!next) continue;
    spare = spare.filter((c) => c !== next);
    fromList.add(next.videoId);
    // The change runs this again for any other stream that failed.
    useSession.getState().replace(id, next.videoId, next.sport);
    return;
  }
}

// The sports of the theme the user picked, or null with Automatic, the neutral theme or an own theme.
function themeSports(): string[] | null {
  const theme = usePrefs.getState().theme;
  if (theme === 'auto') return null;
  const sports = themeById(theme).sports;
  return sports.length ? [...sports] : null;
}

// The sport a ready list starts with: the picked theme's.
export const themeSport = (): string | null => themeSports()?.[0] ?? null;

export function connectReadyLists(): void {
  useSession.subscribe((s, prev) => {
    if (s.status !== prev.status) replaceUnplayable();
  });
  // A sport's theme also picks the sport that "Live now" suggests on the start screen.
  setSuggestedSports(themeSports);
  usePrefs.subscribe((s, prev) => {
    if (s.theme !== prev.theme) void refreshLiveNow();
  });
}
