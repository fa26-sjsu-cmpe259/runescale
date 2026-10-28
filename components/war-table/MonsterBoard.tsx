'use client';

import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { crToXp } from '@/lib/rules/calculator';
import type { BoardMonster, MonsterOption } from './types';

const QUICK_ADD = ['Goblin', 'Orc', 'Skeleton', 'Owlbear', 'Ogre', 'Young Red Dragon'];

const stepButton = 'grid size-[30px] place-items-center rounded-full text-base text-muted hover:bg-hover hover:text-ink';

function crValue(cr: string): number {
  const [n, d] = cr.split('/').map(Number);
  return d ? n / d : n;
}

// One line-art glyph per creature family; anything unlisted gets the rune.
const GLYPHS: Record<string, string> = {
  Dragon: 'M4 22c3-1 5-4 6-8l3 3 3-7 3 7 3-3c1 4 3 7 6 8-4 0-7 2-12 6-5-4-8-6-12-6z',
  Humanoid: 'M9 13l-4-5 6 2M23 13l4-5-6 2M9 12c0-3 3-5 7-5s7 2 7 5v5c0 4-3 8-7 8s-7-4-7-8z',
  Giant: 'M10 9a6 6 0 0 1 12 0v4H10zM8 13h16l-2 14H10z',
  Beast: 'M8 8l3 5M24 8l-3 5M7 17c0-5 4-8 9-8s9 3 9 8-4 9-9 9-9-4-9-9zM13 21h6',
  Monstrosity: 'M6 12l4-6 3 5 3-6 3 6 3-5 4 6c0 8-4 14-10 14S6 20 6 12z',
  Undead: 'M9 14a7 7 0 0 1 14 0v5l-2 2v4h-3v-3h-4v3h-3v-4l-2-2z',
  Fiend: 'M8 4l3 7M24 4l-3 7M8 15c0-4 4-6 8-6s8 2 8 6-3 11-8 13c-5-2-8-9-8-13z',
  Celestial: 'M16 4v6M10 7l2 4M22 7l-2 4M9 16a7 7 0 0 0 14 0zM12 26h8',
  Elemental: 'M16 4c4 6 8 9 8 15a8 8 0 0 1-16 0c0-3 2-5 3-7 1 3 3 4 3 4 0-5 2-8 2-12z',
};
const RUNE = 'M16 4l10 6v12l-10 6-10-6V10zM16 4v24M6 10l20 12M26 10L6 22';

function Glyph({ type }: { type: string }): ReactElement {
  return (
    <span className="hidden size-[52px] shrink-0 place-items-center rounded-lg sm:grid bg-[radial-gradient(circle,#3a2f1f,#1d1914)] text-gold" aria-hidden>
      <svg viewBox="0 0 32 32" className="size-[30px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d={GLYPHS[type] ?? RUNE} />
      </svg>
    </span>
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
  const searchRef = useRef<HTMLInputElement>(null);
  const fuse = useMemo(() => new Fuse(options, { keys: ['name', 'type'], threshold: 0.35 }), [options]);
  const quick = useMemo(() => QUICK_ADD.flatMap((name) => options.filter((o) => o.name === name)), [options]);
  const results = query.trim() ? fuse.search(query, { limit: 8 }).map((r) => r.item) : [];
  const boss = monsters.reduce<BoardMonster | null>((top, m) => (!top || crValue(m.cr) > crValue(top.cr) ? m : top), null);

  // "/" jumps to search from anywhere that isn't already a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const add = (option: MonsterOption) => {
    const existing = monsters.find((m) => m.name === option.name);
    onChange(existing ? monsters.map((m) => (m === existing ? { ...m, count: m.count + 1 } : m)) : [...monsters, { ...option, count: 1 }]);
    setQuery('');
  };
  const setCount = (name: string, count: number) =>
    onChange(count <= 0 ? monsters.filter((m) => m.name !== name) : monsters.map((m) => (m.name === name ? { ...m, count } : m)));

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" aria-labelledby="foes-heading">
      <h2 id="foes-heading" className="label-caps">
        Foes
      </h2>

      <div className="relative">
        <label htmlFor="monster-search" className="sr-only">
          Search SRD monsters
        </label>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={searchRef}
          id="monster-search"
          className="w-full rounded-lg border border-line bg-inset py-2.5 pr-12 pl-10 placeholder:text-muted focus:border-gold focus:outline-none"
          placeholder={`Search ${options.length} SRD monsters…`}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) add(results[0]);
            if (e.key === 'Escape') setQuery('');
          }}
          autoComplete="off"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line px-1.5 text-[11px] font-semibold text-muted" aria-hidden>
          /
        </kbd>
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-row p-1 shadow-2xl">
            {results.map((r) => (
              <li key={r.name}>
                <button type="button" className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-hover focus-visible:bg-hover" onClick={() => add(r)}>
                  <span>
                    {r.name}
                    <span className="block text-xs text-muted">
                      {r.size} {r.type.toLowerCase()}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    CR {r.cr} · {crToXp(r.cr).toLocaleString()} XP
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        Common:
        {quick.map((o) => (
          <button key={o.name} type="button" className="rounded-full bg-chip px-3 py-1 font-medium hover:bg-hover hover:text-ink" onClick={() => add(o)}>
            {o.name}
          </button>
        ))}
      </div>

      {monsters.length === 0 ? (
        <p className="grid flex-1 place-items-center rounded-lg border border-dashed border-line py-10 text-center text-muted">
          No foes yet. Search above or pick a common monster.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {monsters.map((m) => (
            <li
              key={m.name}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-2.5 sm:grid-cols-[52px_1fr_auto_auto] sm:gap-3.5 rounded-lg px-3 py-2.5 ${m === boss ? 'bg-[linear-gradient(90deg,rgb(212_174_106/0.12),var(--color-row)_60%)]' : 'bg-row'}`}
            >
              <Glyph type={m.type} />
              <span className="min-w-0">
                <span className="block font-semibold">{m.name}</span>
                <span className="block text-[13px] text-muted">
                  {m.size} {m.type.toLowerCase()} · {crToXp(m.cr).toLocaleString()} XP{m.count > 1 ? ' each' : ''}
                </span>
              </span>
              <span className="font-display rounded-md bg-[#2c2418] px-2 py-1 text-[13px] font-bold whitespace-nowrap text-gold-ink">CR {m.cr}</span>
              <span className="flex items-center rounded-full bg-chip">
                <button type="button" className={stepButton} onClick={() => setCount(m.name, m.count - 1)} aria-label={`One fewer ${m.name}`}>
                  −
                </button>
                <span className="min-w-[22px] text-center font-semibold" aria-label={`${m.count} ${m.name}`}>
                  {m.count}
                </span>
                <button type="button" className={stepButton} onClick={() => setCount(m.name, m.count + 1)} aria-label={`One more ${m.name}`}>
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
