import { describe, expect, it } from 'vitest';
import { MAX_DELAY, clampDelay, holdOf, resumeTime } from '../../src/renderer/player/live';

describe('live streams held off screen', () => {
  it('resume as far behind live as they were, by moving on for as long as they were held', () => {
    const player = { getCurrentTime: () => 1200.5 } as YT.Player;
    const held = holdOf(player, 10_000);
    expect(held).toEqual({ time: 1200.5, at: 10_000 });
    expect(resumeTime(held, 10_000)).toBe(1200.5);
    expect(resumeTime(held, 42_000)).toBe(1232.5);
  });

  it('keep a delay between none and the most', () => {
    expect(clampDelay(-3)).toBe(0);
    expect(clampDelay(12)).toBe(12);
    expect(clampDelay(MAX_DELAY + 1)).toBe(MAX_DELAY);
  });
});
