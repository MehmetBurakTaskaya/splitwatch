import { describe, expect, it } from 'vitest';
import { isNewerVersion } from '../../src/shared/version';

describe('isNewerVersion', () => {
  it.each([
    ['0.1.1', '0.1.0', true],
    ['v0.2.0', '0.1.9', true],
    ['1.0.0', '0.99.99', true],
    ['0.1.0', '0.1.0', false],
    ['0.1.0', '0.1.1', false],
    ['1.0.0', '1.0.0-beta.2', true],
    ['1.0.0-beta.10', '1.0.0-beta.2', true],
    ['1.0.0-beta.1', '1.0.0', false],
    ['latest', '0.1.0', false],
  ])('%s is newer than %s: %s', (candidate, current, expected) => {
    expect(isNewerVersion(candidate, current)).toBe(expected);
  });
});
