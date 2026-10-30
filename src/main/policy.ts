// Pure security rules, kept free of Electron imports so the unit tests can load them.
import path from 'node:path';
import { APP_HOST, APP_SCHEME } from '../shared/app';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://www.youtube.com",
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "img-src 'self' data: https://i.ytimg.com https://yt3.ggpht.com",
  "style-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

// Permissions a page or a YouTube player may get; everything else is refused.
export const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set(['fullscreen']);

// Hosts that links may open in the user's browser.
const EXTERNAL_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'github.com',
  'console.cloud.google.com',
]);

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && EXTERNAL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

// Maps an app:// URL to a file inside root, or null for anything outside it.
export function resolveAppFile(root: string, url: string): string | null {
  let u: URL;
  let rel: string;
  try {
    u = new URL(url);
    rel = decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
  if (u.protocol !== `${APP_SCHEME}:` || u.host !== APP_HOST) return null;
  const file = path.resolve(root, rel.replace(/^\/+/, '') || 'index.html');
  return file.startsWith(path.resolve(root) + path.sep) ? file : null;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export function mimeTypeOf(file: string): string {
  return MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}
