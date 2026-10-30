import { describe, expect, it } from 'vitest';
import { LAYOUTS, layoutFor, layoutsFor, minContentSize, nextLayout } from '../../src/shared/layouts';

describe('layouts', () => {
  it('pick the smallest grid that fits', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 9].map(layoutFor)).toEqual(['1', '1', '2', '3', '4', '6', '6', '9', '9']);
  });

  it('offer only layouts that show every stream', () => {
    expect(layoutsFor(5)).toEqual(['6', '9']);
    expect(layoutsFor(4)).toEqual(['4', '6', '9', 'featured']);
    expect(layoutsFor(0)).toEqual(LAYOUTS.map((l) => l.id));
  });

  it('cycle through the layouts that fit', () => {
    expect(nextLayout('4', 4)).toBe('6');
    expect(nextLayout('featured', 4)).toBe('4');
    expect(nextLayout('9', 7)).toBe('9');
  });

  it('keep every player at least 200 x 200 px', () => {
    for (const layout of LAYOUTS) {
      const { width, height } = minContentSize(layout.id);
      const tileWidth = (width - 8 - (layout.columns - 1) * 4) / layout.columns;
      const tileHeight = (height - 48 - 8 - (layout.rows - 1) * 4) / layout.rows;
      expect(tileWidth - 2).toBeGreaterThanOrEqual(200);
      expect(tileHeight - 2 - 36).toBeGreaterThanOrEqual(200);
    }
    // Three rows still fit a 1080p screen at 125% scaling (864 px of logical height).
    expect(minContentSize('9').height).toBeLessThan(800);
  });
});
