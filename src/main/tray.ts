import { Menu, type MenuItemConstructorOptions, Tray, app, nativeImage } from 'electron';
import type { StreamItem } from '../shared/ipc';
import tray16 from './assets/tray-16.png?inline';
import tray32 from './assets/tray-32.png?inline';
import template16 from './assets/tray-template-16.png?inline';
import template32 from './assets/tray-template-32.png?inline';
import { t } from './i18n';
import { loadKey } from './key-store';
import { liveNow } from './live';
import { mainWindow, onMainWindowChange, sendCommand, showMainWindow } from './main-window';
import { getSettings, onSettingsChange } from './settings-store';
import { onKeyStateChange } from './youtube-api';

// The tray icon (the menu bar on macOS), there while "keep running" is on. Its menu opens the
// window, the mini player, mutes, and lists what is live on the preset channels (with a key).

const LIVE_EVERY = 5 * 60_000;
const LIVE_ITEMS = 10;

let tray: Tray | null = null;
let live: StreamItem[] | null = null;
let timer: NodeJS.Timeout | null = null;

function icon(): Electron.NativeImage {
  const mac = process.platform === 'darwin';
  const image = nativeImage.createEmpty();
  image.addRepresentation({ scaleFactor: 1, dataURL: mac ? template16 : tray16 });
  image.addRepresentation({ scaleFactor: 2, dataURL: mac ? template32 : tray32 });
  // macOS draws a template image in the menu bar's own colors, light or dark.
  if (mac) image.setTemplateImage(true);
  return image;
}

const short = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function liveMenu(): MenuItemConstructorOptions[] {
  if (live === null) return [{ label: t('tray.liveNeedsKey'), enabled: false }];
  if (!live.length) return [{ label: t('tray.liveNone'), enabled: false }];
  return live.map((item) => ({
    label: short(item.channel ? `${item.title} · ${item.channel}` : item.title),
    click: () => sendCommand({ type: 'add', videoId: item.videoId, ...(item.sport ? { sport: item.sport } : {}) }),
  }));
}

function refreshMenu(): void {
  if (!tray) return;
  const { session } = getSettings();
  const open = mainWindow() !== null;
  const hasStreams = session.streams.length > 0;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: t('tray.open'), click: () => showMainWindow() },
      { label: t('tray.mini'), enabled: hasStreams, click: () => sendCommand({ type: 'mini' }) },
      {
        label: t('tray.mute'),
        type: 'checkbox',
        checked: session.muted,
        enabled: open && hasStreams,
        click: () => sendCommand({ type: 'toggleMute' }),
      },
      { type: 'separator' },
      { label: t('tray.liveNow'), submenu: liveMenu() },
      { type: 'separator' },
      { label: t('tray.quit'), click: () => app.quit() },
    ]),
  );
}

// Live streams on the preset channels of the Live now sports; null without a key.
async function refreshLive(): Promise<void> {
  if (!(await loadKey())) {
    live = null;
  } else {
    const result = await liveNow();
    live = result.mode === 'live' ? result.items.filter((i) => i.live === 'live').slice(0, LIVE_ITEMS) : null;
  }
  refreshMenu();
}

function sync(): void {
  const want = getSettings().background;
  if (want && !tray) {
    tray = new Tray(icon());
    tray.setToolTip(t('tray.tooltip'));
    // Windows and Linux open the window on a click; macOS shows the menu.
    if (process.platform !== 'darwin') tray.on('click', () => showMainWindow());
    refreshMenu();
    void refreshLive();
    timer = setInterval(() => void refreshLive(), LIVE_EVERY);
  } else if (!want && tray) {
    tray.destroy();
    tray = null;
    if (timer) clearInterval(timer);
    timer = null;
  }
}

export function setupTray(): void {
  sync();
  onSettingsChange((s, before) => {
    if (s.background !== before.background) sync();
    else if (tray && s.sports.join() !== before.sports.join()) void refreshLive();
    else if (s.session.muted !== before.session.muted || !s.session.streams.length !== !before.session.streams.length) {
      refreshMenu();
    }
  });
  onMainWindowChange(refreshMenu);
  onKeyStateChange(() => {
    if (tray) void refreshLive();
  });
}
