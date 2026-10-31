import path from 'node:path';
import { BrowserWindow, Menu, app, ipcMain, session } from 'electron';
import { APP_ID } from '../shared/app';
import { type AppInfo, IPC } from '../shared/ipc';
import { getEvents, refreshEvents } from './events-store';
import { initI18n } from './i18n';
import { linkFromSecondInstance, listenForLinks, setupLinks } from './links';
import { registerLoginIpc, startedHidden } from './login';
import { registerMainWindowIpc, setPageLocale, showMainWindow } from './main-window';
import { setupMediaKeys } from './media-keys';
import { medalTable } from './medals';
import { setupNotifications } from './notify';
import { registerPopoutIpc } from './popouts';
import { registerPowerIpc } from './power';
import { setupReminders } from './reminders';
import { registerTakeoutIpc } from './takeout';
import { registerThemeFileIpc } from './theme-files';
import { registerWatchIpc } from './watch';
import { registerAppScheme, serveApp } from './protocol';
import { hardenSession, hardenWebContents } from './security';
import { flushSettings, getSettings } from './settings-store';
import { setupTray } from './tray';
import { setupUpdates } from './updates';
import { applyColorScheme, registerAppIpc } from './window-ipc';
import { registerYouTubeIpc } from './youtube-ipc';

const argValue = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
// --locale=en-XA or --locale=ar-XB opens a pseudo-locale for layout tests.
const locale = argValue('locale');
// --smoke-test exits with 0 once the renderer has drawn, or 1 after 30 seconds (used by CI on packaged builds).
const smokeTest = process.argv.includes('--smoke-test');
// Tests run with their own settings folder, so they never touch the user's.
if (process.env.SPLITWATCH_USER_DATA) app.setPath('userData', process.env.SPLITWATCH_USER_DATA);

registerAppScheme();
listenForLinks();
app.setAppUserModelId(APP_ID);
app.on('web-contents-created', (_event, contents) => hardenWebContents(contents));

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
  // Starting Splitwatch again brings its window back, also from the tray.
  app.on('second-instance', (_event, args) => {
    if (!linkFromSecondInstance(args)) showMainWindow();
  });

  void app.whenReady().then(async () => {
    await initI18n(locale);
    setPageLocale(locale);
    hardenSession(session.defaultSession);
    serveApp(path.join(__dirname, '../renderer'));
    ipcMain.handle(IPC.appInfo, (): AppInfo => ({
      version: app.getVersion(),
      platform: process.platform,
      systemLocale: app.getLocale(),
      country: app.getLocaleCountryCode(),
    }));
    ipcMain.handle(IPC.eventsList, () => getEvents());
    ipcMain.handle(IPC.eventMedals, (_e, id: unknown) => medalTable(id));
    void refreshEvents();
    if (smokeTest) {
      const timer = setTimeout(() => app.exit(1), 30_000);
      ipcMain.once(IPC.rendererReady, () => {
        clearTimeout(timer);
        app.exit(0);
      });
    }
    registerAppIpc();
    registerMainWindowIpc();
    registerPopoutIpc();
    registerThemeFileIpc();
    registerWatchIpc();
    registerPowerIpc();
    registerTakeoutIpc();
    registerLoginIpc();
    applyColorScheme();
    registerYouTubeIpc();
    setMenu();
    setupUpdates();
    setupTray();
    setupNotifications();
    setupReminders();
    setupMediaKeys();
    if (!startedHidden()) showMainWindow();
    setupLinks();
  });

  app.on('will-quit', flushSettings);
  // With the tray on, closing the window leaves the app running there.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !getSettings().background) app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showMainWindow();
  });
}
