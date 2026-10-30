import { BrowserWindow, app, ipcMain, net, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { RELEASES_URL, REPOSITORY } from '../shared/app';
import { IPC, type UpdateState } from '../shared/ipc';
import { isNewerVersion } from '../shared/version';

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
  if (process.platform === 'darwin') void checkGitHub();
  else checkWithUpdater();
}

// Windows (NSIS): electron-updater downloads from GitHub Releases and installs on restart.
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

// macOS: Squirrel.Mac only updates code-signed apps, so the app looks up the latest release
// and offers the download instead.
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
