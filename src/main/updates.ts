import { existsSync } from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app, ipcMain, net, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { PRODUCT_NAME, RELEASES_URL, REPOSITORY } from '../shared/app';
import { IPC, type UpdateState } from '../shared/ipc';
import { isNewerVersion } from '../shared/version';
import { getSettings, onSettingsChange } from './settings-store';

let state: UpdateState = { status: 'idle' };

function publish(next: UpdateState): void {
  state = next;
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.updateState, next);
}

export function setupUpdates(): void {
  ipcMain.handle(IPC.updateState, () => state);
  ipcMain.handle(IPC.updateInstall, () => {
    if (state.status === 'ready') autoUpdater.quitAndInstall();
  });
  ipcMain.handle(IPC.openReleasePage, () => shell.openExternal(`${RELEASES_URL}/latest`));

  if (!app.isPackaged || process.env.SPLITWATCH_NO_UPDATES) return;
  // The check can be turned off in Settings; turning it back on checks at once.
  if (getSettings().checkUpdates) check();
  onSettingsChange((s, before) => {
    if (s.checkUpdates && !before.checkUpdates && state.status === 'idle') check();
  });
}

function check(): void {
  if (canUpdateItself()) checkWithUpdater();
  else void checkGitHub();
}

// The Windows installer's copy and the Linux AppImage update themselves. A portable Windows copy
// (from the ZIP, with no uninstaller next to it), a Linux build run outside its AppImage and macOS
// (Squirrel.Mac needs a signed app) offer the download instead.
function canUpdateItself(): boolean {
  if (process.platform === 'win32') {
    return existsSync(path.join(path.dirname(process.execPath), `Uninstall ${PRODUCT_NAME}.exe`));
  }
  return process.platform === 'linux' && !!process.env.APPIMAGE;
}

// Windows (NSIS) and Linux (AppImage): electron-updater downloads from GitHub Releases and installs
// on restart.
function checkWithUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => publish({ status: 'checking' }));
  autoUpdater.on('update-not-available', () => publish({ status: 'none' }));
  autoUpdater.on('update-available', (info) =>
    publish({ status: 'available', version: info.version, canInstall: true }),
  );
  autoUpdater.on('download-progress', (p) => publish({ status: 'downloading', progress: p.percent / 100 }));
  autoUpdater.on('update-downloaded', (info) => publish({ status: 'ready', version: info.version }));
  autoUpdater.on('error', () => publish({ status: 'error' }));
  autoUpdater.checkForUpdates().catch(() => publish({ status: 'error' }));
}

// Everywhere else: the app looks up the latest release and offers the download.
async function checkGitHub(): Promise<void> {
  publish({ status: 'checking' });
  try {
    const res = await net.fetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'Splitwatch' },
    });
    if (!res.ok) return publish({ status: 'none' });
    const { tag_name: tag } = (await res.json()) as { tag_name?: string };
    const latest = tag?.replace(/^v/, '');
    if (latest && isNewerVersion(latest, app.getVersion())) {
      publish({ status: 'available', version: latest, canInstall: false });
    } else {
      publish({ status: 'none' });
    }
  } catch {
    publish({ status: 'error' });
  }
}
