import { useSession } from '../state/session';

// The live YouTube players, by video ID. Sound is set here from the session: only the picked
// stream is audible (unless everything is muted); the others play muted.
const players = new Map<string, YT.Player>();

const PLAYING = 1;
const BUFFERING = 3;

export function registerPlayer(videoId: string, player: YT.Player): void {
  players.set(videoId, player);
  applyAudio();
}

export function unregisterPlayer(videoId: string): void {
  players.delete(videoId);
}

export function applyAudio(): void {
  const { muted, selected, masterVolume, volumes } = useSession.getState();
  for (const [id, player] of players) {
    try {
      if (!muted && selected === id) {
        player.setVolume(Math.round((volumes[id] ?? 1) * masterVolume * 100));
        player.unMute();
      } else {
        player.mute();
      }
    } catch {
      // A player that is being destroyed can throw; it is unregistered right after.
    }
  }
}

useSession.subscribe((s, prev) => {
  if (
    s.muted !== prev.muted ||
    s.selected !== prev.selected ||
    s.masterVolume !== prev.masterVolume ||
    s.volumes !== prev.volumes
  ) {
    applyAudio();
  }
});

export function togglePlay(videoId: string | null): void {
  const player = videoId ? players.get(videoId) : undefined;
  if (!player) return;
  const state = player.getPlayerState();
  if (state === PLAYING || state === BUFFERING) player.pauseVideo();
  else player.playVideo();
}

export function seekBy(videoId: string | null, seconds: number): void {
  const player = videoId ? players.get(videoId) : undefined;
  if (player) player.seekTo(Math.max(0, player.getCurrentTime() + seconds), true);
}
