import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  accessSync,
  constants,
  createWriteStream,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { BrowserWindow, app, ipcMain, net, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { PRODUCT_NAME, RELEASES_URL, REPOSITORY } from '../shared/app';
import { IPC, type UpdateState } from '../shared/ipc';
import {
  AFTER_FAILURE,
  CHECK_EVERY,
  FIRST_CHECK,
  type LatestFile,
  applyUpdateArgs,
  macScript,
  outOfUse,
  parseLatest,
} from '../shared/updates';
import { isNewerVersion } from '../shared/version';
import { markRestartHidden } from './login';
import { mainWindow, onMainWindowChange } from './main-window';
import { onPopoutsChange, popoutCount } from './popouts';
import { getSettings } from './settings-store';

// Updates are always on and install by themselves (ADR 0013). Splitwatch looks for a new version on
// GitHub 30 seconds after it starts and every 6 hours, downloads it, and installs it while nobody is
// watching: when the app closes, or at once while it waits in the tray with no window open, restarting
// there. "Update and restart" installs at once. The installed Windows copy and the Linux AppImage use
// electron-updater; the portable Windows copy and a Mac copy replace their own files with the checked
// download; a copy that cannot replace itself points to the download page.

type Way = 'updater' | 'portable' | 'mac' | 'page';

let state: UpdateState = { status: 'idle' };
let timer: NodeJS.Timeout | undefined;
// A portable or Mac update that is downloaded, checked and unpacked, waiting to be put in place.
let staged: { version: string; from: string; temp: string } | null = null;
let installing = false;

function publish(next: UpdateState): void {
  state = next;
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.updateState, next);
}

// Tests point the updates at a local server.
const base = () => process.env.SPLITWATCH_UPDATES_BASE ?? `https://github.com/${REPOSITORY}/releases/latest/download`;
const enabled = () => (app.isPackaged && !process.env.SPLITWATCH_NO_UPDATES) || !!process.env.SPLITWATCH_UPDATES_BASE;

function way(): Way {
  if (process.platform === 'win32') {
    const installed = existsSync(path.join(path.dirname(process.execPath), `Uninstall ${PRODUCT_NAME}.exe`));
    return installed ? 'updater' : 'portable';
  }
  if (process.platform === 'darwin') return 'mac';
  return process.env.APPIMAGE ? 'updater' : 'page';
}

const later = (ms: number) => {
  clearTimeout(timer);
  timer = setTimeout(() => void check(), ms);
};

export function setupUpdates(): void {
  ipcMain.handle(IPC.updateState, () => state);
  ipcMain.handle(IPC.updateCheck, () => check());
  ipcMain.handle(IPC.updateInstall, () => install(false));
  ipcMain.handle(IPC.openReleasePage, () => shell.openExternal(`${RELEASES_URL}/latest`));

  if (!enabled()) return;
  if (way() === 'updater') listenToUpdater();
  later(FIRST_CHECK);
  onMainWindowChange(installIfIdle);
  onPopoutsChange(installIfIdle);
  // A portable or Mac update waiting at quit goes in place once the app has closed, without a restart.
  app.on('will-quit', () => {
    if (staged && !installing) putInPlace(false, false);
  });
}

async function check(): Promise<void> {
  if (!enabled() || installing) return;
  if (state.status === 'checking' || state.status === 'downloading' || state.status === 'ready') {
    later(CHECK_EVERY);
    return;
  }
  publish({ status: 'checking' });
  try {
    const current = way();
    if (current === 'updater') {
      // The updater's events publish the outcome and plan the next check.
      await autoUpdater.checkForUpdates();
      return;
    }
    if (!staged) removeDownloads();
    const metadata =
      current === 'mac' ? 'latest-mac.yml' : current === 'portable' ? 'latest-portable.yml' : 'latest-linux.yml';
    const latest = parseLatest(await (await fetchOk(`${base()}/${metadata}`)).text());
    if (!latest) throw new Error('unreadable update metadata');
    if (!isNewerVersion(latest.version, app.getVersion())) {
      publish({ status: 'none', checkedAt: Date.now() });
    } else {
      const reason = current === 'page' ? 'download' : blocked(current);
      if (reason || current === 'page') {
        publish({ status: 'available', version: latest.version, canInstall: false, reason: reason ?? 'download' });
      } else {
        await stage(latest, current);
      }
    }
    later(CHECK_EVERY);
  } catch {
    publish({ status: 'error', checkedAt: Date.now() });
    later(AFTER_FAILURE);
  }
}

function listenToUpdater(): void {
  autoUpdater.autoDownload = true;
  // Closing the app installs a downloaded update silently.
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-not-available', () => {
    publish({ status: 'none', checkedAt: Date.now() });
    later(CHECK_EVERY);
  });
  autoUpdater.on('update-available', (info) =>
    publish({ status: 'available', version: info.version, canInstall: true }),
  );
  autoUpdater.on('download-progress', (p) => publish({ status: 'downloading', progress: p.percent / 100 }));
  autoUpdater.on('update-downloaded', (info) => {
    publish({ status: 'ready', version: info.version });
    installIfIdle();
  });
  autoUpdater.on('error', () => {
    publish({ status: 'error', checkedAt: Date.now() });
    later(AFTER_FAILURE);
  });
}

// Why this copy cannot replace itself, if it cannot: a Mac app opened where it was downloaded runs
// from a read-only copy (App Translocation) and has to be moved to Applications first; elsewhere the
// folder has to be writable.
function blocked(current: 'portable' | 'mac'): 'move' | 'download' | null {
  const target = current === 'mac' ? bundlePath() : path.dirname(process.execPath);
  if (current === 'mac' && target.includes('/AppTranslocation/')) return 'move';
  try {
    accessSync(target, constants.W_OK);
    accessSync(path.dirname(target), constants.W_OK);
    return null;
  } catch {
    return current === 'mac' ? 'move' : 'download';
  }
}

// .../Splitwatch.app/Contents/MacOS/Splitwatch
const bundlePath = () => path.resolve(process.execPath, '..', '..', '..');

async function fetchOk(url: string): Promise<Response> {
  const res = await net.fetch(url, { headers: { 'user-agent': 'Splitwatch' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res;
}

const DOWNLOAD_PREFIX = 'splitwatch-update-';

// Removes the folders of earlier updates: the portable copy's new version cannot remove the one it
// ran from, and one the app closed before using stays behind.
function removeDownloads(): void {
  const temp = app.getPath('temp');
  try {
    for (const name of readdirSync(temp)) {
      if (name.startsWith(DOWNLOAD_PREFIX)) rmSync(path.join(temp, name), { recursive: true, force: true });
    }
  } catch {
    // The next check tries again.
  }
}

// Downloads the update, checks it against the SHA-512 in the metadata, and unpacks it.
async function stage(latest: LatestFile, current: 'portable' | 'mac'): Promise<void> {
  const temp = mkdtempSync(path.join(app.getPath('temp'), DOWNLOAD_PREFIX));
  try {
    const file = path.join(temp, latest.path);
    const res = await fetchOk(`${base()}/${latest.path}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const hash = createHash('sha512');
    const out = createWriteStream(file);
    let received = 0;
    let shown = -1;
    publish({ status: 'downloading', progress: 0 });
    for await (const chunk of Readable.fromWeb(res.body as never) as AsyncIterable<Buffer>) {
      hash.update(chunk);
      received += chunk.length;
      if (!out.write(chunk)) await once(out, 'drain');
      const progress = total ? Math.floor((received / total) * 100) : 0;
      if (progress !== shown) {
        shown = progress;
        publish({ status: 'downloading', progress: progress / 100 });
      }
    }
    await new Promise<void>((resolve, reject) =>
      out.end((error?: Error | null) => (error ? reject(error) : resolve())),
    );
    if (hash.digest('base64') !== latest.sha512) throw new Error('the download does not match its checksum');

    const into = path.join(temp, 'new');
    if (current === 'portable') {
      await run('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${file.replace(/'/g, "''")}' -DestinationPath '${into.replace(/'/g, "''")}' -Force`,
      ]);
      if (!existsSync(path.join(into, `${PRODUCT_NAME}.exe`))) throw new Error('the ZIP holds no app');
      staged = { version: latest.version, from: into, temp };
    } else {
      await run('ditto', ['-x', '-k', file, into]);
      const app2 = path.join(into, `${PRODUCT_NAME}.app`);
      if (!existsSync(app2)) throw new Error('the archive holds no app');
      staged = { version: latest.version, from: app2, temp };
    }
    rmSync(file, { force: true });
    publish({ status: 'ready', version: latest.version });
    installIfIdle();
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))));
  });
}

// Installs at once while the app waits in the tray with no window open, and starts it again there.
function installIfIdle(): void {
  if (state.status !== 'ready' || installing || !getSettings().background) return;
  if (!outOfUse({ main: mainWindow() !== null, popouts: popoutCount() })) return;
  markRestartHidden();
  install(true);
}

// Installs now and starts the app again (hidden: back in the tray).
function install(hidden: boolean): void {
  if (state.status !== 'ready' || installing) return;
  if (way() === 'updater') {
    installing = true;
    autoUpdater.quitAndInstall(true, true);
    return;
  }
  if (!staged) return;
  putInPlace(true, hidden);
  app.quit();
}

// Hands the staged files to a process that waits for the app to quit, then replaces it.
function putInPlace(restart: boolean, hidden: boolean): void {
  if (!staged) return;
  installing = true;
  if (process.platform === 'win32') {
    // The new version puts itself in place once this one has closed (apply-update.ts).
    const job = { from: staged.from, to: path.dirname(process.execPath), pid: process.pid, restart, hidden };
    spawn(path.join(staged.from, `${PRODUCT_NAME}.exe`), applyUpdateArgs(job), {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } else {
    const script = path.join(staged.temp, 'update.sh');
    writeFileSync(
      script,
      macScript({
        pid: process.pid,
        from: staged.from,
        to: bundlePath(),
        restart,
        args: hidden ? ['--hidden'] : [],
        temp: staged.temp,
      }),
    );
    spawn('/bin/sh', [script], { detached: true, stdio: 'ignore' }).unref();
  }
}
