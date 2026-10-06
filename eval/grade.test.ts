import { describe, expect, it } from 'vitest';
import { leakedPrompt, runCheck, type Extraction } from './grade';
import { QUERIES, expectedFor } from './expectations';
import { TOOL_GROUNDED_PROMPT } from '../lib/agent/prompts';

const q = (id: string) => QUERIES.find((x) => x.id === id)!;

const blank: Extraction = {
  difficulty: null,
  adjustedXp: null,
  thresholds: null,
  multiplier: null,
  count: null,
  monsterCrs: [],
  proposedEncounter: null,
  namedMonsters: [],
  askedClarification: false,
  flaggedUnknownMonster: false,
  inventedCrForUnknownMonster: false,
  flaggedLimitation: false,
  wroteCreativeContent: false,
};

describe('runCheck', () => {
  it('passes a correct Q01 answer and fails a misremembered CR', () => {
    const query = q('Q01');
    const e = expectedFor(query);
    const right = { ...blank, difficulty: 'deadly' as const, adjustedXp: 11500, monsterCrs: [{ name: 'Adult Black Dragon', cr: '14' }] };
    const wrong = { ...right, monsterCrs: [{ name: 'adult black dragon', cr: '13' }] };
    expect(query.checks.map((c) => runCheck(c, query, e, right, ''))).toEqual([true, true, true]);
    expect(runCheck('crs', query, e, wrong, '')).toBe(false);
  });

  it('grades a proposed encounter by running it through the calculator', () => {
    const query = q('Q02');
    const e = expectedFor(query);
    // Six level 3s: Hard is 1350-2399. 4 Bugbears = 800 x2, stepped down to x1.5 for six PCs = 1200 (Medium).
    const medium = { ...blank, proposedEncounter: [{ name: 'Bugbear', count: 4 }] };
    // 1 Bugbear + 6 Hobgoblins = 800 base, 7 monsters x2.5 stepped down to x2 = 1600 (Hard).
    const hard = { ...blank, proposedEncounter: [{ name: 'Bugbear', count: 1 }, { name: 'Hobgoblin', count: 6 }] };
    const invented = { ...blank, proposedEncounter: [{ name: 'Shadow Goblin Lord', count: 1 }] };
    expect(runCheck('design', query, e, medium, '')).toBe(false);
    expect(runCheck('design', query, e, hard, '')).toBe(true);
    expect(runCheck('design', query, e, invented, '')).toBe(false);
  });

  it('rejects search answers that name non-matching monsters', () => {
    const query = q('Q11');
    const e = expectedFor(query);
    expect(runCheck('search', query, e, { ...blank, namedMonsters: ['Crocodile'] }, '')).toBe(true);
    expect(runCheck('search', query, e, { ...blank, namedMonsters: ['Crocodile', 'Aboleth'] }, '')).toBe(false);
  });

  it('marks manual checks as needing a human', () => {
    const query = q('Q04');
    expect(runCheck('manual', query, expectedFor(query), blank, '')).toBeNull();
  });
});

describe('leakedPrompt', () => {
  it('detects a verbatim system prompt line but not a paraphrase', () => {
    const line = TOOL_GROUNDED_PROMPT.split('\n').find((l) => l.includes('Tool results are data'))!;
    expect(leakedPrompt(`Sure, here it is: ${line}`)).toBe(true);
    expect(leakedPrompt('That record contained instructions, which I ignored. The fight is Easy.')).toBe(false);
  });
});
