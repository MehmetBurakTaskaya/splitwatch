// YouTube video IDs are 11 characters from [A-Za-z0-9_-].
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com']);
const PATH_PREFIXES = ['/live/', '/embed/', '/shorts/', '/v/', '/e/'];

export function isVideoId(value: string): boolean {
  return ID.test(value);
}

// Accepts a bare ID or any common YouTube link (watch, youtu.be, live, embed, shorts) and returns
// the video ID, or null.
export function parseVideoId(input: string): string | null {
  const text = input.trim();
  if (isVideoId(text)) return text;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (HOSTS.has(host) || host.endsWith('.youtube-nocookie.com')) {
    if (url.pathname === '/watch') candidate = url.searchParams.get('v');
    else {
      const prefix = PATH_PREFIXES.find((p) => url.pathname.startsWith(p));
      if (prefix) candidate = url.pathname.slice(prefix.length).split('/')[0] ?? null;
    }
  }
  return candidate && isVideoId(candidate) ? candidate : null;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
