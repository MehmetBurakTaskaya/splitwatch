import { readFile, stat, writeFile } from 'node:fs/promises';
import { BrowserWindow, type IpcMainInvokeEvent, dialog, ipcMain } from 'electron';
import { IPC, type ThemeImport } from '../shared/ipc';
import { contrastIssues, themeFile, validateTheme } from '../shared/themes';
import { t } from './i18n';

// A theme file is small; anything larger is not one.
const MAX_BYTES = 64 * 1024;

const filters = () => [{ name: t('themeFile.filter'), extensions: ['json'] }];
const windowOf = (e: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(e.sender);

// Themes go in and out as JSON files through the system's own file dialogs. A file comes in only as
// a valid theme whose text is easy to read (themes/schema.json, the contrast rules).
export function registerThemeFileIpc(): void {
  ipcMain.handle(IPC.themeImport, async (e): Promise<ThemeImport | null> => {
    const options: Electron.OpenDialogOptions = {
      title: t('themeFile.importTitle'),
      filters: filters(),
      properties: ['openFile'],
    };
    const win = windowOf(e);
    const { canceled, filePaths } = await (win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options));
    const file = filePaths[0];
    if (canceled || !file) return null;
    try {
      if ((await stat(file)).size > MAX_BYTES) return { error: 'invalid' };
      const theme = validateTheme(JSON.parse(await readFile(file, 'utf8')));
      if (!theme || theme.event) return { error: 'invalid' };
      return contrastIssues(theme).length ? { error: 'contrast' } : { theme };
    } catch {
      return { error: 'invalid' };
    }
  });

  ipcMain.handle(IPC.themeExport, async (e, raw: unknown): Promise<boolean> => {
    const theme = validateTheme(raw);
    if (!theme) return false;
    const options: Electron.SaveDialogOptions = {
      title: t('themeFile.exportTitle'),
      defaultPath: `${theme.id}.json`,
      filters: filters(),
    };
    const win = windowOf(e);
    const { canceled, filePath } = await (win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options));
    if (canceled || !filePath) return false;
    await writeFile(filePath, themeFile(theme), 'utf8');
    return true;
  });
}
