import { describe, expect, it } from 'vitest';
import { MAX_FOLLOWED, TOLD_KEEP, pruneTold, sanitizeNotify, toTell, watchedChannels } from '../../src/shared/notify';
import type { Preset } from '../../src/shared/presets';

const A = 'UCaaaaaaaaaaaaaaaaaaaaaa';
const B = 'UCbbbbbbbbbbbbbbbbbbbbbb';
const C = 'UCcccccccccccccccccccccc';
const presets = [
  { sport: 'swimming', channels: [{ id: A }, { id: B }] },
  { sport: 'athletics', channels: [{ id: C }] },
] as unknown as Preset[];

describe('notification settings', () => {
  it('keep valid sports and channels, without repeats, and clean names', () => {
    expect(
      sanitizeNotify({
        on: true,
        sports: ['swimming', 'swimming', 'Bad Sport'],
        channels: [{ id: A, name: ' A\nfederation ' }, { id: A, name: 'again' }, { id: 'nope' }, { id: B }],
      }),
    ).toEqual({
      on: true,
      sports: ['swimming'],
      channels: [
        { id: A, name: 'A federation' },
        { id: B, name: B },
      ],
    });
    expect(sanitizeNotify('nonsense')).toEqual({ on: false, sports: [], channels: [] });
  });

  it(`follow ${MAX_FOLLOWED} channels at most`, () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: `UC${String(i).padStart(22, '0')}`, name: `${i}` }));
    expect(sanitizeNotify({ channels: many }).channels).toHaveLength(MAX_FOLLOWED);
  });
});

describe('watched channels', () => {
  it('are the preset channels of the chosen sports, then the followed ones, once each', () => {
    const notify = {
      on: true,
      sports: ['swimming'],
      channels: [
        { id: B, name: 'B' },
        { id: C, name: 'C' },
      ],
    };
    expect(watchedChannels(notify, presets)).toEqual([A, B, C]);
    expect(watchedChannels(notify, presets, 2)).toEqual([A, B]);
    expect(watchedChannels({ on: true, sports: [], channels: [] }, presets)).toEqual([]);
  });
});

describe('what to tell about', () => {
  it('skips streams told about before and streams in the grid', () => {
    expect(toTell(['x', 'y', 'z'], { x: 1 }, ['z'])).toEqual(['y']);
  });

  it('forgets what was told after two days', () => {
    const now = 10 * TOLD_KEEP;
    expect(pruneTold({ old: now - TOLD_KEEP - 1, recent: now - 1000 }, now)).toEqual({ recent: now - 1000 });
  });
});
