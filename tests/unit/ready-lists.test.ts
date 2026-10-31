import { describe, expect, it } from 'vitest';
import type { LiveState } from '../../src/shared/ipc';
import {
  type ReadyCandidate,
  isReadyKind,
  mixList,
  ranked,
  readyLayout,
  readyList,
  readySize,
} from '../../src/shared/ready-lists';

const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}T12:00:00Z`;
const video = (id: string, live: LiveState, published: number, sport = 'swimming'): ReadyCandidate => ({
  videoId: id.padEnd(11, '_'),
  title: id,
  channel: 'Channel',
  live,
  sport,
  published: day(published),
});

describe('grid size', () => {
  it('fills a whole grid: 9, else 6, 4, 3, 2 or 1', () => {
    expect([12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(readySize)).toEqual([9, 9, 6, 6, 6, 4, 4, 3, 2, 1, 0]);
    expect(readyLayout(8)).toBe('6');
    expect(readyLayout(1)).toBe('1');
    expect(readyLayout(0)).toBeNull();
  });

  it('knows its kinds', () => {
    expect(['all', 'live', 'videos'].every(isReadyKind)).toBe(true);
    expect(isReadyKind('upcoming')).toBe(false);
  });
});

describe('one sport', () => {
  const candidates = [
    video('old', 'none', 1),
    video('live1', 'live', 2),
    video('new', 'none', 20),
    video('soon', 'upcoming', 25),
    video('live2', 'live', 10),
    video('mid', 'unknown', 15),
  ];

  it('puts live streams first, then the newest videos, and leaves out what has not started', () => {
    expect(ranked(candidates, 'all').map((c) => c.title)).toEqual(['live2', 'live1', 'new', 'mid', 'old']);
    expect(ranked(candidates, 'live').map((c) => c.title)).toEqual(['live2', 'live1']);
    expect(ranked(candidates, 'videos').map((c) => c.title)).toEqual(['new', 'mid', 'old']);
  });

  it('opens the largest full grid and keeps the rest as spares', () => {
    const list = readyList(candidates, 'all', true);
    expect(list.layout).toBe('4');
    expect(list.items.map((i) => i.title)).toEqual(['live2', 'live1', 'new', 'mid']);
    expect(list.spare.map((i) => i.title)).toEqual(['old']);
    expect(list.items[0]).not.toHaveProperty('published');
    expect(list.items[0]?.sport).toBe('swimming');
  });

  it('caps a list at nine and counts a video once', () => {
    const many = Array.from({ length: 14 }, (_, i) => video(`v${i}`, 'none', i + 1));
    const list = readyList([...many, many[0]!], 'videos', false);
    expect(list.layout).toBe('9');
    expect(list.items).toHaveLength(9);
    expect(list.spare).toHaveLength(5);
    expect(list.liveKnown).toBe(false);
  });

  it('is empty when nothing fits', () => {
    expect(readyList([video('soon', 'upcoming', 1)], 'all', true)).toEqual({
      layout: null,
      items: [],
      spare: [],
      liveKnown: true,
    });
  });
});

describe('the mix', () => {
  const sports = [
    'swimming',
    'athletics',
    'surfing',
    'rowing',
    'canoe',
    'badminton',
    'wrestling',
    'triathlon',
    'rink',
    'tennis',
  ];
  const bySport = new Map(
    sports.map((sport, i) => [
      sport,
      [video(`${sport}-a`, 'none', i + 2, sport), video(`${sport}-b`, 'none', i + 1, sport)],
    ]),
  );

  it('takes one stream from each of nine different sports', () => {
    const list = mixList(bySport, 'all', true, () => 0.5);
    expect(list.layout).toBe('9');
    expect(new Set(list.items.map((i) => i.sport)).size).toBe(9);
    expect(list.items.every((i) => i.title.endsWith('-a'))).toBe(true);
  });

  it('draws the sports in another order with another random', () => {
    const first = mixList(bySport, 'all', true, () => 0).items.map((i) => i.sport);
    const second = mixList(bySport, 'all', true, () => 0.99).items.map((i) => i.sport);
    expect(first).not.toEqual(second);
  });

  it('never shows one video twice, even when two sports share a channel', () => {
    const shared = video('shared', 'live', 30, 'road-cycling');
    const two = new Map([
      ['road-cycling', [shared]],
      ['mountain-bike', [{ ...shared, sport: 'mountain-bike' }, video('mtb', 'none', 3, 'mountain-bike')]],
    ]);
    const list = mixList(two, 'all', true, () => 0.99);
    expect(list.items.map((i) => i.title).sort()).toEqual(['mtb', 'shared']);
  });
});
