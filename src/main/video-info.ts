import { net } from 'electron';
import type { VideoInfo } from '../shared/ipc';
import { isVideoId, watchUrl } from '../shared/youtube';

// Title and channel from YouTube's oEmbed endpoint: public, keyless, no API quota.
const cache = new Map<string, VideoInfo | null>();

export async function getVideoInfo(videoId: unknown): Promise<VideoInfo | null> {
  if (typeof videoId !== 'string' || !isVideoId(videoId)) return null;
  if (cache.has(videoId)) return cache.get(videoId)!;
  try {
    const res = await net.fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(videoId))}`,
    );
    const info = res.ok ? parse(await res.json()) : null;
    // 400, 401 and 404 are answers about the video; other failures are worth a later retry.
    if (res.ok || [400, 401, 403, 404].includes(res.status)) cache.set(videoId, info);
    return info;
  } catch {
    return null;
  }
}

function parse(data: unknown): VideoInfo | null {
  if (typeof data !== 'object' || data === null) return null;
  const { title, author_name: channel } = data as { title?: unknown; author_name?: unknown };
  if (typeof title !== 'string' || !title) return null;
  return { title: title.slice(0, 300), channel: typeof channel === 'string' ? channel.slice(0, 200) : '' };
}
