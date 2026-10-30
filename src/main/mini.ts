import { type BrowserWindow, type Rectangle, screen } from 'electron';
import { IPC } from '../shared/ipc';
import { MINI_DEFAULT, MINI_MIN, WINDOW_MIN } from '../shared/layouts';
import { sanitizeBounds } from '../shared/settings';
import { getSettings, saveSettings } from './settings-store';

// Mini mode: the window shrinks to one tile and stays on top of other windows. The page shows the
// picked stream only and pauses the others (see src/renderer/player/players.ts). The window's
// bounds before mini mode come back when it ends; the mini bounds are kept for next time.

let before: { bounds: Rectangle; maximized: boolean } | null = null;
const MARGIN = 24;

export const isMini = () => before !== null;

function frameOf(win: BrowserWindow): { width: number; height: number } {
  const [outerW, outerH] = win.getSize();
  const [innerW, innerH] = win.getContentSize();
  return { width: outerW! - innerW!, height: outerH! - innerH! };
}

// The saved mini bounds when most of them are on a screen today, else the corner of the window's
// screen.
function miniBounds(win: BrowserWindow): Rectangle {
  const saved = sanitizeBounds(getSettings().miniBounds);
  if (saved) {
    const area = screen.getDisplayMatching(saved).workArea;
    const overlapW = Math.min(saved.x + saved.width, area.x + area.width) - Math.max(saved.x, area.x);
    const overlapH = Math.min(saved.y + saved.height, area.y + area.height) - Math.max(saved.y, area.y);
    if (overlapW > saved.width / 2 && overlapH > saved.height / 2) return saved;
  }
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const frame = frameOf(win);
  return {
    x: area.x + area.width - MINI_DEFAULT.width - frame.width - MARGIN,
    y: area.y + area.height - MINI_DEFAULT.height - frame.height - MARGIN,
    ...MINI_DEFAULT,
  };
}

export function rememberMiniBounds(win: BrowserWindow): void {
  if (isMini()) saveSettings({ miniBounds: win.getContentBounds() });
}

export function setMini(win: BrowserWindow, on: boolean): void {
  if (on === isMini()) return;
  if (on) {
    // macOS leaves fullscreen with an animation; resizing during it does not stick.
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => setMini(win, true));
      win.setFullScreen(false);
      return;
    }
    before = { bounds: win.getNormalBounds(), maximized: win.isMaximized() };
    if (win.isMaximized()) win.unmaximize();
    const frame = frameOf(win);
    win.setMinimumSize(MINI_MIN.width + frame.width, MINI_MIN.height + frame.height);
    win.setContentBounds(miniBounds(win));
    win.setAlwaysOnTop(true, 'floating');
  } else {
    rememberMiniBounds(win);
    const back = before!;
    before = null;
    win.setAlwaysOnTop(false);
    win.setMinimumSize(WINDOW_MIN.width, WINDOW_MIN.height);
    win.setBounds(back.bounds);
    if (back.maximized) win.maximize();
  }
  win.webContents.send(IPC.miniChanged, on);
}

// A new window (after the old one closed) starts outside mini mode.
export function forgetMini(): void {
  before = null;
}
