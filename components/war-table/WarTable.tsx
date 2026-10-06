'use client';

import { useState, type ReactElement } from 'react';
import { evaluateEncounter } from '@/lib/rules/calculator';
import { ChatPanel } from './ChatPanel';
import { DifficultyMeter } from './DifficultyMeter';
import { MonsterBoard } from './MonsterBoard';
import { PartyBuilder } from './PartyBuilder';
import type { BoardMonster, MonsterOption } from './types';

// Fixed positions and timings so server and client render the same embers.
const EMBERS = [
  { left: '8%', delay: '0s', duration: '14s', dx: '20px' },
  { left: '23%', delay: '5s', duration: '18s', dx: '-30px' },
  { left: '47%', delay: '9s', duration: '16s', dx: '25px' },
  { left: '71%', delay: '2s', duration: '20s', dx: '-15px' },
  { left: '88%', delay: '12s', duration: '15s', dx: '30px' },
];

export function WarTable({ monsters: options }: { monsters: MonsterOption[] }): ReactElement {
  const [partyLevels, setPartyLevels] = useState<number[]>([5, 5, 5, 5]);
  const [monsters, setMonsters] = useState<BoardMonster[]>([]);

  // The meter runs the same calculator as the tools, client-side, so it updates with no LLM call.
  const result = evaluateEncounter(partyLevels, monsters.flatMap((m) => Array<string>(m.count).fill(m.cr)));
  const board = { partyLevels, monsters: monsters.map(({ name, cr, count }) => ({ name, cr, count })) };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 md:p-6">
      {EMBERS.map((e) => (
        <span
          key={e.left}
          className="ember"
          aria-hidden
          style={{ left: e.left, animationDelay: e.delay, animationDuration: e.duration, ['--ember-dx' as string]: e.dx }}
        />
      ))}

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl text-rune-soft drop-shadow-[0_0_10px_rgb(157_123_255/0.5)]">Runescale</h1>
        <p className="text-sm text-ink-muted">Weigh the party against the horde · 2014 DMG rules · SRD monsters</p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(320px,1.4fr)_minmax(340px,1.4fr)]">
        <div className="flex flex-col gap-4">
          <DifficultyMeter result={result} />
          <PartyBuilder levels={partyLevels} onChange={setPartyLevels} />
        </div>
        <MonsterBoard options={options} monsters={monsters} onChange={setMonsters} />
        <ChatPanel board={board} options={options} onApply={setMonsters} />
      </div>
    </div>
  );
}
