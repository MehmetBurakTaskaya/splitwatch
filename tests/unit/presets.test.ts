import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateIndex, validatePreset } from '../../src/shared/presets';

const read = (name: string) => JSON.parse(readFileSync(`presets/${name}`, 'utf8'));
const files = readdirSync('presets').filter((f) => f.endsWith('.json') && f !== 'index.json' && f !== 'schema.json');

describe('the shipped presets', () => {
  it.each(files)('%s is valid and named after its id', (file) => {
    const preset = validatePreset(read(file));
    expect(preset).not.toBeNull();
    expect(`${preset!.id}.json`).toBe(file);
  });

  it('are all listed in index.json, which the app fetches from GitHub', () => {
    const index = validateIndex(read('index.json'));
    expect(index).not.toBeNull();
    expect([...index!.presets].sort()).toEqual(files.map((f) => f.replace(/\.json$/, '')).sort());
  });

  it('carry a review note for every channel whose ownership is not confirmed', () => {
    const notes = files.flatMap((f) => validatePreset(read(f))!.channels.filter((c) => c.review));
    expect(notes.every((c) => c.review!.length > 10)).toBe(true);
  });
});

describe('preset validation', () => {
  const good = {
    id: 'volleyball',
    sport: 'volleyball',
    channels: [{ id: 'UCNMg6XDhRZI2QzL4pWOvP_w', name: 'Volleyball World', checked: '2026-10-30' }],
    keywords: ['volleyball live'],
  };

  it('accepts a good preset', () => {
    expect(validatePreset(good)).toEqual(good);
  });

  it.each([
    ['a handle instead of a channel ID', { channels: [{ ...good.channels[0], id: '@volleyballworld' }] }],
    ['a missing check date', { channels: [{ id: good.channels[0]!.id, name: 'X' }] }],
    ['no channels', { channels: [] }],
    ['an id with capitals', { id: 'Volleyball' }],
    ['a keyword that is too long', { keywords: ['x'.repeat(61)] }],
  ])('rejects %s', (_name, change) => {
    expect(validatePreset({ ...good, ...change })).toBeNull();
  });

  it('rejects a broken index', () => {
    expect(validateIndex({ version: 2, presets: [] })).toBeNull();
    expect(validateIndex({ version: 1, presets: ['../etc/passwd'] })).toBeNull();
  });
});
