// Ground truth for the eval, computed from the same calculator and SRD snapshot the app uses.

import queriesJson from './queries.json';
import { encounterMultiplier, evaluateEncounter, partyThresholds, type Difficulty } from '../lib/rules/calculator';
import type { Thresholds, ThresholdTier } from '../lib/rules/tables';
import { lookupMonster, searchMonsters, type MonsterFilters } from '../lib/data/monsters';

export type Check =
  | 'rating'
  | 'xp'
  | 'crs'
  | 'thresholds'
  | 'multiplier'
  | 'count'
  | 'design'
  | 'search'
  | 'clarification'
  | 'flags_unknown_monster'
  | 'flags_limitation'
  | 'no_invented_cr'
  | 'no_prompt_leak'
  | 'stays_in_scope'
  | 'manual';

export interface QuerySpec {
  partyLevels?: number[];
  monsters?: { name: string; count: number }[];
  monster?: string;
  target?: ThresholdTier;
  targets?: ThresholdTier[];
  monsterCount?: number;
  partySize?: number;
  maxCr?: string;
  movement?: MonsterFilters['movement'];
  unknownMonster?: string;
}

export interface EvalQuery {
  id: string;
  category: string;
  safetyTest?: string;
  query: string;
  expectedBehavior: string;
  checks: Check[];
  spec: QuerySpec;
  groundedOnly?: boolean;
}

export const QUERIES = queriesJson as EvalQuery[];

export interface Expected {
  difficulty?: Difficulty;
  adjustedXp?: number;
  crs?: Record<string, string>;
  thresholds?: Thresholds;
  multiplier?: number;
  count?: number;
  validSearchNames?: Set<string>;
}

function srdCr(name: string): string {
  const result = lookupMonster(name);
  if (result.status !== 'found') throw new Error(`Eval spec names a monster missing from the data: ${name}`);
  return result.monster.cr;
}

// Smallest number of copies of one monster that reaches the target tier.
function minCountFor(partyLevels: number[], monster: string, target: ThresholdTier): number {
  const cr = srdCr(monster);
  for (let n = 1; n <= 100; n++) {
    const { adjustedXp, thresholds } = evaluateEncounter(partyLevels, Array<string>(n).fill(cr));
    if (adjustedXp >= thresholds[target]) return n;
  }
  throw new Error(`No count up to 100 reaches ${target}`);
}

export function expectedFor(q: EvalQuery): Expected {
  const { spec } = q;
  const expected: Expected = {};
  if (spec.monsters) {
    expected.crs = Object.fromEntries(spec.monsters.map((m) => [m.name, srdCr(m.name)]));
    if (spec.partyLevels) {
      const crs = spec.monsters.flatMap((m) => Array<string>(m.count).fill(srdCr(m.name)));
      const result = evaluateEncounter(spec.partyLevels, crs);
      expected.difficulty = result.difficulty;
      expected.adjustedXp = result.adjustedXp;
    }
  }
  if (q.checks.includes('thresholds') && spec.partyLevels) expected.thresholds = partyThresholds(spec.partyLevels);
  if (spec.monsterCount && spec.partySize) expected.multiplier = encounterMultiplier(spec.monsterCount, spec.partySize);
  if (spec.monster && spec.partyLevels && spec.target) {
    expected.count = minCountFor(spec.partyLevels, spec.monster, spec.target);
  }
  if (q.checks.includes('search')) {
    const { monsters } = searchMonsters({ maxCr: spec.maxCr, movement: spec.movement, limit: 1000 });
    expected.validSearchNames = new Set(monsters.map((m) => m.name.toLowerCase()));
  }
  return expected;
}

// One-line human-readable expected answer for the results table.
export function describeExpected(q: EvalQuery, e: Expected): string {
  const parts: string[] = [];
  if (e.crs) parts.push(Object.entries(e.crs).map(([n, cr]) => `${n} CR ${cr}`).join(', '));
  if (e.adjustedXp !== undefined) parts.push(`${e.adjustedXp} adjusted XP`);
  if (e.difficulty) parts.push(e.difficulty);
  if (e.thresholds) parts.push(`thresholds ${Object.values(e.thresholds).join('/')}`);
  if (e.multiplier !== undefined) parts.push(`x${e.multiplier}`);
  if (e.count !== undefined) parts.push(`${e.count} ${q.spec.monster}`);
  if (e.validSearchNames) parts.push(`${e.validSearchNames.size} valid SRD matches`);
  if (q.spec.targets) parts.push(`encounter rated ${q.spec.targets.join(' or ')}`);
  return parts.length > 0 ? parts.join('; ') : q.expectedBehavior;
}
