import { describe, expect, it } from 'vitest';
import { STARTED_KEEP, nextUp, sanitizeReminders } from '../../src/shared/reminders';

const NOW = Date.UTC(2026, 9, 31, 12);
const iso = (ms: number) => new Date(ms).toISOString();
const reminder = (videoId: string, at: number) => ({ videoId, title: `R ${videoId}`, channel: 'C', at: iso(at) });
const coming = (videoId: string, at: number, live = 'upcoming') => ({
  videoId,
  title: `U ${videoId}`,
  channel: 'C',
  live,
  scheduledStart: iso(at),
});

describe('the next streams to wait for', () => {
  it('come from reminders and coming streams, soonest first, three at most', () => {
    const next = nextUp(
      [reminder('aaaaaaaaaaa', NOW + 3_600_000), reminder('bbbbbbbbbbb', NOW + 60_000)],
      [
        coming('ccccccccccc', NOW + 600_000),
        coming('ddddddddddd', NOW + 7_200_000),
        coming('eeeeeeeeeee', NOW, 'live'),
      ],
      NOW,
    );
    expect(next.map((n) => [n.videoId, n.reminded])).toEqual([
      ['bbbbbbbbbbb', true],
      ['ccccccccccc', false],
      ['aaaaaaaaaaa', true],
    ]);
  });

  it('keep a reminder over the same coming stream, and a started stream for half an hour', () => {
    const next = nextUp(
      [reminder('aaaaaaaaaaa', NOW - 60_000), reminder('bbbbbbbbbbb', NOW - STARTED_KEEP - 1)],
      [coming('aaaaaaaaaaa', NOW - 60_000)],
      NOW,
    );
    expect(next).toEqual([
      { videoId: 'aaaaaaaaaaa', title: 'R aaaaaaaaaaa', channel: 'C', at: NOW - 60_000, reminded: true },
    ]);
  });
});

describe('a reminder that went out', () => {
  it('stays marked, and only true marks it', () => {
    const r = reminder('aaaaaaaaaaa', NOW);
    expect(sanitizeReminders([{ ...r, notified: true }])).toEqual([{ ...r, notified: true }]);
    expect(sanitizeReminders([{ ...r, notified: 'yes' }])).toEqual([r]);
  });
});
