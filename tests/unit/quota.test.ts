import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMITS,
  canSpend,
  currentLedger,
  freshLedger,
  markExhausted,
  nextReset,
  pacificDay,
  remaining,
  sanitizeLedger,
  sanitizeLimits,
  spend,
} from '../../src/shared/quota';

describe('Pacific Time days', () => {
  it('follow the date in Los Angeles, not UTC', () => {
    expect(pacificDay(new Date('2026-10-30T06:59:00Z'))).toBe('2026-10-29'); // 23:59 PDT
    expect(pacificDay(new Date('2026-10-30T07:00:00Z'))).toBe('2026-10-30'); // 00:00 PDT
  });

  it('reset at the next Pacific midnight, in summer and in winter time', () => {
    expect(nextReset(new Date('2026-10-30T12:00:00Z')).toISOString()).toBe('2026-10-31T07:00:00.000Z'); // PDT
    expect(nextReset(new Date('2026-12-15T12:00:00Z')).toISOString()).toBe('2026-12-16T08:00:00.000Z'); // PST
    // The night the clocks go back (1 November 2026): midnight is still in PDT.
    expect(nextReset(new Date('2026-10-31T18:00:00Z')).toISOString()).toBe('2026-11-01T07:00:00.000Z');
  });
});

describe('the ledger', () => {
  const now = new Date('2026-10-30T12:00:00Z');

  it('spends from two buckets with their own limits', () => {
    let ledger = freshLedger(now);
    expect(canSpend(ledger, DEFAULT_LIMITS, 'searches', 1)).toBe(true);
    ledger = spend(ledger, 'searches', 100);
    expect(canSpend(ledger, DEFAULT_LIMITS, 'searches', 1)).toBe(false);
    expect(canSpend(ledger, DEFAULT_LIMITS, 'units', 1)).toBe(true);
    expect(remaining(ledger, DEFAULT_LIMITS, 'searches')).toBe(0);
  });

  it('keeps the last tenth of the units for what the user asks for', () => {
    const ledger = spend(freshLedger(now), 'units', 9000);
    expect(canSpend(ledger, DEFAULT_LIMITS, 'units', 1, true)).toBe(false);
    expect(canSpend(ledger, DEFAULT_LIMITS, 'units', 1, false)).toBe(true);
  });

  it('stops a bucket that the API reported as used up', () => {
    const ledger = markExhausted(freshLedger(now), 'units');
    expect(canSpend(ledger, DEFAULT_LIMITS, 'units', 1)).toBe(false);
    expect(remaining(ledger, DEFAULT_LIMITS, 'units')).toBe(0);
  });

  it('starts over on a new Pacific day', () => {
    const old = { day: '2026-10-29', units: 500, searches: 9, exhausted: ['units' as const] };
    expect(currentLedger(old, now)).toEqual(freshLedger(now));
    expect(sanitizeLedger({ ...old, day: '2026-10-30' }, now)).toEqual({ ...old, day: '2026-10-30' });
    expect(sanitizeLedger('broken', now)).toEqual(freshLedger(now));
  });

  it('accepts only sensible limits', () => {
    expect(sanitizeLimits({ units: 50_000, searches: 0 })).toEqual({ units: 50_000, searches: 100 });
    expect(sanitizeLimits(null)).toEqual(DEFAULT_LIMITS);
  });
});
