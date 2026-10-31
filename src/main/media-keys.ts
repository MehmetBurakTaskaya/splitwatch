import { app, globalShortcut, ipcMain, systemPreferences } from 'electron';
import { type AppCommand, IPC, type MediaKeysState } from '../shared/ipc';
import { sendToPage } from './main-window';
import { getSettings, onSettingsChange } from './settings-store';

// The keyboard's media keys, when the user turns them on: play or pause the picked stream, and pick
// the next or previous one, also while another app has the focus. While Splitwatch holds them, other
// apps (a music player) cannot use them, so they are off by default. macOS lets an app take them
// only once it is a trusted accessibility client.

const KEYS: Record<string, AppCommand> = {
  MediaPlayPause: { type: 'playPause' },
  MediaNextTrack: { type: 'selectNext' },
  MediaPreviousTrack: { type: 'selectPrevious' },
};
let held: string[] = [];

function sync(): void {
  for (const key of held) globalShortcut.unregister(key);
  held = [];
  if (!getSettings().mediaKeys) return;
  for (const [key, command] of Object.entries(KEYS)) {
    if (globalShortcut.register(key, () => sendToPage(command))) held.push(key);
  }
}

function state(): MediaKeysState {
  const on = getSettings().mediaKeys;
  return {
    on,
    held: held.length === Object.keys(KEYS).length,
    needsAccessibility: process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(false),
  };
}

export function setupMediaKeys(): void {
  sync();
  onSettingsChange((s, before) => {
    if (s.mediaKeys !== before.mediaKeys) sync();
  });
  ipcMain.handle(IPC.mediaKeysState, () => state());
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
