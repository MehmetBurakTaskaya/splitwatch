import { describe, expect, it } from 'vitest';
import { MAX_SUBSCRIPTIONS, parseCsv, parseSubscriptions } from '../../src/shared/takeout';

const A = 'UCabcdefghijklmnopqrstuv';
const B = 'UC0123456789_-ABCDEFGHIJ';

describe('a subscriptions list from Google Takeout', () => {
  it('splits quoted fields with commas, quotes and line breaks', () => {
    expect(parseCsv('a,"b, c","say ""hi""",\r\n"two\nlines",x\n')).toEqual([
      ['a', 'b, c', 'say "hi"', ''],
      ['two\nlines', 'x'],
    ]);
  });

  it('reads each channel once, with its title, whatever language the header is in', () => {
    const english =
      `\uFEFFChannel Id,Channel Url,Channel Title\r\n` +
      `${A},http://www.youtube.com/channel/${A},"Pool, Track & Field"\r\n` +
      `${B},http://www.youtube.com/channel/${B},Rink TV\r\n` +
      `${A},x,Again\r\n`;
    expect(parseSubscriptions(english)).toEqual([
      { id: A, name: 'Pool, Track & Field' },
      { id: B, name: 'Rink TV' },
    ]);
    const turkish = `Kanal Kimliği,Kanal URL'si,Kanal Başlığı\n${B},https://www.youtube.com/channel/${B},Buz Pisti\n`;
    expect(parseSubscriptions(turkish)).toEqual([{ id: B, name: 'Buz Pisti' }]);
  });

  it('names a channel without a title by its ID, and finds none in other files', () => {
    expect(parseSubscriptions(`${A},https://www.youtube.com/channel/${A},\n`)).toEqual([{ id: A, name: A }]);
    expect(parseSubscriptions('Title,Views\nHello,3\n')).toBeNull();
    expect(parseSubscriptions('')).toBeNull();
  });

  it('stops at a sane size', () => {
    const rows = Array.from(
      { length: MAX_SUBSCRIPTIONS + 5 },
      (_, i) => `UC${String(i).padStart(22, '0')},,Channel ${i}`,
    );
    expect(parseSubscriptions(rows.join('\n'))).toHaveLength(MAX_SUBSCRIPTIONS);
  });
});
