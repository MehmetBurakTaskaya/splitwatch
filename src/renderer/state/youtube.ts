import { create } from 'zustand';
import type { LiveNow, LiveState, StreamItem, YouTubeStatus } from '../../shared/ipc';
import type { FollowedChannel } from '../../shared/notify';
import type { Preset } from '../../shared/presets';
import { useSession } from './session';

interface YouTubeState {
  status: YouTubeStatus | null;
  presets: Preset[];
  liveNow: LiveNow | null;
  liveLoading: boolean;
  liveStates: Record<string, LiveState>;
  history: StreamItem[];
  // The sport the app found for each stream in the grid, from the preset channels.
  streamSports: Record<string, string | null>;
  // The channel of each stream in the grid (with a key), for following it.
  streamChannels: Record<string, FollowedChannel | null>;
}

export const useYouTube = create<YouTubeState>(() => ({
  status: null,
  presets: [],
  liveNow: null,
  liveLoading: false,
  liveStates: {},
  history: [],
  streamSports: {},
  streamChannels: {},
}));

const LIVE_NOW_EVERY = 5 * 60_000;
const LIVE_STATES_EVERY = 2 * 60_000;

// The sports "Live now" suggests instead of those picked in Settings (a sport theme's; see ready.ts).
let suggestedSports: () => string[] | null = () => null;
export const setSuggestedSports = (pick: () => string[] | null) => {
  suggestedSports = pick;
};

let liveAgain = false;
export async function refreshLiveNow(): Promise<void> {
  // A request while one runs (the theme changed, say) runs once that one is done.
  if (useYouTube.getState().liveLoading) {
    liveAgain = true;
    return;
  }
  useYouTube.setState({ liveLoading: true });
  try {
    useYouTube.setState({ liveNow: await window.splitwatch.getLiveNow(suggestedSports()) });
  } finally {
    useYouTube.setState({ liveLoading: false });
  }
  if (liveAgain) {
    liveAgain = false;
    void refreshLiveNow();
  }
}

async function refreshLiveStates(): Promise<void> {
  const ids = useSession.getState().streams;
  if (!ids.length || useYouTube.getState().status?.key !== 'valid') return;
  const states = await window.splitwatch.getLiveStates(ids);
  useYouTube.setState({ liveStates: { ...useYouTube.getState().liveStates, ...states } });
}

// Looks up the sport of streams that did not come with one. Runs after the live states, whose
// videos.list answer it reuses, so it costs no extra quota.
async function refreshStreamSports(): Promise<void> {
  const { streams, sports } = useSession.getState();
  const ids = streams.filter((id) => !sports[id]);
  if (!ids.length) return;
  const found = await window.splitwatch.getStreamSports(ids);
  useYouTube.setState({ streamSports: { ...useYouTube.getState().streamSports, ...found } });
}

// The channels come from the same cached videos.list answer, so they cost nothing extra either.
async function refreshStreamChannels(): Promise<void> {
  const ids = useSession.getState().streams.filter((id) => !useYouTube.getState().streamChannels[id]);
  if (!ids.length || useYouTube.getState().status?.key !== 'valid') return;
  const found = await window.splitwatch.getStreamChannels(ids);
  useYouTube.setState({ streamChannels: { ...useYouTube.getState().streamChannels, ...found } });
}

const refreshStreams = () =>
  void refreshLiveStates().finally(() => void refreshStreamSports().finally(() => void refreshStreamChannels()));

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
      refreshStreams();
    }
  });
  void window.splitwatch.getPresets().then((presets) => useYouTube.setState({ presets }));
  void refreshHistory();
  void refreshLiveNow();
  refreshStreams();

  const visible = () => document.visibilityState === 'visible';
  setInterval(() => visible() && void refreshLiveNow(), LIVE_NOW_EVERY);
  setInterval(() => visible() && void refreshLiveStates(), LIVE_STATES_EVERY);
  document.addEventListener('visibilitychange', () => visible() && void refreshLiveStates());
  useSession.subscribe((s, prev) => {
    if (s.streams === prev.streams) return;
    refreshStreams();
    // Newly added streams become local search suggestions (titles kept 30 days at most).
    const added = s.streams.filter((id) => !prev.streams.includes(id));
    for (const id of added) window.splitwatch.rememberStream(id);
    if (added.length) setTimeout(() => void refreshHistory(), 3000);
  });
}
