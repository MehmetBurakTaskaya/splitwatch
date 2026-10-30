import { describe, expect, it } from 'vitest';
import { type KeyLike, actionFor, isReservedKey, keyName, resolveShortcuts } from '../../src/shared/shortcuts';

const key = (k: string, extra: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

describe('keyName', () => {
  it('names keys the same way on every layout', () => {
    expect(keyName(key('m', { code: 'KeyM' }))).toBe('M');
    expect(keyName(key(' ', { code: 'Space' }))).toBe('Space');
    expect(keyName(key('ArrowLeft', { altKey: true }))).toBe('Alt+ArrowLeft');
    expect(keyName(key('?', { shiftKey: true }))).toBe('Shift+?');
    expect(keyName(key('Shift', { shiftKey: true }))).toBeNull();
  });

  it('uses the physical key for letters on non-Latin layouts and with Alt', () => {
    expect(keyName(key('ь', { code: 'KeyM' }))).toBe('M');
    expect(keyName(key('ş', { code: 'KeyS' }))).toBe('S');
    expect(keyName(key('µ', { code: 'KeyM', altKey: true }))).toBe('Alt+M');
  });
});

describe('shortcut table', () => {
  it('maps default keys to actions', () => {
    const table = resolveShortcuts({});
    expect(actionFor('M', table)).toBe('toggleMute');
    expect(actionFor('Space', table)).toBe('playPause');
    expect(actionFor('Shift+?', table)).toBe('help');
    expect(actionFor('Q', table)).toBeNull();
  });

  it('lets a user override one key', () => {
    const table = resolveShortcuts({ toggleMute: 'K' });
    expect(actionFor('K', table)).toBe('toggleMute');
    expect(actionFor('M', table)).toBeNull();
  });

  it('reserves digits, Escape, Tab and Enter', () => {
    expect(['1', '9', 'Escape', 'Tab', 'Enter'].every(isReservedKey)).toBe(true);
    expect(isReservedKey('M')).toBe(false);
  });
});
