import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type SplitwatchApi, type UpdateState } from '../shared/ipc';

// The renderer's only door to the main process.
const api: SplitwatchApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.appInfo),
  getUpdateState: () => ipcRenderer.invoke(IPC.updateState),
  onUpdateState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, next: UpdateState) => listener(next);
    ipcRenderer.on(IPC.updateState, handler);
    return () => ipcRenderer.removeListener(IPC.updateState, handler);
  },
  installUpdate: () => ipcRenderer.invoke(IPC.updateInstall),
  openReleasePage: () => ipcRenderer.invoke(IPC.openReleasePage),
  rendererReady: () => ipcRenderer.send(IPC.rendererReady),
};

contextBridge.exposeInMainWorld('splitwatch', api);
