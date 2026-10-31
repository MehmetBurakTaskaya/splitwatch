import { describe, expect, it } from 'vitest';
import { applyUpdateArgs, macScript, outOfUse, parseApplyUpdate, parseLatest } from '../../src/shared/updates';

// latest-mac.yml as electron-builder writes it (1.0.0).
const MAC = `version: 1.0.0
files:
  - url: Splitwatch-1.0.0-mac-universal.zip
    sha512: Bk6G8Gx6UK7ODePEamiNoThjlWXverCZVssf8M4JQOhk5e0StKxFMZH1zj3F4KzW8RuYGlafJVUHS6jvRDQLkA==
    size: 217860455
  - url: Splitwatch-1.0.0-mac-universal.dmg
    sha512: Uj4mORoGaJ8u4tmVknuYGn4AmJXWFIUIxs1mhux7L9tO9attnkkKm/iN82xTbFcsGmmewe9MjLdf/l2gUKb4cQ==
    size: 224556041
path: Splitwatch-1.0.0-mac-universal.zip
sha512: Bk6G8Gx6UK7ODePEamiNoThjlWXverCZVssf8M4JQOhk5e0StKxFMZH1zj3F4KzW8RuYGlafJVUHS6jvRDQLkA==
releaseDate: '2026-10-31T09:15:16.153Z'
`;

describe('update metadata', () => {
  it('reads the version, the update file and its checksum', () => {
    expect(parseLatest(MAC)).toEqual({
      version: '1.0.0',
      path: 'Splitwatch-1.0.0-mac-universal.zip',
      sha512: 'Bk6G8Gx6UK7ODePEamiNoThjlWXverCZVssf8M4JQOhk5e0StKxFMZH1zj3F4KzW8RuYGlafJVUHS6jvRDQLkA==',
    });
    expect(parseLatest('version: 1.0.1\r\npath: Splitwatch-Portable-x64.zip\r\nsha512: abc+/=\r\nsize: 6\r\n')).toEqual(
      {
        version: '1.0.1',
        path: 'Splitwatch-Portable-x64.zip',
        sha512: 'abc+/=',
      },
    );
  });

  it('refuses metadata that could point elsewhere or is incomplete', () => {
    expect(parseLatest(MAC.replace('path: Splitwatch-1.0.0-mac-universal.zip', 'path: ../../x.zip'))).toBeNull();
    expect(parseLatest(MAC.replace('version: 1.0.0', 'version: latest'))).toBeNull();
    expect(parseLatest('path: a.zip\nsha512: abc\n')).toBeNull();
    expect(parseLatest('<html>Not found</html>')).toBeNull();
  });
});

describe('installing by itself', () => {
  it('happens only while no window is open', () => {
    expect(outOfUse({ main: false, popouts: 0 })).toBe(true);
    expect(outOfUse({ main: true, popouts: 0 })).toBe(false);
    expect(outOfUse({ main: false, popouts: 1 })).toBe(false);
  });

  it('hands a portable update to the new version with arguments it reads back', () => {
    const job = { from: 'C:\\Temp\\splitwatch-update-1\\new', to: "C:\\Users\\O'Neil\\My Apps", pid: 4242 };
    expect(parseApplyUpdate(applyUpdateArgs({ ...job, restart: true, hidden: true }))).toEqual({
      ...job,
      restart: true,
      hidden: true,
    });
    expect(parseApplyUpdate(applyUpdateArgs({ ...job, restart: false, hidden: false }))).toEqual({
      ...job,
      restart: false,
      hidden: false,
    });
  });

  it('ignores an ordinary start and an incomplete hand-over', () => {
    expect(parseApplyUpdate(['Splitwatch.exe', '--hidden'])).toBeNull();
    expect(parseApplyUpdate(['--apply-update', '--from=a', '--to=b'])).toBeNull();
    expect(parseApplyUpdate(['--apply-update', '--from=a', '--to=b', '--pid=x'])).toBeNull();
    expect(parseApplyUpdate(['--apply-update', '--from=', '--to=b', '--pid=3'])).toBeNull();
  });

  it('swaps a Mac bundle, puts the old one back if that fails, and opens it again', () => {
    const script = macScript({
      pid: 77,
      from: '/tmp/u/new/Splitwatch.app',
      to: "/Applications/Bob's/Splitwatch.app",
      restart: true,
      args: ['--hidden'],
      temp: '/tmp/u',
    });
    expect(script).toContain('kill -0 77');
    expect(script).toContain(
      `mv '/Applications/Bob'\\''s/Splitwatch.app' '/Applications/Bob'\\''s/Splitwatch.app.old'`,
    );
    expect(script).toMatch(/else rm -rf .*; mv .*\.app\.old' .*\.app'; fi/);
    expect(script).toContain(`open '/Applications/Bob'\\''s/Splitwatch.app' --args '--hidden'`);
  });
});
