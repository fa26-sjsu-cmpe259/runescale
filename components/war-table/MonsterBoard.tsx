'use client';

import Fuse from 'fuse.js';
import { useMemo, useState, type ReactElement } from 'react';
import { crToXp } from '@/lib/rules/calculator';
import type { BoardMonster, MonsterOption } from './types';

const stepButton =
  'grid size-7 place-items-center rounded-rune border border-line text-ink-muted hover:border-rune hover:text-ink';

function crValue(cr: string): number {
  const [n, d] = cr.split('/').map(Number);
  return d ? n / d : n;
}

// The strongest creature gets the center sigil slot. A 3D model can replace this card later without layout changes.
function BossSigil({ monster }: { monster: BoardMonster }): ReactElement {
  return (
    <figure className="mx-auto flex w-48 flex-col items-center gap-2 py-2">
      <div className="relative grid size-32 place-items-center rounded-full border border-rune/60 shadow-[0_0_24px_rgb(157_123_255/0.35)]">
        <div className="absolute inset-2 rounded-full border border-dashed border-line" aria-hidden />
        <span className="font-display text-5xl text-rune-soft" aria-hidden>
          {monster.type.charAt(0)}
        </span>
      </div>
      <figcaption className="text-center">
        <span className="font-display block text-lg">{monster.name}</span>
        <span className="text-sm text-ink-muted">
          {monster.size} {monster.type.toLowerCase()} · CR {monster.cr}
        </span>
      </figcaption>
    </figure>
  );
}

export function MonsterBoard({
  options,
  monsters,
  onChange,
}: {
  options: MonsterOption[];
  monsters: BoardMonster[];
  onChange: (monsters: BoardMonster[]) => void;
}): ReactElement {
  const [query, setQuery] = useState('');
  const fuse = useMemo(() => new Fuse(options, { keys: ['name', 'type'], threshold: 0.35 }), [options]);
  const results = query.trim() ? fuse.search(query, { limit: 8 }).map((r) => r.item) : [];
  const boss = monsters.reduce<BoardMonster | null>((top, m) => (!top || crValue(m.cr) > crValue(top.cr) ? m : top), null);

  const add = (option: MonsterOption) => {
    const existing = monsters.find((m) => m.name === option.name);
    onChange(existing ? monsters.map((m) => (m === existing ? { ...m, count: m.count + 1 } : m)) : [...monsters, { ...option, count: 1 }]);
    setQuery('');
  };
  const setCount = (name: string, count: number) =>
    onChange(count <= 0 ? monsters.filter((m) => m.name !== name) : monsters.map((m) => (m.name === name ? { ...m, count } : m)));

  return (
    <section className="rune-panel flex flex-col gap-3 p-4" aria-labelledby="board-heading">
      <h2 id="board-heading" className="font-display text-lg text-rune-soft">
        The Battlefield
      </h2>

      <div className="relative">
        <label htmlFor="monster-search" className="sr-only">
          Search SRD monsters
        </label>
        <input
          id="monster-search"
          className="w-full rounded-rune border border-line bg-void px-3 py-2 placeholder:text-ink-muted/70"
          placeholder="Summon a monster: owlbear, goblin, dragon..."
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) add(results[0]);
            if (e.key === 'Escape') setQuery('');
          }}
          autoComplete="off"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-rune border border-line bg-panel-raised shadow-xl">
            {results.map((r) => (
              <li key={r.name}>
                <button type="button" className="flex w-full justify-between px-3 py-2 text-left hover:bg-line focus-visible:bg-line" onClick={() => add(r)}>
                  <span>{r.name}</span>
                  <span className="text-sm text-ink-muted">
                    CR {r.cr} · {crToXp(r.cr).toLocaleString()} XP
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {boss ? <BossSigil monster={boss} /> : <p className="py-10 text-center text-ink-muted">The field is empty. Summon something.</p>}

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {monsters.map((m) => (
          <li key={m.name} className="flex items-center gap-2 rounded-rune bg-panel-raised px-3 py-2">
            <span className="flex-1">
              {m.name}
              <span className="block text-xs text-ink-muted">
                CR {m.cr} · {crToXp(m.cr).toLocaleString()} XP each
              </span>
            </span>
            <button type="button" className={stepButton} onClick={() => setCount(m.name, m.count - 1)} aria-label={`One fewer ${m.name}`}>
              −
            </button>
            <span className="w-6 text-center" aria-label={`${m.count} ${m.name}`}>
              {m.count}
            </span>
            <button type="button" className={stepButton} onClick={() => setCount(m.name, m.count + 1)} aria-label={`One more ${m.name}`}>
              +
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
