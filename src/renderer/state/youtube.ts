import { create } from 'zustand';
import type { LiveNow, LiveState, StreamItem, YouTubeStatus } from '../../shared/ipc';
import type { Preset } from '../../shared/presets';
import { useSession } from './session';

interface YouTubeState {
  status: YouTubeStatus | null;
  presets: Preset[];
  liveNow: LiveNow | null;
  liveLoading: boolean;
  liveStates: Record<string, LiveState>;
  history: StreamItem[];
}

export const useYouTube = create<YouTubeState>(() => ({
  status: null,
  presets: [],
  liveNow: null,
  liveLoading: false,
  liveStates: {},
  history: [],
}));

const LIVE_NOW_EVERY = 5 * 60_000;
const LIVE_STATES_EVERY = 2 * 60_000;

export async function refreshLiveNow(): Promise<void> {
  if (useYouTube.getState().liveLoading) return;
  useYouTube.setState({ liveLoading: true });
  try {
    useYouTube.setState({ liveNow: await window.splitwatch.getLiveNow() });
  } finally {
    useYouTube.setState({ liveLoading: false });
  }
}

async function refreshLiveStates(): Promise<void> {
  const ids = useSession.getState().streams;
  if (!ids.length || useYouTube.getState().status?.key !== 'valid') return;
  const states = await window.splitwatch.getLiveStates(ids);
  useYouTube.setState({ liveStates: { ...useYouTube.getState().liveStates, ...states } });
}

export async function refreshHistory(): Promise<void> {
  useYouTube.setState({ history: await window.splitwatch.getHistory() });
}

// Loads the key state, quota and presets, and keeps "Live now" and the tiles' LIVE badges fresh
// while the window is visible. Hidden windows make no requests.
export function connectYouTube(): void {
  void window.splitwatch.getYouTubeStatus().then((status) => useYouTube.setState({ status }));
  window.splitwatch.onYouTubeStatus((status) => {
    const before = useYouTube.getState().status?.key;
    useYouTube.setState({ status });
    if (before !== status.key) {
      void refreshLiveNow();
      void refreshLiveStates();
    }
  });
  void window.splitwatch.getPresets().then((presets) => useYouTube.setState({ presets }));
  void refreshHistory();
  void refreshLiveNow();

  const visible = () => document.visibilityState === 'visible';
  setInterval(() => visible() && void refreshLiveNow(), LIVE_NOW_EVERY);
  setInterval(() => visible() && void refreshLiveStates(), LIVE_STATES_EVERY);
  document.addEventListener('visibilitychange', () => visible() && void refreshLiveStates());
  useSession.subscribe((s, prev) => {
    if (s.streams === prev.streams) return;
    void refreshLiveStates();
    // Newly added streams become local search suggestions (titles kept 30 days at most).
    const added = s.streams.filter((id) => !prev.streams.includes(id));
    for (const id of added) window.splitwatch.rememberStream(id);
    if (added.length) setTimeout(() => void refreshHistory(), 3000);
  });
}
