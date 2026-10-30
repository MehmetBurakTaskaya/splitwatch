import { readFile } from 'node:fs/promises';
import { protocol } from 'electron';
import { APP_SCHEME } from '../shared/app';
import { CONTENT_SECURITY_POLICY, mimeTypeOf, resolveAppFile } from './policy';

// Must run before the app is ready.
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

// Serves the renderer from root (inside app.asar when packaged), with the CSP as a response header.
export function serveApp(root: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveAppFile(root, request.url);
    if (!file) return new Response('Not found', { status: 404 });
    try {
      const body = await readFile(file);
      return new Response(body, {
        headers: {
          'content-type': mimeTypeOf(file),
          'content-security-policy': CONTENT_SECURITY_POLICY,
          'x-content-type-options': 'nosniff',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}
