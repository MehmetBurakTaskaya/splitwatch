import { type LayoutId, MAX_STREAMS, isLayoutId, layoutById, layoutFor } from './layouts';
import { layoutName } from './settings';
import { isVideoId } from './youtube';

// Layout links: splitwatch://layout?l=4&v=ID,ID&s=swimming,&n=Name opens a grid in Splitwatch,
// after the user agrees. Links come from anywhere, so every part is checked and anything unknown
// is left out.

export const SHARE_SCHEME = 'splitwatch';

export interface SharedLayout {
  name: string | null;
  layout: LayoutId;
  streams: string[];
  sports: Record<string, string>;
}

const SLUG = /^[a-z][a-z0-9-]{1,40}$/;

export function layoutLink(shared: SharedLayout): string {
  const params = new URLSearchParams({ l: shared.layout, v: shared.streams.join(',') });
  if (Object.keys(shared.sports).length) params.set('s', shared.streams.map((id) => shared.sports[id] ?? '').join(','));
  if (shared.name) params.set('n', shared.name);
  return `${SHARE_SCHEME}://layout?${params}`;
}

export function parseLayoutLink(raw: unknown): SharedLayout | null {
  if (typeof raw !== 'string' || raw.length > 2000) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${SHARE_SCHEME}:` || url.hostname !== 'layout') return null;
  const ids = (url.searchParams.get('v') ?? '').split(',');
  const sports = (url.searchParams.get('s') ?? '').split(',');
  const streams: string[] = [];
  const sportOf: Record<string, string> = {};
  for (const [i, id] of ids.entries()) {
    if (!isVideoId(id) || streams.includes(id) || streams.length === MAX_STREAMS) continue;
    streams.push(id);
    const sport = sports[i];
    if (sport && SLUG.test(sport)) sportOf[id] = sport;
  }
  if (!streams.length) return null;
  const asked = url.searchParams.get('l');
  const layout = isLayoutId(asked) && layoutById(asked).capacity >= streams.length ? asked : layoutFor(streams.length);
  return { name: layoutName(url.searchParams.get('n')), layout, streams, sports: sportOf };
}

// The link in a command line (Windows and Linux pass it as an argument).
export function linkInArgs(args: readonly string[]): string | null {
  return args.find((a) => a.startsWith(`${SHARE_SCHEME}://`)) ?? null;
}
