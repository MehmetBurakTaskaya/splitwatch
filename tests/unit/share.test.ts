import { describe, expect, it } from 'vitest';
import { layoutLink, linkInArgs, parseLayoutLink } from '../../src/shared/share';

const A = 'M7lc1UVf-VE';
const B = 'aqz-KE-bpKQ';

describe('layout links', () => {
  it('carry the layout, streams, sports and name, and read back the same', () => {
    const shared = { name: 'Saturday finals', layout: '4' as const, streams: [A, B], sports: { [B]: 'swimming' } };
    const link = layoutLink(shared);
    expect(link.startsWith('splitwatch://layout?')).toBe(true);
    expect(parseLayoutLink(link)).toEqual(shared);
  });

  it('leave out bad and repeated IDs, bad sports, and a layout too small for the streams', () => {
    expect(parseLayoutLink(`splitwatch://layout?l=1&v=${A},nope,${A},${B}&s=swimming,x,,Bad Sport`)).toEqual({
      name: null,
      layout: '2',
      streams: [A, B],
      sports: { [A]: 'swimming' },
    });
  });

  it('refuse other schemes, other paths and links without a stream', () => {
    expect(parseLayoutLink(`https://layout?v=${A}`)).toBeNull();
    expect(parseLayoutLink(`splitwatch://open?v=${A}`)).toBeNull();
    expect(parseLayoutLink('splitwatch://layout?v=')).toBeNull();
    expect(parseLayoutLink(42)).toBeNull();
    expect(parseLayoutLink(`splitwatch://layout?v=${A}&n=${'x'.repeat(3000)}`)).toBeNull();
  });

  it('are found in a command line', () => {
    expect(linkInArgs(['app.exe', '--hidden', `splitwatch://layout?v=${A}`])).toBe(`splitwatch://layout?v=${A}`);
    expect(linkInArgs(['app.exe'])).toBeNull();
  });
});
