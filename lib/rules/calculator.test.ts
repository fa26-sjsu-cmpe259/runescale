import { describe, expect, it } from 'vitest';
import {
  crToXp,
  encounterMultiplier,
  evaluateEncounter,
  partyThresholds,
  rateDifficulty,
} from './calculator';

describe('crToXp', () => {
  it('maps fractional CRs given as strings or numbers', () => {
    expect(crToXp('1/8')).toBe(25);
    expect(crToXp(0.25)).toBe(50);
    expect(crToXp('1/2')).toBe(100);
    expect(crToXp(0.5)).toBe(100);
  });

  it('maps whole CRs across the table', () => {
    expect(crToXp(0)).toBe(10);
    expect(crToXp('3')).toBe(700);
    expect(crToXp(10)).toBe(5900);
    expect(crToXp(30)).toBe(155000);
  });

  it('rejects CRs that do not exist', () => {
    expect(() => crToXp('31')).toThrow(RangeError);
    expect(() => crToXp(0.3)).toThrow(RangeError);
    expect(() => crToXp('dragon')).toThrow(RangeError);
  });
});

describe('partyThresholds', () => {
  it('sums per-character thresholds for four 3rd-level characters', () => {
    expect(partyThresholds([3, 3, 3, 3])).toEqual({ easy: 300, medium: 600, hard: 900, deadly: 1600 });
  });

  it('handles mixed-level parties', () => {
    expect(partyThresholds([3, 3, 3, 2])).toEqual({ easy: 275, medium: 550, hard: 825, deadly: 1400 });
    expect(partyThresholds([1, 20])).toEqual({ easy: 2825, medium: 5750, hard: 8575, deadly: 12800 });
  });

  it('rejects empty parties and out-of-range levels', () => {
    expect(() => partyThresholds([])).toThrow(RangeError);
    expect(() => partyThresholds([0])).toThrow(RangeError);
    expect(() => partyThresholds([21])).toThrow(RangeError);
    expect(() => partyThresholds([2.5])).toThrow(RangeError);
  });
});

describe('encounterMultiplier', () => {
  it('follows the DMG table for a party of 3-5', () => {
    expect(encounterMultiplier(1, 4)).toBe(1);
    expect(encounterMultiplier(2, 4)).toBe(1.5);
    expect(encounterMultiplier(3, 4)).toBe(2);
    expect(encounterMultiplier(6, 4)).toBe(2);
    expect(encounterMultiplier(7, 4)).toBe(2.5);
    expect(encounterMultiplier(10, 4)).toBe(2.5);
    expect(encounterMultiplier(11, 4)).toBe(3);
    expect(encounterMultiplier(14, 4)).toBe(3);
    expect(encounterMultiplier(15, 4)).toBe(4);
  });

  it('steps up for parties of fewer than three', () => {
    expect(encounterMultiplier(1, 2)).toBe(1.5);
    expect(encounterMultiplier(15, 1)).toBe(5);
  });

  it('steps down for parties of six or more', () => {
    expect(encounterMultiplier(1, 6)).toBe(0.5);
    expect(encounterMultiplier(3, 7)).toBe(1.5);
    expect(encounterMultiplier(15, 6)).toBe(3);
  });
});

describe('rateDifficulty', () => {
  const thresholds = { easy: 300, medium: 600, hard: 900, deadly: 1600 };

  it('treats meeting a threshold exactly as reaching that tier', () => {
    expect(rateDifficulty(299, thresholds)).toBe('trivial');
    expect(rateDifficulty(300, thresholds)).toBe('easy');
    expect(rateDifficulty(900, thresholds)).toBe('hard');
    expect(rateDifficulty(1600, thresholds)).toBe('deadly');
  });
});

describe('evaluateEncounter', () => {
  it('rates the DMG example: bugbear and three hobgoblins vs four 3rd-level characters', () => {
    const result = evaluateEncounter([3, 3, 3, 3], ['1', '1/2', '1/2', '1/2']);
    expect(result).toMatchObject({
      ruleset: 'dmg2014',
      monsterCount: 4,
      baseXp: 500,
      multiplier: 2,
      adjustedXp: 1000,
      difficulty: 'hard',
      nextTier: { difficulty: 'deadly', xpNeeded: 600 },
    });
  });

  it('applies the small-party adjustment', () => {
    const result = evaluateEncounter([5, 5], [3]);
    expect(result.multiplier).toBe(1.5);
    expect(result.adjustedXp).toBe(1050);
    expect(result.difficulty).toBe('medium');
  });

  it('returns no next tier once the encounter is deadly', () => {
    expect(evaluateEncounter([1], ['2']).nextTier).toBeNull();
  });

  it('handles an empty board without throwing', () => {
    const result = evaluateEncounter([4, 4, 4, 4], []);
    expect(result).toMatchObject({ baseXp: 0, adjustedXp: 0, difficulty: 'trivial' });
    expect(result.nextTier).toEqual({ difficulty: 'easy', xpNeeded: 500 });
  });
});
