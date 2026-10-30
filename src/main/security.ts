import { type Session, type WebContents, shell } from 'electron';
import { APP_ORIGIN, YOUTUBE_REFERER, YOUTUBE_URL_PATTERNS } from '../shared/app';
import { ALLOWED_PERMISSIONS, isAllowedExternalUrl } from './policy';

export function hardenSession(ses: Session): void {
  ses.setPermissionRequestHandler((_contents, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission)));
  ses.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));
  // Identify the app to YouTube the documented way, on YouTube requests only.
  ses.webRequest.onBeforeSendHeaders({ urls: YOUTUBE_URL_PATTERNS }, (details, callback) => {
    details.requestHeaders.Referer = YOUTUBE_REFERER;
    callback({ requestHeaders: details.requestHeaders });
  });
}

// The app never navigates away from itself; links to YouTube and GitHub open in the browser.
export function hardenWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
}
