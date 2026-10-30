// The medal table of an event, read from its English Wikipedia page ({{Medals table}}: one
// gold_XXX, silver_XXX and bronze_XXX value per team, by its three-letter code). Wikipedia's text is
// CC BY-SA 4.0 and written by volunteers, so the app names the source and links to the page.

export interface MedalRow {
  code: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  // Shared ranks for equal counts; null for teams the table lists without a rank.
  rank: number | null;
  host: boolean;
}

export function parseMedalTable(wikitext: string): MedalRow[] {
  const start = wikitext.indexOf('{{Medals table');
  if (start < 0) return [];
  const next = wikitext.indexOf('{{Medals table', start + 1);
  const block = wikitext.slice(start, next < 0 ? undefined : next);
  const teams = new Map<string, MedalRow>();
  const team = (code: string) => {
    let row = teams.get(code);
    if (!row) {
      row = { code, gold: 0, silver: 0, bronze: 0, total: 0, rank: 0, host: false };
      teams.set(code, row);
    }
    return row;
  };
  for (const [, kind, code, value] of block.matchAll(
    /\|\s*(gold|silver|bronze|host|skip)_([A-Z]{3})\s*=\s*([^|\n}]*)/g,
  )) {
    const row = team(code!);
    const text = value!.trim();
    if (kind === 'host') row.host = /^yes$/i.test(text);
    else if (kind === 'skip') row.rank = /^yes$/i.test(text) ? null : row.rank;
    else row[kind as 'gold' | 'silver' | 'bronze'] = /^\d+$/.test(text) ? Number(text) : 0;
  }
  const rows = [...teams.values()].map((r) => ({ ...r, total: r.gold + r.silver + r.bronze }));
  rows.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.code.localeCompare(b.code));
  let rank = 0;
  let seen = 0;
  let last: MedalRow | null = null;
  for (const row of rows) {
    if (row.rank === null) continue;
    seen += 1;
    if (!last || last.gold !== row.gold || last.silver !== row.silver || last.bronze !== row.bronze) rank = seen;
    row.rank = rank;
    last = row;
  }
  return rows.filter((r) => r.total > 0);
}
