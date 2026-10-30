import { describe, expect, it } from 'vitest';
import { parseVideoId, watchUrl } from '../../src/shared/youtube';

describe('parseVideoId', () => {
  it.each([
    ['M7lc1UVf-VE', 'M7lc1UVf-VE'],
    ['  M7lc1UVf-VE  ', 'M7lc1UVf-VE'],
    ['https://www.youtube.com/watch?v=M7lc1UVf-VE', 'M7lc1UVf-VE'],
    ['https://www.youtube.com/watch?feature=share&v=M7lc1UVf-VE&t=42s', 'M7lc1UVf-VE'],
    ['youtube.com/watch?v=M7lc1UVf-VE', 'M7lc1UVf-VE'],
    ['https://m.youtube.com/watch?v=M7lc1UVf-VE', 'M7lc1UVf-VE'],
    ['https://youtu.be/M7lc1UVf-VE?si=abc', 'M7lc1UVf-VE'],
    ['https://www.youtube.com/live/M7lc1UVf-VE?feature=shared', 'M7lc1UVf-VE'],
    ['https://www.youtube.com/embed/M7lc1UVf-VE', 'M7lc1UVf-VE'],
    ['https://www.youtube-nocookie.com/embed/M7lc1UVf-VE', 'M7lc1UVf-VE'],
    ['https://www.youtube.com/shorts/M7lc1UVf-VE', 'M7lc1UVf-VE'],
  ])('reads %s', (input, expected) => {
    expect(parseVideoId(input)).toBe(expected);
  });

  it.each([
    [''],
    ['hello'],
    ['M7lc1UVf-V'],
    ['https://www.youtube.com/watch?v=short'],
    ['https://www.youtube.com/@GoogleDevelopers'],
    ['https://example.com/watch?v=M7lc1UVf-VE'],
    ['https://evil.com/youtu.be/M7lc1UVf-VE'],
    ['javascript:alert(1)'],
    ['ftp://youtube.com/watch?v=M7lc1UVf-VE'],
  ])('rejects %s', (input) => {
    expect(parseVideoId(input)).toBeNull();
  });

  it('builds the watch link', () => {
    expect(watchUrl('M7lc1UVf-VE')).toBe('https://www.youtube.com/watch?v=M7lc1UVf-VE');
  });
});
