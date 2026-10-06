import {
  MULTIPLIER_STEPS,
  THRESHOLD_TIERS,
  XP_BY_CR,
  XP_THRESHOLDS_BY_LEVEL,
  baseMultiplierIndex,
  type ThresholdTier,
  type Thresholds,
} from './tables';

// Only the 2014 DMG rules exist today. The 2024 per-character budget is a later addition.
export type Ruleset = 'dmg2014';

// 'trivial' means the adjusted XP is below the Easy threshold.
export type Difficulty = 'trivial' | ThresholdTier;

export type ChallengeRating = string | number;

export interface EncounterResult {
  ruleset: Ruleset;
  partySize: number;
  thresholds: Thresholds;
  monsterCount: number;
  baseXp: number;
  multiplier: number;
  adjustedXp: number;
  difficulty: Difficulty;
  nextTier: { difficulty: ThresholdTier; xpNeeded: number } | null;
}

const FRACTIONAL_CRS: Readonly<Record<number, string>> = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };

export function normalizeCr(cr: ChallengeRating): string {
  const key = typeof cr === 'number' ? (FRACTIONAL_CRS[cr] ?? String(cr)) : cr.trim();
  if (!(key in XP_BY_CR)) throw new RangeError(`Unknown challenge rating: ${cr}`);
  return key;
}

export function crToXp(cr: ChallengeRating): number {
  return XP_BY_CR[normalizeCr(cr)];
}

export function partyThresholds(levels: number[]): Thresholds {
  if (levels.length === 0) throw new RangeError('Party must have at least one character');
  const total: Thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const level of levels) {
    const row = XP_THRESHOLDS_BY_LEVEL[level];
    if (!Number.isInteger(level) || !row) throw new RangeError(`Character level must be 1-20, got ${level}`);
    for (const tier of THRESHOLD_TIERS) total[tier] += row[tier];
  }
  return total;
}

export function encounterMultiplier(monsterCount: number, partySize: number): number {
  let index = baseMultiplierIndex(monsterCount);
  if (partySize < 3) index += 1;
  else if (partySize >= 6) index -= 1;
  return MULTIPLIER_STEPS[index];
}

export function rateDifficulty(adjustedXp: number, thresholds: Thresholds): Difficulty {
  let difficulty: Difficulty = 'trivial';
  for (const tier of THRESHOLD_TIERS) {
    if (adjustedXp >= thresholds[tier]) difficulty = tier;
  }
  return difficulty;
}

export function evaluateEncounter(
  partyLevels: number[],
  monsterCrs: ChallengeRating[],
  ruleset: Ruleset = 'dmg2014',
): EncounterResult {
  const thresholds = partyThresholds(partyLevels);
  const baseXp = monsterCrs.reduce<number>((sum, cr) => sum + crToXp(cr), 0);
  const multiplier = monsterCrs.length === 0 ? 1 : encounterMultiplier(monsterCrs.length, partyLevels.length);
  const adjustedXp = baseXp * multiplier;
  const difficulty = rateDifficulty(adjustedXp, thresholds);

  const next = THRESHOLD_TIERS.find((tier) => thresholds[tier] > adjustedXp);
  const nextTier = next ? { difficulty: next, xpNeeded: thresholds[next] - adjustedXp } : null;

  return {
    ruleset,
    partySize: partyLevels.length,
    thresholds,
    monsterCount: monsterCrs.length,
    baseXp,
    multiplier,
    adjustedXp,
    difficulty,
    nextTier,
  };
}
