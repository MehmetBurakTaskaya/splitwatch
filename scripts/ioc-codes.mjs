// Writes src/shared/ioc-codes.json: the three-letter codes that medal tables use for teams, mapped
// to ISO 3166-1 alpha-2 country codes (which name the country in any language through
// Intl.DisplayNames). The pairs come from Wikidata (CC0): items with both an IOC country code (P984)
// and an ISO code (P297), leaving out countries that no longer exist.
//   node scripts/ioc-codes.mjs
import { writeFileSync } from 'node:fs';

const QUERY = `SELECT ?ioc ?iso WHERE {
  ?item wdt:P984 ?ioc; wdt:P297 ?iso.
  FILTER NOT EXISTS { ?item wdt:P576 ?end. }
}`;
// Wikidata keeps the IOC code on the Netherlands (Q55) and the ISO code on the Kingdom of the
// Netherlands (Q29999).
const EXTRA = { NED: 'NL' };

const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`;
const res = await fetch(url, {
  headers: {
    accept: 'application/sparql-results+json',
    'user-agent': 'Splitwatch-scripts (https://github.com/MehmetBurakTaskaya/splitwatch)',
  },
});
if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
const rows = (await res.json()).results.bindings;
const codes = { ...EXTRA };
for (const row of rows) {
  const ioc = row.ioc.value;
  const iso = row.iso.value;
  if (!/^[A-Z]{3}$/.test(ioc) || !/^[A-Z]{2}$/.test(iso)) continue;
  if (codes[ioc] && codes[ioc] !== iso) throw new Error(`${ioc} has two ISO codes: ${codes[ioc]}, ${iso}`);
  codes[ioc] = iso;
}
const sorted = Object.fromEntries(Object.entries(codes).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync('src/shared/ioc-codes.json', `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`${Object.keys(sorted).length} codes`);
