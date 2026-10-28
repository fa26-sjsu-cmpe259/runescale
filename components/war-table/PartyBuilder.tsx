import type { ReactElement } from 'react';

const MAX_PARTY = 8;

const stepButton = 'grid size-6 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';

function levelSummary(levels: number[]): string {
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  return lo === hi ? `level ${lo}` : `levels ${lo}–${hi}`;
}

export function PartyBuilder({ levels, deadlyXp, onChange }: { levels: number[]; deadlyXp: number; onChange: (levels: number[]) => void }): ReactElement {
  const setLevel = (index: number, level: number) =>
    onChange(levels.map((l, i) => (i === index ? Math.min(20, Math.max(1, level)) : l)));

  return (
    <section className="card flex flex-wrap items-center gap-2.5 px-4 py-3" aria-labelledby="party-heading">
      <h2 id="party-heading" className="label-caps mr-1.5">
        Party
      </h2>
      <ol className="contents">
        {levels.map((level, i) => (
          <li key={i} className="group flex items-center gap-1 rounded-full bg-chip py-1 pr-1.5 pl-1">
            <span className="grid size-[26px] place-items-center rounded-full bg-gold-soft text-xs font-bold text-gold-ink" aria-hidden>
              {i + 1}
            </span>
            <button type="button" className={stepButton} onClick={() => setLevel(i, level - 1)} disabled={level <= 1} aria-label={`Lower adventurer ${i + 1} level`}>
              −
            </button>
            <span className="min-w-[38px] text-center text-sm font-semibold" aria-live="polite">
              Lv {level}
            </span>
            <button type="button" className={stepButton} onClick={() => setLevel(i, level + 1)} disabled={level >= 20} aria-label={`Raise adventurer ${i + 1} level`}>
              +
            </button>
            <button
              type="button"
              className={`${stepButton} w-0 overflow-hidden opacity-0 transition-[width,opacity] group-focus-within:w-6 group-focus-within:opacity-100 group-hover:w-6 group-hover:opacity-100 hover:text-tier-deadly`}
              onClick={() => onChange(levels.filter((_, j) => j !== i))}
              disabled={levels.length <= 1}
              aria-label={`Remove adventurer ${i + 1}`}
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="rounded-full border border-dashed border-line px-3.5 py-1.5 font-medium text-muted hover:border-gold hover:text-ink disabled:opacity-30"
        onClick={() => onChange([...levels, levels[levels.length - 1] ?? 1])}
        disabled={levels.length >= MAX_PARTY}
      >
        + Add
      </button>
      <p className="w-full text-[13px] text-muted md:ml-auto md:w-auto">
        {levels.length} {levels.length === 1 ? 'adventurer' : 'adventurers'} · {levelSummary(levels)} · Deadly at {deadlyXp.toLocaleString()} XP
      </p>
    </section>
  );
}
