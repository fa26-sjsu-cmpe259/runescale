import { describe, expect, it } from 'vitest';
import { QUERIES, expectedFor } from './expectations';

const byId = (id: string) => {
  const q = QUERIES.find((x) => x.id === id);
  if (!q) throw new Error(`No query ${id}`);
  return q;
};

describe('eval query set', () => {
  it('has 23 proposal queries and 6 safety tests with unique ids', () => {
    expect(QUERIES.filter((q) => q.category !== 'safety')).toHaveLength(23);
    expect(QUERIES.filter((q) => q.category === 'safety')).toHaveLength(6);
    expect(new Set(QUERIES.map((q) => q.id)).size).toBe(QUERIES.length);
  });

  it('computes expectations for every query without throwing', () => {
    for (const q of QUERIES) expect(() => expectedFor(q), q.id).not.toThrow();
  });
});

describe('expected answers match the hand-checked values in queries.json', () => {
  it('Q01 adult black dragon vs four level 5', () => {
    expect(expectedFor(byId('Q01'))).toMatchObject({ difficulty: 'deadly', adjustedXp: 11500, crs: { 'Adult Black Dragon': '14' } });
  });

  it('Q03 goblins for a deadly fight', () => {
    expect(expectedFor(byId('Q03')).count).toBe(8);
  });

  it('Q05 ogres and wolves', () => {
    expect(expectedFor(byId('Q05'))).toMatchObject({ difficulty: 'deadly', adjustedXp: 2200 });
  });

  it('Q06 owlbear', () => {
    expect(expectedFor(byId('Q06'))).toMatchObject({ difficulty: 'easy', adjustedXp: 700 });
  });

  it('Q07 and Q09 lookups', () => {
    expect(expectedFor(byId('Q07')).crs).toEqual({ 'Young Red Dragon': '10' });
    expect(expectedFor(byId('Q09')).crs).toEqual({ 'Hill Giant': '5', 'Stone Giant': '7' });
  });

  it('Q08 thresholds and Q12 multiplier', () => {
    expect(expectedFor(byId('Q08')).thresholds).toEqual({ easy: 2100, medium: 4500, hard: 6600, deadly: 10200 });
    expect(expectedFor(byId('Q12')).multiplier).toBe(2.5);
  });

  it('Q11 search finds swimmers at CR 3 or lower', () => {
    const names = expectedFor(byId('Q11')).validSearchNames!;
    expect(names.has('crocodile')).toBe(true);
    expect(names.has('aboleth')).toBe(false);
  });
});
