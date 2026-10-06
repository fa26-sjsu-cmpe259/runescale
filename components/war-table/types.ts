import type { Difficulty } from '@/lib/rules/calculator';

export interface MonsterOption {
  name: string;
  cr: string;
  type: string;
  size: string;
}

export interface BoardMonster extends MonsterOption {
  count: number;
}

export const TIER_LABELS: Record<Difficulty, string> = {
  trivial: 'Trivial',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  deadly: 'Deadly',
};

export const TIER_COLORS: Record<Difficulty, string> = {
  trivial: 'var(--color-tier-trivial)',
  easy: 'var(--color-tier-easy)',
  medium: 'var(--color-tier-medium)',
  hard: 'var(--color-tier-hard)',
  deadly: 'var(--color-tier-deadly)',
};
