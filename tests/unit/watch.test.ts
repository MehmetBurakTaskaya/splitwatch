import { describe, expect, it } from 'vitest';
import {
  KEEP_DAYS,
  MAX_REPORT_SECONDS,
  type WatchReport,
  addWatch,
  emptyWatch,
  readReports,
  sanitizeWatch,
  watchStats,
} from '../../src/shared/watch';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 31, 12);
const report = (videoId: string, seconds: number, sport: string | null = 'swimming'): WatchReport => ({
  videoId,
  title: `Title ${videoId}`,
  channel: `Channel ${videoId.slice(0, 2)}`,
  sport,
  seconds,
});

describe('the watch history', () => {
  it('adds up time by stream, by day and by sport', () => {
    let h = addWatch(emptyWatch(), [report('M7lc1UVf-VE', 15), report('aqz-KE-bpKQ', 15, null)], NOW, '2026-10-31');
    h = addWatch(h, [report('M7lc1UVf-VE', 10)], NOW + 15_000, '2026-10-31');
    const entry = h.entries.find((e) => e.videoId === 'M7lc1UVf-VE')!;
    expect(entry.seconds).toBe(25);
    expect(entry.days).toEqual({ '2026-10-31': 25 });
    expect(entry.lastAt).toBe(NOW + 15_000);
    expect(h.totals).toEqual({ seconds: 40, sports: { swimming: 25, none: 15 }, since: NOW });
  });

  it('forgets titles and channels 30 days after a stream was last watched, but keeps the totals', () => {
    const h = addWatch(emptyWatch(), [report('M7lc1UVf-VE', 60)], NOW, '2026-10-01');
    const later = sanitizeWatch(JSON.parse(JSON.stringify(h)), NOW + (KEEP_DAYS + 1) * DAY, '2026-11-01');
    expect(later.entries).toEqual([]);
    expect(later.totals.seconds).toBe(60);
    const days = addWatch(h, [report('M7lc1UVf-VE', 5)], NOW + 20 * DAY, '2026-11-15').entries[0]!.days;
    expect(days).toEqual({ '2026-11-15': 5 });
  });

  it('reads only well-formed reports, at most a minute each', () => {
    expect(readReports([report('M7lc1UVf-VE', 999), { videoId: 'nope', seconds: 3 }, 'x'])).toEqual([
      { ...report('M7lc1UVf-VE', MAX_REPORT_SECONDS) },
    ]);
    expect(readReports(null)).toEqual([]);
    expect(readReports([{ ...report('M7lc1UVf-VE', -1) }])).toEqual([]);
  });

  it('drops anything invalid from the file', () => {
    expect(sanitizeWatch('junk', NOW, '2026-10-31')).toEqual(emptyWatch());
    const h = sanitizeWatch(
      {
        entries: [
          { videoId: 'bad' },
          { ...report('M7lc1UVf-VE', 3), lastAt: NOW, days: { yesterday: 3, '2026-10-31': 3 } },
        ],
        totals: { seconds: 3, sports: { 'Not a slug': 9, swimming: 3 }, since: NOW },
      },
      NOW,
      '2026-10-31',
    );
    expect(h.entries).toHaveLength(1);
    expect(h.entries[0]!.days).toEqual({ '2026-10-31': 3 });
    expect(h.totals.sports).toEqual({ swimming: 3 });
  });

  it('sums the last week and month, ranks sports and channels, and lists the latest first', () => {
    let h = addWatch(emptyWatch(), [report('M7lc1UVf-VE', 60)], NOW - 10 * DAY, '2026-10-21');
    h = addWatch(h, [report('aqz-KE-bpKQ', 30, 'cycling')], NOW, '2026-10-31');
    const stats = watchStats(h, '2026-10-31');
    expect(stats.week).toBe(30);
    expect(stats.month).toBe(90);
    expect(stats.total).toBe(90);
    expect(stats.sports).toEqual([
      { sport: 'swimming', seconds: 60 },
      { sport: 'cycling', seconds: 30 },
    ]);
    expect(stats.channels.map((c) => c.channel)).toEqual(['Channel M7', 'Channel aq']);
    expect(stats.recent.map((e) => e.videoId)).toEqual(['aqz-KE-bpKQ', 'M7lc1UVf-VE']);
  });
});
