import { ipcMain, powerSaveBlocker } from 'electron';
import { IPC } from '../shared/ipc';

// The waiting screen keeps the display from sleeping while it shows.
let blocker: number | null = null;

export function registerPowerIpc(): void {
  ipcMain.on(IPC.keepAwake, (_e, on: unknown) => {
    if (on === true && blocker === null) {
      blocker = powerSaveBlocker.start('prevent-display-sleep');
    } else if (on !== true && blocker !== null) {
      powerSaveBlocker.stop(blocker);
      blocker = null;
    }
  });
}
