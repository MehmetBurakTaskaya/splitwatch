import { BrowserWindow, type IpcMainEvent, clipboard, ipcMain, nativeTheme, screen } from 'electron';
import { IPC } from '../shared/ipc';
import { parseVideoId } from '../shared/youtube';
import { getSettings, saveSettings } from './settings-store';
import { getVideoInfo } from './video-info';

const windowOf = (e: IpcMainEvent) => BrowserWindow.fromWebContents(e.sender);

// Light or dark for the whole app, including the window frame and the page's prefers-color-scheme.
export function applyColorScheme(): void {
  const scheme = getSettings().colorScheme;
  if (nativeTheme.themeSource !== scheme) nativeTheme.themeSource = scheme;
}

export function registerAppIpc(): void {
  ipcMain.handle(IPC.settingsGet, () => getSettings());
  ipcMain.on(IPC.settingsSave, (_e, patch: unknown) => {
    saveSettings(patch);
    applyColorScheme();
  });
  ipcMain.handle(IPC.videoInfo, (_e, videoId: unknown) => getVideoInfo(videoId));

  // The clipboard is read only when the renderer asks (when the window gains focus), only if the
  // user has the suggestion on, and only a YouTube video ID leaves this function.
  ipcMain.handle(IPC.clipboardVideo, async () =>
    getSettings().clipboardSuggestions ? parseVideoId((await clipboard.readText()).slice(0, 2000)) : null,
  );

  // Keeps every player at least 200 x 200 px (YouTube's minimum), within the screen's work area.
  ipcMain.on(IPC.windowMinSize, (e, size: unknown) => {
    const win = windowOf(e);
    if (!win || !isSize(size)) return;
    const [outerW, outerH] = win.getSize();
    const [innerW, innerH] = win.getContentSize();
    const frameW = outerW! - innerW!;
    const frameH = outerH! - innerH!;
    const area = screen.getDisplayMatching(win.getBounds()).workAreaSize;
    const width = Math.min(Math.ceil(size.width) + frameW, area.width);
    const height = Math.min(Math.ceil(size.height) + frameH, area.height);
    win.setMinimumSize(width, height);
    if (!win.isFullScreen() && (outerW! < width || outerH! < height)) {
      win.setSize(Math.max(outerW!, width), Math.max(outerH!, height));
    }
  });

  ipcMain.on(IPC.windowFullscreen, (e, on: unknown) => windowOf(e)?.setFullScreen(on === true));
}

export function forwardFullscreenChanges(win: BrowserWindow): void {
  win.on('enter-full-screen', () => win.webContents.send(IPC.fullscreenChanged, true));
  win.on('leave-full-screen', () => win.webContents.send(IPC.fullscreenChanged, false));
}

function isSize(v: unknown): v is { width: number; height: number } {
  if (typeof v !== 'object' || v === null) return false;
  const { width, height } = v as { width?: unknown; height?: unknown };
  return (
    typeof width === 'number' &&
    typeof height === 'number' &&
    width > 0 &&
    height > 0 &&
    width < 10000 &&
    height < 10000
  );
}
