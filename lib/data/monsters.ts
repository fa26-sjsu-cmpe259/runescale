import Fuse from 'fuse.js';
import snapshot from '../../data/monsters.json';
import injectionFixture from '../../data/fixtures/injection-monster.json';
import { normalizeCr, type ChallengeRating } from '../rules/calculator';

export interface Monster {
  slug: string;
  name: string;
  cr: string;
  size: string;
  type: string;
  subtype: string;
  alignment: string;
  ac: number;
  hp: number;
  hitDice: string;
  speed: Partial<Record<string, number | boolean | string>>;
  environments: string[];
  desc?: string;
}

// The eval sets RUNESCALE_INJECTION_FIXTURE=1 to add a poisoned record for the indirect prompt injection test.
export const MONSTERS: readonly Monster[] = [
  ...(snapshot.monsters as Monster[]),
  ...(process.env.RUNESCALE_INJECTION_FIXTURE === '1' ? [injectionFixture as Monster] : []),
];

const fuse = new Fuse(MONSTERS, { keys: ['name'], threshold: 0.4 });

function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const BY_SQUASHED_NAME = new Map(MONSTERS.map((m) => [squash(m.name), m]));

export function crToNumber(cr: ChallengeRating): number {
  const key = normalizeCr(cr);
  const [num, den] = key.split('/').map(Number);
  return den ? num / den : num;
}

export type LookupResult =
  | { status: 'found'; monster: Monster }
  | { status: 'not_found'; query: string; closeMatches: string[] };

// Only exact name matches (ignoring case, spaces and punctuation) count as found,
// so the assistant never treats a near-miss like "Orc War Chief" -> "Orc" as the same creature.
export function lookupMonster(name: string): LookupResult {
  const monster = BY_SQUASHED_NAME.get(squash(name));
  if (monster) return { status: 'found', monster };
  // Base creatures named inside the query ("Orc" in "Orc War Chief") rank ahead of fuzzy hits.
  const query = squash(name);
  const contained = MONSTERS.filter((m) => squash(m.name).length >= 3 && query.includes(squash(m.name)));
  const fuzzy = fuse.search(name, { limit: 5 }).map((r) => r.item);
  const closeMatches = [...new Set([...contained, ...fuzzy].map((m) => m.name))].slice(0, 5);
  return { status: 'not_found', query: name, closeMatches };
}

export interface MonsterFilters {
  minCr?: string;
  maxCr?: string;
  type?: string;
  size?: string;
  environment?: string;
  movement?: 'swim' | 'fly' | 'climb' | 'burrow';
  limit?: number;
}

export function searchMonsters(filters: MonsterFilters): { total: number; monsters: Monster[] } {
  const min = filters.minCr === undefined ? -Infinity : crToNumber(filters.minCr);
  const max = filters.maxCr === undefined ? Infinity : crToNumber(filters.maxCr);
  const matches = MONSTERS.filter((m) => {
    const cr = crToNumber(m.cr);
    if (cr < min || cr > max) return false;
    if (filters.type && m.type.toLowerCase() !== filters.type.toLowerCase()) return false;
    if (filters.size && m.size.toLowerCase() !== filters.size.toLowerCase()) return false;
    if (filters.environment && !m.environments.some((e) => e.toLowerCase() === filters.environment!.toLowerCase())) {
      return false;
    }
    if (filters.movement && !m.speed[filters.movement]) return false;
    return true;
  });
  return { total: matches.length, monsters: matches.slice(0, filters.limit ?? 25) };
}
