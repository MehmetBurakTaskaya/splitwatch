import { BrowserWindow, ipcMain } from 'electron';
import { IPC, type SearchResult, type SetKeyResult, type YouTubeStatus } from '../shared/ipc';
import { getHistory, rememberStream } from './history';
import { canStoreKey, deleteKey, loadKey, saveKey } from './key-store';
import { liveNow, liveStates, streamSports } from './live';
import { getPresets, refreshPresets } from './presets-store';
import { onQuotaChange, quotaSnapshot } from './quota-store';
import { currentKeyState, onKeyStateChange, searchLive, setKeyState, testKey } from './youtube-api';
import { isVideoId } from '../shared/youtube';

const searchCache = new Map<string, { at: number; result: SearchResult }>();
const SEARCH_TTL = 10 * 60_000;

async function status(): Promise<YouTubeStatus> {
  let key = currentKeyState();
  if (!key) {
    key = (await loadKey()) ? 'valid' : (await canStoreKey()) ? 'none' : 'unavailable';
    setKeyState(key);
  }
  return { key, ...quotaSnapshot() };
}

function broadcast(): void {
  void status().then((s) => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.youtubeStatusChanged, s);
  });
}

export function registerYouTubeIpc(): void {
  onQuotaChange(broadcast);
  onKeyStateChange(broadcast);
  void refreshPresets();

  ipcMain.handle(IPC.youtubeStatus, status);

  ipcMain.handle(IPC.youtubeSetKey, async (_e, raw: unknown): Promise<SetKeyResult> => {
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(key)) return { ok: false, reason: 'invalid-key' };
    if (!(await canStoreKey())) return { ok: false, reason: 'unavailable' };
    const test = await testKey(key);
    if (!test.ok) return test;
    if (!(await saveKey(key))) return { ok: false, reason: 'unavailable' };
    searchCache.clear();
    setKeyState('valid');
    return { ok: true };
  });

  ipcMain.handle(IPC.youtubeRemoveKey, async () => {
    await deleteKey();
    searchCache.clear();
    setKeyState((await canStoreKey()) ? 'none' : 'unavailable');
  });

  ipcMain.handle(IPC.youtubeSearch, async (_e, rawQuery: unknown, rawSport: unknown): Promise<SearchResult> => {
    const query = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 200) : '';
    if (!query) return { ok: true, items: [] };
    const preset = typeof rawSport === 'string' ? getPresets().find((p) => p.sport === rawSport) : undefined;
    const full = preset?.keywords[0] ? `${query} ${preset.keywords[0]}` : query;
    const hit = searchCache.get(full);
    if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.result;
    const result = await searchLive(full);
    // Results of a sport search count as that sport, which picks their color and theme.
    const out: SearchResult = result.ok
      ? { ok: true, items: preset ? result.data.map((item) => ({ ...item, sport: preset.sport })) : result.data }
      : result;
    if (out.ok) searchCache.set(full, { at: Date.now(), result: out });
    return out;
  });

  ipcMain.handle(IPC.youtubeLiveNow, () => liveNow());

  const videoIds = (raw: unknown) =>
    Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && isVideoId(id)).slice(0, 50) : [];
  ipcMain.handle(IPC.youtubeLiveStates, (_e, raw: unknown) => liveStates(videoIds(raw)));
  ipcMain.handle(IPC.youtubeStreamSports, (_e, raw: unknown) => streamSports(videoIds(raw)));

  ipcMain.handle(IPC.presetsList, () => getPresets());
  ipcMain.handle(IPC.historyList, () => getHistory());
  ipcMain.on(IPC.historyRemember, (_e, videoId: unknown) => void rememberStream(videoId));
}
