import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../shared/ipc';
import { MINI_DEFAULT, MINI_MIN } from '../shared/layouts';
import { isVideoId } from '../shared/youtube';
import { mainWindow, onMainWindowChange, pageUrl, pageWindowOptions } from './main-window';
import { forwardWindowChanges } from './window-ipc';

// Streams popped out of the grid into windows of their own (for a second screen). Each window is a
// page with one player, at least 200 x 200 px. Sound comes from one place at a time: the grid or one
// of these windows (the "audio owner"), which this module tells every window.

const MAX = 4;
const windows = new Map<string, BrowserWindow>();
let owner = 'grid';
const listeners = new Set<() => void>();

export const popoutCount = (): number => windows.size;
export function onPopoutsChange(listener: () => void): void {
  listeners.add(listener);
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.audioOwnerChanged, owner);
}

function claim(who: string): void {
  if (who === owner) return;
  owner = who;
  broadcast();
}

function open(videoId: string, live: boolean): void {
  const known = windows.get(videoId);
  if (known) return known.focus();
  if (windows.size >= MAX) return;
  const win = new BrowserWindow({
    ...pageWindowOptions(),
    width: MINI_DEFAULT.width * 1.4,
    height: MINI_DEFAULT.height * 1.4,
    useContentSize: true,
    minWidth: MINI_MIN.width,
    minHeight: MINI_MIN.height,
  });
  windows.set(videoId, win);
  forwardWindowChanges(win);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    windows.delete(videoId);
    mainWindow()?.webContents.send(IPC.popoutClosed, videoId);
    if (owner === videoId) claim('grid');
    for (const listener of listeners) listener();
  });
  void win.loadURL(pageUrl({ popout: videoId, ...(live ? { live: '1' } : {}) }));
}

export function registerPopoutIpc(): void {
  ipcMain.on(IPC.popoutOpen, (_e, id: unknown, live: unknown) => {
    if (typeof id === 'string' && isVideoId(id)) open(id, live === true);
  });
  ipcMain.on(IPC.popoutClose, (_e, id: unknown) => {
    if (typeof id === 'string') windows.get(id)?.close();
  });
  ipcMain.handle(IPC.audioOwner, () => owner);
  ipcMain.on(IPC.audioClaim, (_e, who: unknown) => {
    if (who === 'grid' || (typeof who === 'string' && isVideoId(who))) claim(who);
  });
  // The popped-out streams belong to the grid: they close with its window.
  onMainWindowChange(() => {
    if (mainWindow()) return;
    for (const win of windows.values()) win.close();
    claim('grid');
  });
}
