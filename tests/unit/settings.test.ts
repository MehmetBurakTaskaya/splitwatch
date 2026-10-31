import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  MAX_LAYOUT_NAME,
  MAX_SAVED_LAYOUTS,
  layoutName,
  sanitizeBounds,
  sanitizeSavedLayouts,
  sanitizeSettings,
} from '../../src/shared/settings';

describe('sanitizeSettings', () => {
  it('returns the defaults for missing or broken files', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const raw = {
      version: 1,
      audioFocus: 'hover',
      clipboardSuggestions: false,
      shortcuts: { toggleMute: 'K' },
      sports: ['volleyball', 'triathlon'],
      quotaLimits: { units: 20000, searches: 50 },
      theme: 'pool',
      language: 'tr',
      customThemes: [],
      watchHistory: false,
      sounds: true,
      colorScheme: 'dark',
      animate: false,
      performance: true,
      spoilers: true,
      mediaKeys: true,
      layouts: [],
      miniBounds: { x: -1200, y: 40, width: 490, height: 316 },
      background: true,
      startHidden: true,
      event: {
        active: 'summer-2028',
        dismissed: ['winter-2030'],
        introSeen: ['summer-2028'],
        country: 'SN',
        snow: 3,
      },
      reminders: [
        {
          videoId: 'M7lc1UVf-VE',
          title: 'Final',
          channel: 'A federation',
          at: '2028-07-20T18:00:00.000Z',
          sport: 'swimming',
        },
      ],
      notify: {
        on: true,
        sports: ['swimming'],
        channels: [{ id: 'UCNMg6XDhRZI2QzL4pWOvP_w', name: 'A federation' }],
      },
      session: {
        layout: 'featured',
        streams: ['M7lc1UVf-VE', 'aqz-KE-bpKQ'],
        selected: 'aqz-KE-bpKQ',
        muted: true,
        masterVolume: 0.5,
        volumes: { 'M7lc1UVf-VE': 0.25 },
        sports: { 'M7lc1UVf-VE': 'swimming', 'aqz-KE-bpKQ': 'none' },
      },
    };
    expect(sanitizeSettings(raw)).toEqual(raw);
  });

  it('drops invalid streams, duplicates and anything past nine', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `video-id-${String(i).padStart(2, '0')}`);
    const s = sanitizeSettings({ session: { streams: ['bad', ...ids, ids[0]] } }).session;
    expect(s.streams).toEqual(ids.slice(0, 9));
    expect(s.layout).toBe('9');
  });

  it('fixes a layout that cannot show every stream', () => {
    const s = sanitizeSettings({ session: { layout: '2', streams: ['M7lc1UVf-VE', 'aqz-KE-bpKQ', 'jNQXAC9IVRw'] } });
    expect(s.session.layout).toBe('3');
  });

  it('clamps volumes and forgets volumes and selections of unknown streams', () => {
    const s = sanitizeSettings({
      session: {
        streams: ['M7lc1UVf-VE'],
        selected: 'aqz-KE-bpKQ',
        masterVolume: 7,
        volumes: { 'M7lc1UVf-VE': -1, 'aqz-KE-bpKQ': 0.5 },
      },
    }).session;
    expect(s.masterVolume).toBe(1);
    expect(s.volumes).toEqual({ 'M7lc1UVf-VE': 0 });
    expect(s.selected).toBeNull();
  });

  it('keeps stream sports only for streams in the grid, and checks the theme fields', () => {
    const s = sanitizeSettings({
      theme: '../x',
      colorScheme: 'sepia',
      animate: 'no',
      performance: 1,
      session: { streams: ['M7lc1UVf-VE'], sports: { 'M7lc1UVf-VE': 'Swimming!', 'aqz-KE-bpKQ': 'swimming' } },
    });
    expect(s.session.sports).toEqual({});
    expect([s.theme, s.colorScheme, s.animate, s.performance]).toEqual(['auto', 'system', true, false]);
  });

  it('refuses reserved and duplicate shortcut keys', () => {
    const s = sanitizeSettings({ shortcuts: { toggleMute: '1', enlarge: 'K', playPause: 'K', help: 'Escape' } });
    expect(s.shortcuts).toEqual({ enlarge: 'K' });
  });
});

describe('saved layouts', () => {
  const layout = {
    id: 'a1b2c3d4e5f60718',
    name: '  Saturday\n finals ',
    layout: '2',
    streams: ['M7lc1UVf-VE', 'aqz-KE-bpKQ', 'not an id'],
    selected: 'aqz-KE-bpKQ',
    volumes: { 'M7lc1UVf-VE': 0.5, gone: 1 },
    sports: { 'aqz-KE-bpKQ': 'basketball' },
    muted: true,
  };

  it('keeps valid layouts with a clean, single-line name and the session checks', () => {
    expect(sanitizeSavedLayouts([layout])).toEqual([
      {
        id: 'a1b2c3d4e5f60718',
        name: 'Saturday finals',
        layout: '2',
        streams: ['M7lc1UVf-VE', 'aqz-KE-bpKQ'],
        selected: 'aqz-KE-bpKQ',
        volumes: { 'M7lc1UVf-VE': 0.5 },
        sports: { 'aqz-KE-bpKQ': 'basketball' },
      },
    ]);
  });

  it('drops layouts without an ID, a name or streams, and duplicates', () => {
    expect(
      sanitizeSavedLayouts([
        { ...layout, id: '../x' },
        { ...layout, name: '   ' },
        { ...layout, id: 'ffffffffffffffff', streams: [] },
        layout,
        { ...layout, name: 'Copy' },
        'nonsense',
      ]),
    ).toHaveLength(1);
    expect(sanitizeSavedLayouts('nonsense')).toEqual([]);
  });

  it(`keeps ${MAX_SAVED_LAYOUTS} at most`, () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...layout, id: `layout${String(i).padStart(4, '0')}` }));
    expect(sanitizeSavedLayouts(many)).toHaveLength(MAX_SAVED_LAYOUTS);
  });

  it('cuts long names', () => {
    expect(layoutName('x'.repeat(100))).toHaveLength(MAX_LAYOUT_NAME);
    expect(layoutName(42)).toBeNull();
    expect(layoutName('a\u0000b')).toBe('a b');
  });
});

describe('mini bounds', () => {
  it('keeps whole numbers within reach and at least the mini minimum', () => {
    expect(sanitizeBounds({ x: 10, y: 20, width: 490, height: 316 })).toEqual({
      x: 10,
      y: 20,
      width: 490,
      height: 316,
    });
    expect(sanitizeBounds({ x: 10.5, y: 20, width: 490, height: 316 })).toBeNull();
    expect(sanitizeBounds({ x: 10, y: 20, width: 100, height: 316 })).toBeNull();
    expect(sanitizeBounds({ x: 10, y: 1e9, width: 490, height: 316 })).toBeNull();
    expect(sanitizeBounds('nonsense')).toBeNull();
  });
});

describe('reminders', () => {
  it('move from the event settings of 0.6 to their own place', () => {
    const reminder = { videoId: 'M7lc1UVf-VE', title: 'Final', channel: 'C', at: '2028-07-20T18:00:00.000Z' };
    const settings = sanitizeSettings({ event: { active: null, reminders: [reminder] } });
    expect(settings.reminders).toEqual([reminder]);
    expect(settings.event).not.toHaveProperty('reminders');
  });
});
