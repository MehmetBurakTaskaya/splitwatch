import codes from '../../shared/ioc-codes.json';

// Teams in medal tables go by three-letter codes; ioc-codes.json maps them to ISO country codes,
// which Intl.DisplayNames names in the interface language. Teams that are not a country have their
// own messages (medals.teams.*).
const ISO_BY_TEAM: Readonly<Record<string, string>> = codes;
const TEAM_BY_ISO: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(codes).map(([team, iso]) => [iso, team]),
);
export const SPECIAL_TEAMS = ['AIN', 'EOR', 'IOA', 'MIX', 'COR'] as const;

const displayNames = new Map<string, Intl.DisplayNames>();
function names(lang: string): Intl.DisplayNames {
  let found = displayNames.get(lang);
  if (!found) {
    found = new Intl.DisplayNames([lang, 'en'], { type: 'region', fallback: 'code' });
    displayNames.set(lang, found);
  }
  return found;
}

export const isoOfTeam = (team: string): string | null => ISO_BY_TEAM[team] ?? null;
export const teamOfIso = (iso: string): string | null => TEAM_BY_ISO[iso] ?? null;

export function countryName(iso: string, lang: string): string {
  return names(lang).of(iso) ?? iso;
}

// Every country that has a team code, by name in the interface language.
export function countryList(lang: string): { iso: string; name: string }[] {
  const collator = new Intl.Collator(lang);
  return Object.values(ISO_BY_TEAM)
    .map((iso) => ({ iso, name: countryName(iso, lang) }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

// Whether a stream title names the country: its name in the interface language or in English, or
// its team code as a word.
export function mentionsCountry(text: string, iso: string, lang: string): boolean {
  const lower = text.toLocaleLowerCase();
  const words = [countryName(iso, lang), countryName(iso, 'en')].map((n) => n.toLocaleLowerCase());
  if (words.some((w) => w.length > 2 && lower.includes(w))) return true;
  const team = teamOfIso(iso);
  return !!team && new RegExp(`\b${team}\b`).test(text);
}
