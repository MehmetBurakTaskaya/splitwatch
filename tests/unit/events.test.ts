import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../src/renderer/i18n/locales/en.json';
import {
  SUGGEST_DAYS,
  eventDays,
  eventPhase,
  localDate,
  sanitizeEventSettings,
  sortEvents,
  sportsOn,
  suggestedEvent,
  validateEvent,
  validateEventIndex,
} from '../../src/shared/events';
import iocCodes from '../../src/shared/ioc-codes.json';
import { parseMedalTable } from '../../src/shared/medals';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const files = readdirSync('events').filter((f) => f.endsWith('.json') && f !== 'index.json' && f !== 'schema.json');
const events = files.map((f) => validateEvent(read(`events/${f}`))!);
const byId = (id: string) => events.find((e) => e.id === id)!;

describe('the shipped events', () => {
  it.each(files)('%s is valid and named after its id', (file) => {
    const event = validateEvent(read(`events/${file}`));
    expect(event).not.toBeNull();
    expect(`${event!.id}.json`).toBe(file);
  });

  it('are all listed in the index, which is valid', () => {
    const index = validateEventIndex(read('events/index.json'));
    expect(index?.events.sort()).toEqual(files.map((f) => f.replace('.json', '')).sort());
  });

  it('have a name for every sport in their calendars', () => {
    const names = en.sports as Record<string, string>;
    for (const event of events) for (const d of event.calendar) expect(names[d.sport], d.sport).toBeTruthy();
  });

  it('keep their calendars inside the Games, a few days of early competition allowed', () => {
    for (const event of events) {
      for (const d of event.calendar) {
        expect(d.date <= event.end, `${event.id} ${d.date}`).toBe(true);
        expect(Date.parse(event.start) - Date.parse(d.date)).toBeLessThanOrEqual(5 * 86_400_000);
      }
    }
  });

  it('add up to the event counts their sources state (2026 Winter: 116; Dakar: 153)', () => {
    const medals = (id: string) => byId(id).calendar.reduce((n, d) => n + d.medals, 0);
    expect(medals('winter-2026')).toBe(116);
    expect(medals('summer-youth-2026')).toBe(153);
  });
});

describe('event validation', () => {
  const good = read('events/winter-2030.json');

  it('rejects bad dates, time zones, kinds, sports and sources', () => {
    expect(validateEvent(good)).not.toBeNull();
    expect(validateEvent({ ...good, start: '2030-02-31' })).toBeNull();
    expect(validateEvent({ ...good, end: '2030-01-01' })).toBeNull();
    expect(validateEvent({ ...good, timezone: 'Mars/Base' })).toBeNull();
    expect(validateEvent({ ...good, kind: 'autumn' })).toBeNull();
    expect(validateEvent({ ...good, sources: [] })).toBeNull();
    expect(validateEvent({ ...good, sources: [{ url: 'http://x.org', checked: '2026-10-31' }] })).toBeNull();
    expect(validateEvent({ ...good, calendar: [{ date: '2030-02-02', sport: 'Bad', medals: 1 }] })).toBeNull();
  });
});

describe('event timing', () => {
  const la = byId('summer-2028');

  it("counts days in the host's time zone", () => {
    // 06:30 UTC on the 14th is still the evening of the 13th in Los Angeles.
    expect(localDate(new Date('2028-07-14T06:30:00Z'), la.timezone)).toBe('2028-07-13');
    expect(eventPhase(la, new Date('2028-07-14T06:30:00Z'))).toEqual({ phase: 'before', days: 1 });
    expect(eventPhase(la, new Date('2028-07-16T20:00:00Z'))).toEqual({ phase: 'during', day: 3 });
    expect(eventPhase(la, new Date('2028-08-01T20:00:00Z'))).toEqual({ phase: 'after' });
  });

  it(`suggests an event under way or opening within ${SUGGEST_DAYS} days, unless declined`, () => {
    expect(suggestedEvent(events, new Date('2028-05-01T12:00:00Z'), [])).toBeNull();
    expect(suggestedEvent(events, new Date('2028-06-20T12:00:00Z'), [])?.id).toBe('summer-2028');
    expect(suggestedEvent(events, new Date('2028-07-20T12:00:00Z'), ['summer-2028'])).toBeNull();
    expect(suggestedEvent(events, new Date('2026-11-02T12:00:00Z'), [])?.id).toBe('summer-youth-2026');
  });

  it('lists the days from the first competition to the closing, and the sports of a day', () => {
    const days = eventDays(la);
    expect(days[0]! < la.start).toBe(true);
    expect(days.at(-1)).toBe(la.end);
    const day = sportsOn(la, '2028-07-29');
    expect(day.length).toBeGreaterThan(10);
    expect(day[0]!.medals).toBeGreaterThanOrEqual(day.at(-1)!.medals);
  });

  it('sorts coming events first and past ones last', () => {
    const sorted = sortEvents(events, new Date('2026-12-01T00:00:00Z')).map((e) => e.id);
    expect(sorted).toEqual(['summer-2028', 'winter-2030', 'summer-youth-2026', 'winter-2026']);
  });
});

describe('event settings', () => {
  it('fall back to the defaults and keep values in range', () => {
    expect(sanitizeEventSettings('nonsense')).toEqual(sanitizeEventSettings({}));
    expect(sanitizeEventSettings({ snow: 9 }).snow).toBe(3);
    expect(sanitizeEventSettings({ country: 'tr' }).country).toBeNull();
    expect(sanitizeEventSettings({ reminders: [{ videoId: 'nope', at: '2028-07-20T18:00:00Z' }] }).reminders).toEqual(
      [],
    );
  });
});

describe('medal tables', () => {
  const wikitext = `intro {{Medals table
 | host           = ITA
 | host_ITA = yes
 | skip_AIN = yes
 | gold_NOR = 18| silver_NOR = 12| bronze_NOR = 11
 | gold_ITA = 10| silver_ITA = 6 | bronze_ITA = 14
 | gold_NED = 10| silver_NED = 7 | bronze_NED = 3
 | gold_AIN = 0 | silver_AIN = 1 | bronze_AIN = 0
 | gold_USA = 10| silver_USA = 6 | bronze_USA = 14
 | gold_BEL = 0 | silver_BEL = 0 | bronze_BEL = 0
}} {{Medals table | gold_XXX = 99 }}`;

  it('rank by gold, silver, then bronze, share ranks, and leave unranked teams out of the count', () => {
    const rows = parseMedalTable(wikitext);
    expect(rows.map((r) => [r.code, r.rank, r.total])).toEqual([
      ['NOR', 1, 41],
      ['NED', 2, 20],
      ['ITA', 3, 30],
      ['USA', 3, 30],
      ['AIN', null, 1],
    ]);
    expect(rows.find((r) => r.code === 'ITA')?.host).toBe(true);
  });

  it('come out empty for a page without one', () => {
    expect(parseMedalTable('no table here')).toEqual([]);
  });

  it('name their teams through the country codes', () => {
    const codes = iocCodes as Record<string, string>;
    for (const team of ['NOR', 'ITA', 'NED', 'USA', 'GER', 'SUI', 'SEN'])
      expect(codes[team], team).toMatch(/^[A-Z]{2}$/);
  });
});
