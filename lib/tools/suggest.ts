import { evaluateEncounter, type EncounterResult } from '../rules/calculator';
import type { ThresholdTier } from '../rules/tables';
import { MONSTERS, crToNumber } from '../data/monsters';

export interface EncounterMonster {
  name: string;
  cr: string;
  count: number;
}

export interface Adjustment {
  change: string;
  monsters: EncounterMonster[];
  result: EncounterResult;
}

function evaluate(partyLevels: number[], monsters: EncounterMonster[]): EncounterResult {
  return evaluateEncounter(
    partyLevels,
    monsters.flatMap((m) => Array<string>(m.count).fill(m.cr)),
  );
}

function withCount(monsters: EncounterMonster[], index: number, delta: number): EncounterMonster[] {
  return monsters
    .map((m, i) => (i === index ? { ...m, count: m.count + delta } : m))
    .filter((m) => m.count > 0);
}

function addMonster(monsters: EncounterMonster[], extra: EncounterMonster): EncounterMonster[] {
  const existing = monsters.findIndex((m) => m.name === extra.name);
  return existing === -1 ? [...monsters, extra] : withCount(monsters, existing, extra.count);
}

// One SRD monster per CR among creature types already in the fight, so suggestions stay on theme.
function candidatePool(monsters: EncounterMonster[]): EncounterMonster[] {
  const types = new Set(
    monsters.map((m) => MONSTERS.find((s) => s.name === m.name)?.type).filter((t): t is string => !!t),
  );
  const pool = types.size > 0 ? MONSTERS.filter((m) => types.has(m.type)) : MONSTERS;
  const byCr = new Map<string, EncounterMonster>();
  for (const m of pool) {
    if (!byCr.has(m.cr)) byCr.set(m.cr, { name: m.name, cr: m.cr, count: 1 });
  }
  return [...byCr.values()].sort((a, b) => crToNumber(a.cr) - crToNumber(b.cr));
}

// Deterministic search over single add/remove/swap moves that land the encounter on the
// target difficulty. Results are ranked by how close they sit to the middle of the target band.
export function suggestAdjustments(
  partyLevels: number[],
  monsters: EncounterMonster[],
  target: ThresholdTier,
  limit = 5,
): Adjustment[] {
  const candidates: Omit<Adjustment, 'result'>[] = [];

  monsters.forEach((m, i) => {
    if (monsters.reduce((n, x) => n + x.count, 0) > 1) {
      candidates.push({ change: `Remove 1 ${m.name}`, monsters: withCount(monsters, i, -1) });
    }
    for (const extra of [1, 2]) {
      candidates.push({ change: `Add ${extra} more ${m.name}`, monsters: withCount(monsters, i, extra) });
    }
  });

  for (const p of candidatePool(monsters)) {
    if (!monsters.some((m) => m.name === p.name)) {
      candidates.push({ change: `Add 1 ${p.name} (CR ${p.cr})`, monsters: addMonster(monsters, p) });
    }
    monsters.forEach((m, i) => {
      if (m.name === p.name) return;
      candidates.push({
        change: `Swap 1 ${m.name} for 1 ${p.name} (CR ${p.cr})`,
        monsters: addMonster(withCount(monsters, i, -1), p),
      });
    });
  }

  return candidates
    .map((c) => ({ ...c, result: evaluate(partyLevels, c.monsters) }))
    .filter((c) => c.result.difficulty === target)
    .map((c) => {
      const { thresholds } = c.result;
      const low = thresholds[target];
      const high = c.result.nextTier?.difficulty ? thresholds[c.result.nextTier.difficulty] : low * 1.5;
      return { adjustment: c, distance: Math.abs(c.result.adjustedXp - (low + high) / 2) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((s) => s.adjustment);
}
