// Reading YouTube Data API v3 responses. Pure functions, so the unit tests can feed them fixtures.
import type { ApiFailure, LiveState, StreamItem } from './ipc';
import { isVideoId } from './youtube';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');

function liveState(value: unknown): LiveState {
  return value === 'live' || value === 'upcoming' || value === 'none' ? value : 'unknown';
}

// search.list with part=snippet: one item per video, its live state in snippet.liveBroadcastContent.
export function readSearch(data: unknown): StreamItem[] {
  if (!isRecord(data) || !Array.isArray(data.items)) return [];
  const items: StreamItem[] = [];
  for (const item of data.items) {
    if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) continue;
    const videoId = item.id.videoId;
    if (typeof videoId !== 'string' || !isVideoId(videoId)) continue;
    items.push({
      videoId,
      title: str(item.snippet.title),
      channel: str(item.snippet.channelTitle, 200),
      live: liveState(item.snippet.liveBroadcastContent),
    });
  }
  return items;
}

export interface VideoFacts extends StreamItem {
  embeddable: boolean;
}

// videos.list with part=snippet,liveStreamingDetails,status.
export function readVideos(data: unknown): VideoFacts[] {
  if (!isRecord(data) || !Array.isArray(data.items)) return [];
  const out: VideoFacts[] = [];
  for (const item of data.items) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isVideoId(item.id)) continue;
    const snippet = isRecord(item.snippet) ? item.snippet : {};
    const details = isRecord(item.liveStreamingDetails) ? item.liveStreamingDetails : {};
    const status = isRecord(item.status) ? item.status : {};
    const scheduled = str(details.scheduledStartTime, 40);
    out.push({
      videoId: item.id,
      title: str(snippet.title),
      channel: str(snippet.channelTitle, 200),
      live: liveState(snippet.liveBroadcastContent),
      ...(scheduled ? { scheduledStart: scheduled } : {}),
      embeddable: status.embeddable !== false,
    });
  }
  return out;
}

// Error responses: { error: { code, message, errors: [{ reason }], status } }.
export function readFailure(status: number, body: unknown): { reason: ApiFailure; quota: boolean } {
  const error = isRecord(body) && isRecord(body.error) ? body.error : {};
  const reasons = [
    ...(Array.isArray(error.errors) ? error.errors.map((e) => (isRecord(e) ? str(e.reason, 80) : '')) : []),
    str(error.status, 80),
  ];
  const has = (...names: string[]) => reasons.some((r) => names.includes(r));
  if (has('quotaExceeded', 'dailyLimitExceeded', 'RESOURCE_EXHAUSTED')) return { reason: 'quota', quota: true };
  if (has('keyInvalid', 'API_KEY_INVALID', 'keyExpired') || (status === 400 && /API key/i.test(str(error.message))))
    return { reason: 'invalid-key', quota: false };
  if (has('accessNotConfigured', 'SERVICE_DISABLED')) return { reason: 'api-disabled', quota: false };
  return { reason: 'error', quota: false };
}
