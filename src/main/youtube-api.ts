import { app, net } from 'electron';
import type { ApiFailure, KeyState, StreamItem } from '../shared/ipc';
import type { QuotaBucket } from '../shared/quota';
import { type VideoFacts, readFailure, readSearch, readVideos } from '../shared/youtube-data';
import { loadKey } from './key-store';
import { reportExhausted, trySpend } from './quota-store';

// YouTube Data API v3, called only from the main process: the key never reaches the page.
const DEFAULT_BASE = 'https://www.googleapis.com/youtube/v3';
// Development and test runs only: a local stand-in for the API.
const base = () => (!app.isPackaged && process.env.SPLITWATCH_YOUTUBE_API_BASE) || DEFAULT_BASE;

let keyState: KeyState | null = null;
const keyListeners = new Set<() => void>();

export function currentKeyState(): KeyState | null {
  return keyState;
}

export function setKeyState(state: KeyState): void {
  if (state === keyState) return;
  keyState = state;
  for (const listener of keyListeners) listener();
}

export function onKeyStateChange(listener: () => void): void {
  keyListeners.add(listener);
}

type Result<T> = { ok: true; data: T } | { ok: false; reason: ApiFailure };

async function call(
  endpoint: 'search' | 'videos',
  params: Record<string, string>,
  bucket: QuotaBucket,
  options: { background?: boolean; key?: string } = {},
): Promise<Result<unknown>> {
  const key = options.key ?? (await loadKey());
  if (!key) return { ok: false, reason: 'no-key' };
  // Every request counts, failed ones too, so the cost is booked before it is sent.
  if (!trySpend(bucket, 1, options.background ?? false)) return { ok: false, reason: 'quota' };
  const url = `${base()}/${endpoint}?${new URLSearchParams({ ...params, key })}`;
  let res: Response;
  try {
    res = await net.fetch(url, { headers: { accept: 'application/json' } });
  } catch {
    return { ok: false, reason: 'network' };
  }
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) {
    if (!options.key) setKeyState('valid');
    return { ok: true, data: body };
  }
  const failure = readFailure(res.status, body);
  if (failure.quota) reportExhausted(bucket);
  if (failure.reason === 'invalid-key' && !options.key) setKeyState('invalid');
  return { ok: false, reason: failure.reason };
}

// Live streams that can be embedded. One call from the Search Queries bucket.
export async function searchLive(query: string): Promise<Result<StreamItem[]>> {
  const result = await call(
    'search',
    { part: 'snippet', type: 'video', eventType: 'live', videoEmbeddable: 'true', maxResults: '25', q: query },
    'searches',
  );
  return result.ok ? { ok: true, data: readSearch(result.data) } : result;
}

// Live state, schedule and embeddability of up to 50 videos per call, 1 unit each call.
export async function videoFacts(ids: string[], background: boolean): Promise<Result<VideoFacts[]>> {
  const facts: VideoFacts[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const result = await call(
      'videos',
      { part: 'snippet,liveStreamingDetails,status', id: ids.slice(i, i + 50).join(','), maxResults: '50' },
      'units',
      { background },
    );
    if (!result.ok) return result;
    facts.push(...readVideos(result.data));
  }
  return { ok: true, data: facts };
}

// Checks a key with the cheapest call there is (1 unit).
export async function testKey(key: string): Promise<Result<true>> {
  const result = await call('videos', { part: 'id', id: 'M7lc1UVf-VE' }, 'units', { key });
  return result.ok ? { ok: true, data: true } : result;
}
