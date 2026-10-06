import { describe, expect, it } from 'vitest';
import { lookupMonster, searchMonsters } from '../data/monsters';
import { suggestAdjustments } from './suggest';

describe('lookupMonster', () => {
  it('matches names ignoring case, spaces and punctuation', () => {
    const result = lookupMonster('owl bear');
    expect(result.status).toBe('found');
    if (result.status === 'found') expect(result.monster).toMatchObject({ name: 'Owlbear', cr: '3' });
  });

  it('finds the monsters from the proposal queries', () => {
    for (const name of ['Adult Black Dragon', 'Young Red Dragon', 'Hill Giant', 'Stone Giant', 'Ogre', 'Wolf', 'Orc', 'Goblin']) {
      expect(lookupMonster(name).status, name).toBe('found');
    }
  });

  it('returns not_found with close matches for non-SRD monsters', () => {
    const result = lookupMonster('Orc War Chief');
    expect(result.status).toBe('not_found');
    if (result.status === 'not_found') expect(result.closeMatches).toContain('Orc');
  });
});

describe('searchMonsters', () => {
  it('filters by CR range and swim speed', () => {
    const { monsters } = searchMonsters({ maxCr: '3', movement: 'swim', limit: 50 });
    expect(monsters.length).toBeGreaterThan(0);
    for (const m of monsters) expect(m.speed.swim).toBeTruthy();
    expect(monsters.map((m) => m.name)).not.toContain('Aboleth');
  });
});

describe('suggestAdjustments', () => {
  it('only returns moves that hit the target difficulty', () => {
    const party = [3, 3, 3, 3];
    const suggestions = suggestAdjustments(party, [{ name: 'Bugbear', cr: '1', count: 1 }, { name: 'Hobgoblin', cr: '1/2', count: 3 }], 'deadly');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    for (const s of suggestions) expect(s.result.difficulty).toBe('deadly');
  });
});
