// Pure parts of the updates (src/main/updates.ts, ADR 0013), so the unit tests can check them.

// Splitwatch looks for a new version 30 seconds after it starts (the network may not be up yet), every
// 6 hours, and an hour after a check that failed.
export const FIRST_CHECK = 30_000;
export const CHECK_EVERY = 6 * 60 * 60_000;
export const AFTER_FAILURE = 60 * 60_000;

export interface LatestFile {
  version: string;
  path: string;
  sha512: string;
}

// The top-level fields of a latest*.yml written by electron-builder or scripts/portable-yml.mjs.
export function parseLatest(text: string): LatestFile | null {
  const field = (name: string) => {
    const match = new RegExp(`^${name}:[ \\t]*['"]?([^'"\\r\\n]+?)['"]?[ \\t]*$`, 'm').exec(text);
    return match?.[1] ?? null;
  };
  const version = field('version');
  const path = field('path');
  const sha512 = field('sha512');
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) return null;
  if (!path || !/^[\w.-]+$/.test(path)) return null;
  if (!sha512 || !/^[A-Za-z0-9+/]+={0,2}$/.test(sha512)) return null;
  return { version, path, sha512 };
}

// An update installs by itself only while nobody is watching: no Splitwatch window is open (the
// app waits in the tray). Otherwise it waits for the app to close, or for "Update and restart".
export const outOfUse = (windows: { main: boolean; popouts: number }): boolean =>
  !windows.main && windows.popouts === 0;

const sh = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

// The portable Windows copy is put in place by the new version itself (src/main/apply-update.ts):
// the old app starts the downloaded Splitwatch.exe with these arguments and closes. Every version
// keeps reading them as they are, since an older version starts a newer one.
export interface ApplyUpdate {
  from: string;
  to: string;
  pid: number;
  restart: boolean;
  hidden: boolean;
}

export const applyUpdateArgs = (o: ApplyUpdate): string[] => [
  '--apply-update',
  `--from=${o.from}`,
  `--to=${o.to}`,
  `--pid=${o.pid}`,
  ...(o.restart ? ['--restart'] : []),
  ...(o.hidden ? ['--hidden'] : []),
];

export function parseApplyUpdate(argv: string[]): ApplyUpdate | null {
  if (!argv.includes('--apply-update')) return null;
  const value = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
  const from = value('from');
  const to = value('to');
  const pid = Number(value('pid'));
  if (!from || !to || !Number.isInteger(pid) || pid <= 0) return null;
  return { from, to, pid, restart: argv.includes('--restart'), hidden: argv.includes('--hidden') };
}

// A Mac copy: once Splitwatch has quit, put the new app bundle in place of the old one (the old one
// comes back if that fails), start it again if asked, and remove the download.
export function macScript(o: {
  pid: number;
  from: string;
  to: string;
  restart: boolean;
  args: string[];
  temp: string;
}): string {
  const old = `${o.to}.old`;
  const open = o.restart ? `open ${sh(o.to)}${o.args.length ? ` --args ${o.args.map(sh).join(' ')}` : ''}` : '';
  return [
    '#!/bin/sh',
    `while kill -0 ${o.pid} 2>/dev/null; do sleep 0.3; done`,
    'sleep 0.5',
    `rm -rf ${sh(old)}`,
    `if mv ${sh(o.to)} ${sh(old)} && ditto ${sh(o.from)} ${sh(o.to)}; then rm -rf ${sh(old)}; else rm -rf ${sh(o.to)}; mv ${sh(old)} ${sh(o.to)}; fi`,
    open,
    `rm -rf ${sh(o.temp)}`,
    '',
  ].join('\n');
}
