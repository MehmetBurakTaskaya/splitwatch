// Fills the "calendar" of an event file from the calendar table of the Games' English Wikipedia
// article, which follows the organizers' published schedule:
//   node scripts/event-calendar.mjs <event id>
// Each sport row gives, per day, competition (●) or the number of medal events. Wikipedia's text is
// CC BY-SA 4.0; the file lists the article as a source. Check the result against the organizers'
// schedule before committing, and add English names for new sports to en.json ("sports").
import { readFileSync, writeFileSync } from 'node:fs';

// The article (by page ID) and the date of the calendar table's first day column.
const PAGES = {
  'summer-2028': { pageid: 12695048, first: '2028-07-10' },
  'winter-2026': { pageid: 38416091, first: '2026-02-04' },
  'summer-youth-2026': { pageid: 64557687, first: '2026-10-30' },
};

// Wikipedia's names for sports that have presets in Splitwatch, names that do not make slugs, and
// disciplines named within their sport's group of rows ("Canoeing/Slalom").
const SLUGS = {
  'Canoeing/Sprint': 'canoe',
  'Canoeing/Slalom': 'canoe-slalom',
  'Cycling/Road cycling': 'road-cycling',
  'Cycling/Track cycling': 'track-cycling',
  'Cycling/BMX': 'bmx',
  'Cycling/Mountain biking': 'mountain-bike',
  'Equestrian/Dressage': 'equestrian',
  'Equestrian/Eventing': 'equestrian',
  'Equestrian/Jumping': 'equestrian',
  'Gymnastics/Artistic': 'artistic-gymnastics',
  'Gymnastics/Rhythmic': 'rhythmic-gymnastics',
  'Gymnastics/Trampoline': 'trampoline',
  'Mountain biking': 'mountain-bike',
  Snowboarding: 'snowboard',
  '3x3 basketball': 'basketball-3x3',
  '3×3 basketball': 'basketball-3x3',
  '3×3 Basketball': 'basketball-3x3',
};

const id = process.argv[2];
const page = PAGES[id];
if (!page) {
  console.error(`Usage: node scripts/event-calendar.mjs <${Object.keys(PAGES).join(' | ')}>`);
  process.exit(1);
}

const API = 'https://en.wikipedia.org/w/api.php';
const headers = { 'user-agent': 'Splitwatch-scripts (https://github.com/MehmetBurakTaskaya/splitwatch)' };
const api = async (params) => {
  const res = await fetch(`${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`, {
    headers,
  });
  if (!res.ok) throw new Error(`Wikipedia answered ${res.status}`);
  return (await res.json()).parse;
};

const { sections } = await api({ action: 'parse', pageid: String(page.pageid), prop: 'sections' });
const section = sections.find((s) => s.line === 'Calendar');
if (!section) throw new Error('No Calendar section');
const { wikitext } = await api({
  action: 'parse',
  pageid: String(page.pageid),
  prop: 'wikitext',
  section: section.index,
});

const slug = (name) =>
  SLUGS[name] ??
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const addDays = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

// The first day column's number must match the configured first date.
const firstHeader = /!\s*[^|\n]*\|\s*(\d{1,2})(?:st|nd|rd|th)<br/.exec(wikitext);
if (!firstHeader || Number(firstHeader[1]) !== Number(page.first.slice(8))) {
  throw new Error(`The table's first day is ${firstHeader?.[1]}, not ${page.first}`);
}

// A name cell's text: {{nowrap|…}} unwrapped, pictograms dropped, links turned into their labels,
// and the cell's attributes cut off.
const cellText = (line) =>
  line
    .replace(/\{\{\s*no ?wrap\s*\|/gi, '')
    .replace(/\}\}/g, '')
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .split('|')
    .at(-1)
    .trim();

const calendar = [];
const names = new Set();
let group = null;
for (const row of wikitext.split(/\n\|-/)) {
  const firstDay = row.search(/<!--\s*\d+\s*-->/);
  if (firstDay < 0) continue;
  const lines = row
    .slice(0, firstDay)
    .split('\n')
    .map((l) => l.replace(/<!--[^>]*-->/g, '').trim())
    .filter((l) => l.startsWith('|') || l.startsWith('!'));
  // A sport with several disciplines has a group cell (rowspan) before its first discipline; a
  // row spanning both name columns (colspan=2) stands alone.
  const groupLine = lines.find((l) => /rowspan\s*=/.test(l));
  if (groupLine) group = cellText(groupLine);
  else if (lines.some((l) => /colspan\s*=\s*"?2/.test(l))) group = null;
  const name = cellText(lines.at(-1) ?? '');
  if (!name || /ceremon|total|daily medal/i.test(name)) continue;
  const sport = SLUGS[`${group}/${name}`] ?? slug(name);
  names.add(`${sport}: ${group ? `${group} / ${name}` : name}`);
  const cells = [...row.matchAll(/<!--\s*(\d+)\s*-->([^\n]*)/g)];
  let sum = 0;
  cells.forEach(([, , cell], index) => {
    // The value follows the cell's last separator: a number of medal events, or ● for competition.
    const value = cell.split(/[|!]/).at(-1).replaceAll("'''", '').trim();
    const date = addDays(page.first, index);
    if (/^\d+$/.test(value)) {
      calendar.push({ date, sport, medals: Number(value) });
      sum += Number(value);
    } else if (value.includes('●')) calendar.push({ date, sport, medals: 0 });
  });
  // The row's own total, in the last cell, must match.
  const total = /\n(?:<!--\s*T\s*-->)?\|\s*'''(\d+)'''\s*$/.exec(row.trimEnd());
  if (total && Number(total[1]) !== sum) console.warn(`${name}: the days add up to ${sum}, the row says ${total[1]}`);
}

// A sport can appear in more than one row (several disciplines with one slug): add them up.
const merged = new Map();
for (const d of calendar) {
  const key = `${d.date} ${d.sport}`;
  const known = merged.get(key);
  merged.set(key, known ? { ...known, medals: known.medals + d.medals } : d);
}
const result = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.sport.localeCompare(b.sport));

const file = `events/${id}.json`;
const event = JSON.parse(readFileSync(file, 'utf8'));
event.calendar = result;
const url = `https://en.wikipedia.org/?curid=${page.pageid}`;
const today = new Date().toISOString().slice(0, 10);
event.sources = [...event.sources.filter((s) => s.url !== url), { url, checked: today }];
writeFileSync(file, `${JSON.stringify(event, null, 2)}\n`);

const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const missing = [...names].filter((n) => !en.sports[n.split(':')[0]]);
console.log(`${result.length} sport days, ${result.reduce((n, d) => n + d.medals, 0)} medal events`);
if (missing.length) console.log(`Names to add to en.json "sports":\n  ${missing.join('\n  ')}`);
