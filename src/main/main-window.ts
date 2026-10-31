import path from 'node:path';
import { BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { APP_ORIGIN, PRODUCT_NAME } from '../shared/app';
import { type AppCommand, IPC } from '../shared/ipc';
import { WINDOW_MIN } from '../shared/layouts';
import { forgetMini, rememberMiniBounds } from './mini';
import { forwardWindowChanges } from './window-ipc';

// The one main window. It can close while the app keeps running in the tray; asks from the tray
// and the notifications open it again and wait until its page is ready.

let win: BrowserWindow | null = null;
let ready = false;
let query = '';
const waiting: AppCommand[] = [];
const listeners = new Set<() => void>();

export const mainWindow = () => win;

// The page's language (--locale, the setting or the system's), passed on to every new window.
export function setPageLocale(locale: string | undefined): void {
  query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
}

// The page URL for a window, with --locale and any other parameters.
export function pageUrl(params: Record<string, string> = {}): string {
  const search = new URLSearchParams(query.slice(1));
  for (const [key, value] of Object.entries(params)) search.set(key, value);
  const text = search.toString();
  return `${APP_ORIGIN}/index.html${text ? `?${text}` : ''}`;
}

// The options every page window shares: the sandboxed preload and the theme's first color.
export function pageWindowOptions(): Electron.BrowserWindowConstructorOptions {
  return {
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
  };
}

// Tells the tray when the window comes or goes.
export function onMainWindowChange(listener: () => void): void {
  listeners.add(listener);
}

function createMainWindow(): BrowserWindow {
  const created = new BrowserWindow({
    ...pageWindowOptions(),
    width: 1280,
    height: 800,
    minWidth: WINDOW_MIN.width,
    minHeight: WINDOW_MIN.height,
  });
  win = created;
  ready = false;
  forwardWindowChanges(created);
  created.on('close', () => rememberMiniBounds(created));
  created.once('ready-to-show', () => created.show());
  created.on('closed', () => {
    win = null;
    ready = false;
    forgetMini();
    for (const listener of listeners) listener();
  });
  void created.loadURL(pageUrl());
  for (const listener of listeners) listener();
  return created;
}

export function showMainWindow(): BrowserWindow {
  if (!win) return createMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return win;
}

// Passes an ask to the page only if the window is open and ready (the media keys do not open it).
export function sendToPage(command: AppCommand): void {
  if (win && ready) win.webContents.send(IPC.command, command);
}

// Opens the window if needed and passes the ask to its page once the page is ready.
export function sendCommand(command: AppCommand): void {
  const target = showMainWindow();
  if (ready) target.webContents.send(IPC.command, command);
  else waiting.push(command);
}

export function registerMainWindowIpc(): void {
  ipcMain.on(IPC.rendererReady, (e) => {
    if (!win || e.sender !== win.webContents) return;
    ready = true;
    for (const command of waiting.splice(0)) win.webContents.send(IPC.command, command);
  });
}
