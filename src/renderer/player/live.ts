// A live stream goes on while its player is paused. A player paused off screen resumes as far behind
// live as it was: it moves on by as long as it was held, and YouTube stops a seek past the live edge
// at the edge. getDuration() cannot give the live edge: in a live player it changes only now and then.
export interface Held {
  time: number;
  at: number;
}

export function holdOf(player: YT.Player, now = performance.now()): Held {
  return { time: player.getCurrentTime(), at: now };
}

export function resumeTime(held: Held, now = performance.now()): number {
  return held.time + (now - held.at) / 1000;
}

// The most a stream can be held back to line it up with the others, in seconds.
export const MAX_DELAY = 600;

export const clampDelay = (seconds: number): number => Math.min(MAX_DELAY, Math.max(0, seconds));
