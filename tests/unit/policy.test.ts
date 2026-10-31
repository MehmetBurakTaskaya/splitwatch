import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALLOWED_PERMISSIONS,
  CONTENT_SECURITY_POLICY,
  chatSignInTarget,
  isAllowedExternalUrl,
  mimeTypeOf,
  resolveAppFile,
} from '../../src/main/policy';

const root = path.resolve('dist/renderer');

describe('app:// file resolution', () => {
  it('maps the app origin to files in the renderer folder', () => {
    expect(resolveAppFile(root, 'app://splitwatch/')).toBe(path.join(root, 'index.html'));
    expect(resolveAppFile(root, 'app://splitwatch/assets/index.js')).toBe(path.join(root, 'assets', 'index.js'));
  });

  it('refuses other hosts, other schemes and paths outside the folder', () => {
    expect(resolveAppFile(root, 'app://other/index.html')).toBeNull();
    expect(resolveAppFile(root, 'https://splitwatch/index.html')).toBeNull();
    expect(resolveAppFile(root, 'app://splitwatch/..%2F..%2Fpackage.json')).toBeNull();
    expect(resolveAppFile(root, 'app://splitwatch/%E0%A4%A')).toBeNull();
  });

  it('sends known types with the right MIME type', () => {
    expect(mimeTypeOf('a/index.html')).toBe('text/html; charset=utf-8');
    expect(mimeTypeOf('a/x.unknown')).toBe('application/octet-stream');
  });
});

describe('security policy', () => {
  it('has a strict content security policy', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-inline');
  });

  it('opens only https links to YouTube, GitHub and the Google Cloud Console in the browser', () => {
    expect(isAllowedExternalUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE')).toBe(true);
    expect(isAllowedExternalUrl('https://github.com/MehmetBurakTaskaya/splitwatch/releases')).toBe(true);
    expect(isAllowedExternalUrl('https://console.cloud.google.com/apis/credentials')).toBe(true);
    expect(isAllowedExternalUrl('http://www.youtube.com/')).toBe(false);
    expect(isAllowedExternalUrl('https://example.com/')).toBe(false);
    expect(isAllowedExternalUrl('file:///C:/Windows')).toBe(false);
    expect(isAllowedExternalUrl('not a url')).toBe(false);
  });

  it("turns the live chat's sign-in into the stream's chat in the browser", () => {
    const signIn = (next: string, host = 'www.youtube.com') =>
      `https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=${encodeURIComponent(
        `https://${host}/signin?action_handle_signin=true&app=desktop&next=${encodeURIComponent(next)}`,
      )}`;
    expect(chatSignInTarget(signIn('/watch?v=M7lc1UVf-VE'))).toBe(
      'https://www.youtube.com/live_chat?is_popout=1&v=M7lc1UVf-VE',
    );
    expect(chatSignInTarget(signIn('/watch?v=not-an-id'))).toBeNull();
    expect(chatSignInTarget(signIn('/watch?v=M7lc1UVf-VE', 'example.com'))).toBeNull();
    expect(chatSignInTarget('https://example.com/ServiceLogin?continue=https://www.youtube.com/')).toBeNull();
    expect(chatSignInTarget('https://accounts.google.com/ServiceLogin')).toBeNull();
    expect(chatSignInTarget('not a url')).toBeNull();
  });

  it('grants fullscreen only', () => {
    expect([...ALLOWED_PERMISSIONS]).toEqual(['fullscreen']);
  });
});
