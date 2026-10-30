import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type SplitwatchApi, type UpdateState } from '../shared/ipc';

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, value: T) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

// The renderer's only door to the main process.
const api: SplitwatchApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.appInfo),
  getUpdateState: () => ipcRenderer.invoke(IPC.updateState),
  onUpdateState: (listener) => subscribe<UpdateState>(IPC.updateState, listener),
  installUpdate: () => ipcRenderer.invoke(IPC.updateInstall),
  openReleasePage: () => ipcRenderer.invoke(IPC.openReleasePage),
  rendererReady: () => ipcRenderer.send(IPC.rendererReady),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  saveSettings: (patch) => ipcRenderer.send(IPC.settingsSave, patch),
  getVideoInfo: (videoId) => ipcRenderer.invoke(IPC.videoInfo, videoId),
  readClipboardVideo: () => ipcRenderer.invoke(IPC.clipboardVideo),
  setMinContentSize: (size) => ipcRenderer.send(IPC.windowMinSize, size),
  setFullscreen: (on) => ipcRenderer.send(IPC.windowFullscreen, on),
  onFullscreenChange: (listener) => subscribe<boolean>(IPC.fullscreenChanged, listener),
};

contextBridge.exposeInMainWorld('splitwatch', api);
