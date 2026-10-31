import { app, clipboard, ipcMain } from 'electron';
import { IPC } from '../shared/ipc';
import { SHARE_SCHEME, type SharedLayout, linkInArgs, parseLayoutLink } from '../shared/share';
import { sendCommand } from './main-window';

// splitwatch:// layout links. The installed app registers the scheme: on Windows here (the user's
// registry), on macOS and Linux through the package (Info.plist, the .desktop file). A development
// build does not, so it never takes the link over from the installed app. The page asks before it
// opens a shared layout.

let ready = false;
const early: SharedLayout[] = [];

function open(raw: string | null): void {
  const layout = parseLayoutLink(raw);
  if (!layout) return;
  if (ready) sendCommand({ type: 'sharedLayout', layout });
  else early.push(layout);
}

// macOS reports a link that started the app before the app is ready.
export function listenForLinks(): void {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    open(url);
  });
}

export function setupLinks(): void {
  if (app.isPackaged) app.setAsDefaultProtocolClient(SHARE_SCHEME);
  ready = true;
  for (const layout of early.splice(0)) sendCommand({ type: 'sharedLayout', layout });
  open(linkInArgs(process.argv));
  ipcMain.on(IPC.copyText, (_e, text: unknown) => {
    if (typeof text === 'string' && text.length <= 2000) clipboard.writeText(text);
  });
}

// Windows and Linux start a second instance with the link; it comes here instead.
export function linkFromSecondInstance(args: readonly string[]): boolean {
  const link = linkInArgs(args);
  if (link) open(link);
  return link !== null;
}
