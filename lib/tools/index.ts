import { tool } from 'ai';
import { z } from 'zod';
import { evaluateEncounter, partyThresholds, normalizeCr } from '../rules/calculator';
import { lookupMonster, searchMonsters, type Monster } from '../data/monsters';
import { suggestAdjustments, type EncounterMonster } from './suggest';

const partyLevelsSchema = z
  .array(z.number().int().min(1).max(20))
  .min(1)
  .describe('One entry per character: that character\'s level (1-20). Four level-5 characters = [5, 5, 5, 5].');

const encounterMonstersSchema = z
  .array(
    z.object({
      name: z.string().describe('Monster name as written in the SRD, e.g. "Owlbear"'),
      count: z.number().int().min(1).default(1),
      cr: z
        .string()
        .optional()
        .describe('Only for homebrew or non-SRD monsters whose CR the user stated, e.g. "5" or "1/4"'),
    }),
  )
  .describe('Monsters in the encounter');

function summarize(m: Monster) {
  return { name: m.name, cr: m.cr, type: m.type, size: m.size, ac: m.ac, hp: m.hp, speed: m.speed, desc: m.desc };
}

type ResolvedMonsters =
  | { ok: true; monsters: EncounterMonster[] }
  | { ok: false; error: { status: 'not_found'; query: string; closeMatches: string[] }[] };

// Turns names into CRs from the SRD snapshot. A user-supplied CR is only used for
// monsters that are not in the SRD, so the data always wins over the model's memory.
function resolveMonsters(input: { name: string; count: number; cr?: string }[]): ResolvedMonsters {
  const monsters: EncounterMonster[] = [];
  const missing: { status: 'not_found'; query: string; closeMatches: string[] }[] = [];
  for (const m of input) {
    const found = lookupMonster(m.name);
    if (found.status === 'found') {
      monsters.push({ name: found.monster.name, cr: found.monster.cr, count: m.count });
    } else if (m.cr !== undefined) {
      monsters.push({ name: m.name, cr: normalizeCr(m.cr), count: m.count });
    } else {
      missing.push(found);
    }
  }
  return missing.length > 0 ? { ok: false, error: missing } : { ok: true, monsters };
}

function expandCrs(monsters: EncounterMonster[]): string[] {
  return monsters.flatMap((m) => Array<string>(m.count).fill(m.cr));
}

export const runescaleTools = {
  lookup_monster: tool({
    description:
      'Look up one monster in the 5e SRD by name. Returns its CR, XP-relevant stats, type, size and speeds, or not_found with close matches.',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      const result = lookupMonster(name);
      return result.status === 'found' ? { status: 'found' as const, monster: summarize(result.monster) } : result;
    },
  }),

  search_monsters: tool({
    description: 'Search SRD monsters by CR range, creature type, size, environment, or movement type.',
    inputSchema: z.object({
      minCr: z.string().optional().describe('Lowest CR to include, e.g. "1/4"'),
      maxCr: z.string().optional().describe('Highest CR to include, e.g. "3"'),
      type: z.string().optional().describe('Creature type, e.g. "Beast", "Undead"'),
      size: z.string().optional().describe('Size, e.g. "Large"'),
      environment: z.string().optional().describe('Environment, e.g. "Forest", "Underdark"'),
      movement: z.enum(['swim', 'fly', 'climb', 'burrow']).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (filters) => {
      const { total, monsters } = searchMonsters(filters);
      return { total, shown: monsters.length, monsters: monsters.map(summarize) };
    },
  }),

  get_party_thresholds: tool({
    description: 'Sum the 2014 DMG XP thresholds (easy/medium/hard/deadly) for a party. Handles mixed levels.',
    inputSchema: z.object({ partyLevels: partyLevelsSchema }),
    execute: async ({ partyLevels }) => ({ partySize: partyLevels.length, thresholds: partyThresholds(partyLevels) }),
  }),

  evaluate_encounter: tool({
    description:
      'Rate an encounter with the 2014 DMG rules: base XP, encounter multiplier (with party-size adjustment), adjusted XP, difficulty, and XP to the next tier.',
    inputSchema: z.object({ partyLevels: partyLevelsSchema, monsters: encounterMonstersSchema }),
    execute: async ({ partyLevels, monsters }) => {
      const resolved = resolveMonsters(monsters);
      if (!resolved.ok) return { status: 'unknown_monsters' as const, unknown: resolved.error };
      return {
        status: 'ok' as const,
        monsters: resolved.monsters,
        ...evaluateEncounter(partyLevels, expandCrs(resolved.monsters)),
      };
    },
  }),

  suggest_adjustments: tool({
    description:
      'Find single add/remove/swap changes that move an encounter to a target difficulty. Pick from these instead of inventing changes.',
    inputSchema: z.object({
      partyLevels: partyLevelsSchema,
      monsters: encounterMonstersSchema,
      target: z.enum(['easy', 'medium', 'hard', 'deadly']),
    }),
    execute: async ({ partyLevels, monsters, target }) => {
      const resolved = resolveMonsters(monsters);
      if (!resolved.ok) return { status: 'unknown_monsters' as const, unknown: resolved.error };
      const suggestions = suggestAdjustments(partyLevels, resolved.monsters, target);
      return {
        status: 'ok' as const,
        suggestions: suggestions.map((s) => ({
          change: s.change,
          monsters: s.monsters,
          adjustedXp: s.result.adjustedXp,
          difficulty: s.result.difficulty,
        })),
      };
    },
  }),
};

export type RunescaleTools = typeof runescaleTools;
