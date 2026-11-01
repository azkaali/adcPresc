import type { Medicine } from '../../shared/types.ts';

export type SearchMode = 'brand' | 'generic';

export interface IndexedMedicine {
  medicine: Medicine;
  brand: string;
  generic: string;
  brandCompact: string;
  genericCompact: string;
  /** Strength and form, so "arcoxia 90" narrows to the 90 mg tablet. */
  extra: string;
  strengthValue: number;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9.%]+/g, ' ').trim();
const compact = (s: string) => s.replace(/[^a-z0-9]/g, '');

export function buildIndex(medicines: Medicine[]): IndexedMedicine[] {
  return medicines.map((medicine) => {
    const brand = normalize(medicine.brand_name);
    const generic = normalize(medicine.generic_name);
    return {
      medicine,
      brand,
      generic,
      brandCompact: compact(brand),
      genericCompact: compact(generic),
      extra: normalize(`${medicine.strength} ${medicine.form}`),
      strengthValue: parseFloat(medicine.strength) || 0,
    };
  });
}

/** True when every character of `needle` appears in `hay` in order (tolerates missing letters). */
function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/**
 * Ranks how well a name matches the query (lower is better), or returns -1 for no match:
 * 0 starts with the whole query, 1 starts with its first word, 2 a later word starts with it,
 * 3 contains it, 4 contains it with letters missing (typos like "plaqunil").
 */
function rankName(name: string, nameCompact: string, q: string, first: string): number {
  if (name.startsWith(q)) return 0;
  if (name.startsWith(first)) return 1;
  if (name.includes(` ${first}`)) return 2;
  const firstCompact = compact(first);
  if (firstCompact && nameCompact.includes(firstCompact)) return 3;
  if (firstCompact.length >= 4 && isSubsequence(firstCompact, nameCompact)) return 4;
  return -1;
}

const byUsageThenName = (key: 'brand' | 'generic') => (a: IndexedMedicine, b: IndexedMedicine) =>
  b.medicine.usage_count - a.medicine.usage_count ||
  a[key].localeCompare(b[key]) ||
  a.strengthValue - b.strengthValue;

/**
 * Searches by brand or by generic name. With an empty query, returns the most prescribed medicines.
 */
export function searchMedicines(index: IndexedMedicine[], query: string, mode: SearchMode, limit = 50): Medicine[] {
  const q = normalize(query);
  const tieBreak = byUsageThenName(mode);
  if (!q) return [...index].sort(tieBreak).slice(0, limit).map((e) => e.medicine);

  const [first, ...rest] = q.split(' ');
  const matches: { entry: IndexedMedicine; rank: number }[] = [];
  for (const entry of index) {
    const name = mode === 'brand' ? entry.brand : entry.generic;
    const nameCompact = mode === 'brand' ? entry.brandCompact : entry.genericCompact;
    const rank = rankName(name, nameCompact, q, first);
    if (rank < 0) continue;
    if (rank > 0 && rest.length) {
      const haystack = `${name} ${entry.extra}`;
      if (!rest.every((word) => haystack.includes(word))) continue;
    }
    matches.push({ entry, rank });
  }
  matches.sort((a, b) => a.rank - b.rank || tieBreak(a.entry, b.entry));
  return matches.slice(0, limit).map((m) => m.entry.medicine);
}

/** The [start, end) range of the query's first word inside `text`, for highlighting. */
export function matchRange(text: string, query: string): [number, number] | null {
  const first = normalize(query).split(' ')[0];
  if (!first) return null;
  const start = text.toLowerCase().indexOf(first);
  return start < 0 ? null : [start, start + first.length];
}
