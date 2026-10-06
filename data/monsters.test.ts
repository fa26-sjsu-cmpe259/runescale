import { describe, expect, it } from 'vitest';
import { crToXp } from '../lib/rules/calculator';
import snapshot from './monsters.json';

describe('monsters.json snapshot', () => {
  it('has every SRD monster with a CR the calculator understands', () => {
    expect(snapshot.monsters).toHaveLength(snapshot.count);
    for (const monster of snapshot.monsters) {
      expect(() => crToXp(monster.cr), monster.name).not.toThrow();
    }
  });

  it('has unique slugs', () => {
    const slugs = new Set(snapshot.monsters.map((m) => m.slug));
    expect(slugs.size).toBe(snapshot.monsters.length);
  });
});
