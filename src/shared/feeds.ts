// Channel feeds: https://www.youtube.com/feeds/videos.xml?channel_id=UC… is a public Atom feed of a
// channel's latest 15 videos (scheduled and live streams included). It costs no API quota.
import { isVideoId } from './youtube';

export interface FeedEntry {
  videoId: string;
  title: string;
  channelId: string;
  channel: string;
  published: string;
}

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export function isChannelId(value: string): boolean {
  return CHANNEL_ID.test(value);
}

export function feedUrl(channelId: string, base = 'https://www.youtube.com'): string {
  return `${base}/feeds/videos.xml?channel_id=${channelId}`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

function tag(block: string, name: string): string | null {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  return match ? decode(match[1]!.trim()) : null;
}

// Reads the entries of a channel feed. Anything that does not look like a valid entry is skipped.
export function parseFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  for (const [, block] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const videoId = tag(block!, 'yt:videoId');
    const channelId = tag(block!, 'yt:channelId');
    const author = /<author>([\s\S]*?)<\/author>/.exec(block!)?.[1] ?? '';
    if (!videoId || !isVideoId(videoId) || !channelId || !isChannelId(channelId)) continue;
    entries.push({
      videoId,
      channelId,
      title: (tag(block!, 'title') ?? '').slice(0, 300),
      channel: (tag(author, 'name') ?? '').slice(0, 200),
      published: tag(block!, 'published') ?? '',
    });
  }
  return entries;
}
