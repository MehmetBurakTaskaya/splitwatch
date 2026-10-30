import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import { directionOf, pickLocale } from '../../src/renderer/i18n/locale';
import en from '../../src/renderer/i18n/locales/en.json';
import { pseudoLocalize, pseudoMessage } from '../../src/renderer/i18n/pseudo';

function messages(tree: unknown, prefix = ''): [string, string][] {
  if (typeof tree === 'string') return [[prefix, tree]];
  return Object.entries(tree as Record<string, unknown>).flatMap(([k, v]) =>
    messages(v, prefix ? `${prefix}.${k}` : k),
  );
}

// A value for every argument the messages use.
const values = {
  version: '1.2.3',
  count: 2,
  progress: 0.42,
  index: 3,
  title: 'Final',
  code: 150,
  key: 'M',
  action: 'Mute or unmute',
  query: 'final',
  limit: 100,
  left: 97,
  used: 3,
  sport: 'Swimming',
  time: new Date('2026-10-31T07:00:00Z'),
  name: 'Saturday finals',
  max: 20,
  layout: 'Two side by side',
};

describe('English messages', () => {
  it.each(messages(en))('%s is valid ICU MessageFormat', (_key, message) => {
    expect(() => new IntlMessageFormat(message, 'en').format(values)).not.toThrow();
  });

  it('formats arguments and percentages through Intl', () => {
    expect(new IntlMessageFormat(en.tile.label, 'en').format({ index: 2, title: 'Final' })).toBe('Stream 2: Final');
    expect(new IntlMessageFormat(en.update.downloading, 'en').format({ progress: 0.42 })).toBe(
      'Downloading the update: 42%',
    );
  });

  it('formats plurals with each language rule', () => {
    const message = '{count, plural, one {# stream} other {# streams}}';
    expect(new IntlMessageFormat(message, 'en').format({ count: 1 })).toBe('1 stream');
    expect(new IntlMessageFormat(message, 'en').format({ count: 4 })).toBe('4 streams');
  });
});

describe('pseudo-locales', () => {
  it('lengthens and accents the text but keeps the ICU syntax', () => {
    const pseudo = pseudoMessage('{count, plural, one {# stream ready} other {# streams ready}}', 'en-XA');
    expect(pseudo).toMatch(/^\[.*~+\]$/);
    expect(pseudo).toContain('{count, plural, one {');
    expect(new IntlMessageFormat(pseudo, 'en').format({ count: 3 })).toContain('3');
    expect(pseudo).not.toContain('ready');
  });

  it('keeps simple arguments and number styles', () => {
    expect(pseudoMessage('Version {version}', 'en-XA')).toContain('{version}');
    expect(pseudoMessage('Done: {progress, number, percent}', 'en-XA')).toContain('{progress, number, percent}');
  });

  it('wraps right-to-left text for ar-XB', () => {
    expect(pseudoMessage('Hello', 'ar-XB')).toBe('‮Hello‬');
  });

  it.each(['en-XA', 'ar-XB'] as const)('%s formats every message', (locale) => {
    for (const [, message] of messages(pseudoLocalize(en, locale))) {
      expect(() => new IntlMessageFormat(message, locale).format(values)).not.toThrow();
    }
  });
});

describe('locale choice', () => {
  it('prefers a requested pseudo-locale, then supported system languages', () => {
    expect(pickLocale('ar-XB', ['tr-TR'])).toBe('ar-XB');
    expect(pickLocale(null, ['tr-TR', 'en-GB'])).toBe('en');
    expect(pickLocale('xx', ['fr-FR'])).toBe('en');
  });

  it('knows the text direction', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('ar-EG')).toBe('rtl');
    expect(directionOf('ar-XB')).toBe('rtl');
    expect(directionOf('en-XA')).toBe('ltr');
    expect(directionOf('tr')).toBe('ltr');
  });
});
