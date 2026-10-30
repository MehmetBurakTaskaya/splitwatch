import path from 'node:path';
import { BrowserWindow, Menu, app, ipcMain, nativeTheme, session } from 'electron';
import { APP_ID, APP_ORIGIN, PRODUCT_NAME } from '../shared/app';
import { type AppInfo, IPC } from '../shared/ipc';
import { registerAppScheme, serveApp } from './protocol';
import { hardenSession, hardenWebContents } from './security';
import { flushSettings } from './settings-store';
import { setupUpdates } from './updates';
import { forwardFullscreenChanges, registerAppIpc } from './window-ipc';
import { registerYouTubeIpc } from './youtube-ipc';

const argValue = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
// --locale=en-XA or --locale=ar-XB opens a pseudo-locale for layout tests.
const locale = argValue('locale');
// --smoke-test exits with 0 once the renderer has drawn, or 1 after 30 seconds (used by CI on packaged builds).
const smokeTest = process.argv.includes('--smoke-test');
// Tests run with their own settings folder, so they never touch the user's.
if (process.env.SPLITWATCH_USER_DATA) app.setPath('userData', process.env.SPLITWATCH_USER_DATA);

registerAppScheme();
app.setAppUserModelId(APP_ID);
app.on('web-contents-created', (_event, contents) => hardenWebContents(contents));

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 520,
    show: false,
    title: PRODUCT_NAME,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#101317' : '#f5f6f8',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      // Electron's default, stated here because the grid relies on it: players start muted on
      // their own, and the selected one is unmuted without waiting for a click inside it.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  forwardFullscreenChanges(mainWindow);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => (mainWindow = null));
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
  void mainWindow.loadURL(`${APP_ORIGIN}/index.html${query}`);
}

function setMenu(): void {
  // macOS needs an application menu for the standard shortcuts; Windows and Linux get none.
  if (process.platform !== 'darwin') return Menu.setApplicationMenu(null);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]),
  );
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    hardenSession(session.defaultSession);
    serveApp(path.join(__dirname, '../renderer'));
    ipcMain.handle(IPC.appInfo, (): AppInfo => ({
      version: app.getVersion(),
      platform: process.platform,
      systemLocale: app.getLocale(),
    }));
    if (smokeTest) {
      const timer = setTimeout(() => app.exit(1), 30_000);
      ipcMain.once(IPC.rendererReady, () => {
        clearTimeout(timer);
        app.exit(0);
      });
    }
    registerAppIpc();
    registerYouTubeIpc();
    setMenu();
    setupUpdates();
    createMainWindow();
  });

  app.on('will-quit', flushSettings);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
}
