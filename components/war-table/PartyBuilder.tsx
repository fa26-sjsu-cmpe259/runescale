import type { ReactElement } from 'react';

const MAX_PARTY = 8;

const stepButton =
  'grid size-7 place-items-center rounded-rune border border-line text-ink-muted hover:border-rune hover:text-ink disabled:opacity-30';

export function PartyBuilder({ levels, onChange }: { levels: number[]; onChange: (levels: number[]) => void }): ReactElement {
  const setLevel = (index: number, level: number) =>
    onChange(levels.map((l, i) => (i === index ? Math.min(20, Math.max(1, level)) : l)));

  return (
    <section className="rune-panel flex flex-col gap-3 p-4" aria-labelledby="party-heading">
      <h2 id="party-heading" className="font-display text-lg text-rune-soft">
        The Party
      </h2>
      <ol className="flex flex-col gap-2">
        {levels.map((level, i) => (
          <li key={i} className="flex items-center gap-2 rounded-rune bg-panel-raised px-3 py-2">
            <span className="flex-1">Adventurer {i + 1}</span>
            <button type="button" className={stepButton} onClick={() => setLevel(i, level - 1)} disabled={level <= 1} aria-label={`Lower adventurer ${i + 1} level`}>
              −
            </button>
            <span className="w-14 text-center text-sm" aria-live="polite">
              Lv {level}
            </span>
            <button type="button" className={stepButton} onClick={() => setLevel(i, level + 1)} disabled={level >= 20} aria-label={`Raise adventurer ${i + 1} level`}>
              +
            </button>
            <button
              type="button"
              className={`${stepButton} hover:border-ember hover:text-ember`}
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
        className="rounded-rune border border-dashed border-line py-2 text-ink-muted hover:border-rune hover:text-ink disabled:opacity-30"
        onClick={() => onChange([...levels, levels[levels.length - 1] ?? 1])}
        disabled={levels.length >= MAX_PARTY}
      >
        + Add adventurer
      </button>
    </section>
  );
}
