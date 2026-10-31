import { readFile, stat } from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { IPC, type SubscriptionsImport } from '../shared/ipc';
import { parseSubscriptions } from '../shared/takeout';
import { t } from './i18n';

// A subscriptions list is a few hundred kilobytes at most.
const MAX_BYTES = 2 * 1024 * 1024;

// Opens the subscriptions.csv of a Google Takeout export through the system's file dialog.
export function registerTakeoutIpc(): void {
  ipcMain.handle(IPC.subscriptionsImport, async (e): Promise<SubscriptionsImport | null> => {
    const options: Electron.OpenDialogOptions = {
      title: t('follows.fileTitle'),
      filters: [{ name: t('follows.fileFilter'), extensions: ['csv'] }],
      properties: ['openFile'],
    };
    const win = BrowserWindow.fromWebContents(e.sender);
    const { canceled, filePaths } = await (win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options));
    const file = filePaths[0];
    if (canceled || !file) return null;
    try {
      if ((await stat(file)).size > MAX_BYTES) return { error: 'invalid' };
      const channels = parseSubscriptions(await readFile(file, 'utf8'));
      return channels ? { channels } : { error: 'invalid' };
    } catch {
      return { error: 'invalid' };
    }
  });
}
