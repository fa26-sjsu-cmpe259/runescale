'use client';

import { useState, type ReactElement } from 'react';
import { evaluateEncounter } from '@/lib/rules/calculator';
import { ChatPanel } from './ChatPanel';
import { DifficultyMeter } from './DifficultyMeter';
import { MonsterBoard } from './MonsterBoard';
import { PartyBuilder } from './PartyBuilder';
import type { BoardMonster, MonsterOption } from './types';

export function WarTable({ monsters: options }: { monsters: MonsterOption[] }): ReactElement {
  const [partyLevels, setPartyLevels] = useState<number[]>([5, 5, 5, 5]);
  const [monsters, setMonsters] = useState<BoardMonster[]>([]);

  // The meter runs the same calculator as the tools, client-side, so it updates with no LLM call.
  const result = evaluateEncounter(partyLevels, monsters.flatMap((m) => Array<string>(m.count).fill(m.cr)));
  const board = { partyLevels, monsters: monsters.map(({ name, cr, count }) => ({ name, cr, count })) };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-[18px] px-4 py-5 md:px-7 lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="font-display flex items-center gap-2.5 text-[26px] tracking-[0.04em] text-[#e3c58a] [text-shadow:0_0_18px_rgb(227_197_138/0.35)]">
          <svg viewBox="0 0 32 32" className="size-[26px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M16 3v26M6 9h20M6 9l-4 9h8zM26 9l-4 9h8zM10 29h12" />
          </svg>
          Runescale
        </h1>
        <p className="ml-auto flex gap-2 text-xs font-semibold tracking-wide text-muted">
          <span className="rounded-full bg-chip px-2.5 py-1">2014 DMG</span>
          <span className="rounded-full bg-chip px-2.5 py-1">SRD 5.1 · {options.length} monsters</span>
        </p>
      </header>

      <PartyBuilder levels={partyLevels} deadlyXp={result.thresholds.deadly} onChange={setPartyLevels} />

      <div className="grid flex-1 grid-cols-1 gap-[18px] lg:min-h-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(380px,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="card flex min-w-0 flex-col gap-4 p-5 lg:min-h-0">
          <h2 className="label-caps">Encounter</h2>
          <DifficultyMeter result={result} />
          <MonsterBoard options={options} monsters={monsters} onChange={setMonsters} />
        </div>
        <ChatPanel board={board} options={options} onApply={setMonsters} />
      </div>
    </div>
  );
}
