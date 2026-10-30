import { app, ipcMain } from 'electron';
import { IPC, type LoginState } from '../shared/ipc';
import { getSettings, onSettingsChange } from './settings-store';

// Starting with the system. The system keeps the setting (Windows: the Run key; macOS: Login
// Items), so the app asks it instead of keeping a copy. A development build would register the
// bare Electron binary, so only the installed app offers it.

const supported = () => app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin');
// Windows passes --hidden when the app should start in the tray; macOS reports wasOpenedAtLogin.
const windowsArgs = () => (getSettings().startHidden ? ['--hidden'] : []);

export function loginState(): LoginState {
  if (!supported()) return { supported: false, openAtLogin: false };
  if (process.platform === 'win32') {
    return {
      supported: true,
      openAtLogin: app.getLoginItemSettings({ args: windowsArgs() }).executableWillLaunchAtLogin,
    };
  }
  const { openAtLogin, status } = app.getLoginItemSettings();
  return { supported: true, openAtLogin, status };
}

function setOpenAtLogin(on: boolean): void {
  if (!supported()) return;
  app.setLoginItemSettings(
    process.platform === 'win32' ? { openAtLogin: on, args: windowsArgs() } : { openAtLogin: on },
  );
}

// Started by the system at sign-in, to stay in the tray. --hidden also works on macOS, for tests.
export function startedHidden(): boolean {
  const { background, startHidden } = getSettings();
  if (!background || !startHidden) return false;
  if (process.argv.includes('--hidden')) return true;
  return process.platform === 'darwin' && supported() && app.getLoginItemSettings().wasOpenedAtLogin;
}

export function registerLoginIpc(): void {
  ipcMain.handle(IPC.loginGet, () => loginState());
  ipcMain.handle(IPC.loginSet, (_e, on: unknown) => {
    setOpenAtLogin(on === true);
    return loginState();
  });
  // Windows keeps the arguments in its startup entry, so a change to "start in the tray" rewrites it.
  onSettingsChange((s, before) => {
    if (process.platform === 'win32' && s.startHidden !== before.startHidden && loginState().openAtLogin) {
      setOpenAtLogin(true);
    }
  });
}
