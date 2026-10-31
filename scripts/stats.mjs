// Prints Splitwatch's download numbers from the counts GitHub keeps for every release file (ADR 0013).
// Splitwatch sends nothing; the copies in use are estimated from how often the update files were
// read, because every copy reads one when it starts and every 6 hours to look for an update.
// Usage: npm run stats (needs the GitHub CLI signed in with access to the repository, so hidden
// older releases count too). Prints Markdown, which a workflow can show on its summary page.
import { execFileSync } from 'node:child_process';

const REPO = 'MehmetBurakTaskaya/splitwatch';
const DAY = 24 * 60 * 60 * 1000;

// What each release file counts as. Releases before 1.0.1 had version numbers in their names.
function kindOf(name) {
  if (/^latest(-mac|-linux|-portable)?\.yml$/.test(name)) return 'checks';
  if (/^Splitwatch-Update-/.test(name) || name === 'Splitwatch-macOS.zip') return 'updates';
  if (/Setup.*\.exe$/.test(name)) return 'windows';
  if (/(Portable-x64|win-x64)\.zip$/.test(name)) return 'portable';
  if (/\.dmg$/.test(name) || /mac-universal\.zip$/.test(name)) return 'mac';
  if (/\.AppImage$/.test(name)) return 'linux';
  return null;
}

const releases = JSON.parse(execFileSync('gh', ['api', `repos/${REPO}/releases?per_page=100`], { encoding: 'utf8' }))
  .filter((release) => !release.prerelease && release.assets.length)
  .map((release) => {
    const counts = { windows: 0, portable: 0, mac: 0, linux: 0, updates: 0, checks: 0 };
    for (const asset of release.assets) {
      const kind = kindOf(asset.name);
      if (kind) counts[kind] += asset.download_count;
    }
    // A hidden release keeps the date it first came out.
    const out = new Date(release.published_at ?? release.created_at);
    return { tag: release.tag_name, hidden: release.draft, out, counts };
  })
  .sort((a, b) => b.out - a.out);
if (!releases.length) {
  console.error('no releases found');
  process.exit(1);
}

const now = new Date();
const sum = (kind) => releases.reduce((total, release) => total + release.counts[kind], 0);
const date = (d) => d.toISOString().slice(0, 10);
const people = sum('windows') + sum('portable') + sum('mac') + sum('linux');
const lines = [
  `## Splitwatch downloads, ${date(now)} ${now.toISOString().slice(11, 16)} UTC`,
  '',
  '| Release | Out since | Windows installer | Portable ZIP | Mac | Linux | Updates by Splitwatch | Update checks |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...releases.map(({ tag, hidden, out, counts }, i) => {
    const label = `${tag}${i === 0 && !hidden ? ' (current)' : hidden ? ' (hidden)' : ''}`;
    return `| ${label} | ${date(out)} | ${counts.windows} | ${counts.portable} | ${counts.mac} | ${counts.linux} | ${counts.updates} | ${counts.checks} |`;
  }),
  '',
  `**Downloaded by people:** ${people} (Windows installer ${sum('windows')}, portable ZIP ${sum('portable')}, Mac ${sum('mac')}, Linux ${sum('linux')})`,
  '',
  `**Updates installed by Splitwatch itself:** ${sum('updates')}`,
  '',
];

// Copies in use: the current release's update files are what every copy reads now.
const current = releases.find((release) => !release.hidden) ?? releases[0];
const days = (now - current.out) / DAY;
if (days < 1) {
  lines.push(
    `**Copies in use:** ${current.tag} came out less than a day ago; the estimate needs a day of update checks.`,
  );
} else {
  const perDay = current.counts.checks / days;
  const low = Math.floor(perDay / 4);
  const high = Math.ceil(perDay / 2);
  lines.push(
    `**Copies in use (estimate):** the update files of ${current.tag} were read ${current.counts.checks} times in ${days.toFixed(1)} days, ` +
      `${perDay.toFixed(1)} a day. A running copy reads one when it starts and every 6 hours, 2 to 4 times a day, so about ` +
      `${low === high ? low : `${low} to ${high}`} copies are in use.`,
  );
}
lines.push(
  '',
  "These count downloads, not people: one person can download twice, and the developer's own tests count too. " +
    'Before 1.0.1 updates fetched the installer itself, so they are in the Windows installer column, and copies before ' +
    '1.0.1 looked for updates only at start. Portable copies update from the portable ZIP, so their updates count there.',
);
process.stdout.write(`${lines.join('\n')}\n`);
