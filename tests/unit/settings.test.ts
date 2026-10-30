import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../../src/shared/settings';

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
      session: {
        layout: 'featured',
        streams: ['M7lc1UVf-VE', 'aqz-KE-bpKQ'],
        selected: 'aqz-KE-bpKQ',
        muted: true,
        masterVolume: 0.5,
        volumes: { 'M7lc1UVf-VE': 0.25 },
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

  it('refuses reserved and duplicate shortcut keys', () => {
    const s = sanitizeSettings({ shortcuts: { toggleMute: '1', enlarge: 'K', playPause: 'K', help: 'Escape' } });
    expect(s.shortcuts).toEqual({ enlarge: 'K' });
  });
});
