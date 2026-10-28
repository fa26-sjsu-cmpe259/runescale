import type { ReactElement } from 'react';
import type { EncounterResult } from '@/lib/rules/calculator';
import { THRESHOLD_TIERS } from '@/lib/rules/tables';
import { TIER_COLORS, TIER_LABELS } from './types';

const R = 88;
const CIRCUMFERENCE = 2 * Math.PI * R;
const SWEEP = 0.75; // the ring is a 270 degree arc, open at the bottom
const ARC = CIRCUMFERENCE * SWEEP;

// Fixed positions and delays so server and client render the same fire.
const FLAMES = [4, 11, 18, 26, 33, 40, 47, 54, 61, 68, 75, 82, 89, 96].map((left, i) => ({ left, delay: `${-((i * 0.37) % 1.3)}s` }));
const SPARKS = [
  { left: 12, delay: '0s', dx: '8px' },
  { left: 27, delay: '1.1s', dx: '-12px' },
  { left: 44, delay: '0.4s', dx: '14px' },
  { left: 58, delay: '1.7s', dx: '-6px' },
  { left: 73, delay: '0.8s', dx: '10px' },
  { left: 88, delay: '2.2s', dx: '-14px' },
];

// 0 at the Deadly line, 1 at 5x past it. Drives flame height, sway speed and glow.
function heatFor(ratio: number): number {
  return ratio < 1 ? 0 : Math.min(1, 0.15 + ((ratio - 1) / 4) * 0.85);
}

function Segment({ from, to, color, width, className }: { from: number; to: number; color: string; width: number; className?: string }): ReactElement {
  const length = Math.max(0, (to - from) * ARC);
  return (
    <circle
      cx="120"
      cy="120"
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={`${length} ${CIRCUMFERENCE}`}
      strokeDashoffset={-from * ARC}
      transform="rotate(135 120 120)"
      className={className}
      style={{ transition: 'stroke-dasharray 500ms ease-out, stroke 500ms ease-out' }}
    />
  );
}

function verdictNote(result: EncounterResult, ratio: number): string {
  if (result.monsterCount === 0) return 'Add foes to weigh the fight.';
  if (result.difficulty === 'deadly') {
    if (ratio >= 3) return `Likely a total party kill: ${ratio.toFixed(1)}× the Deadly line.`;
    if (ratio >= 1.5) return 'Expect characters to drop. Someone may die.';
    return 'Just past the Deadly line. Dangerous, but survivable with luck.';
  }
  return result.nextTier ? `${result.nextTier.xpNeeded.toLocaleString()} more XP to reach ${TIER_LABELS[result.nextTier.difficulty]}.` : '';
}

export function DifficultyMeter({ result }: { result: EncounterResult }): ReactElement {
  const { thresholds, adjustedXp, difficulty, baseXp, multiplier, monsterCount } = result;
  // A fixed scale keeps the tier bands readable; anything past it pins the arc at full.
  const max = thresholds.deadly * 1.5;
  const frac = (xp: number) => Math.min(xp / max, 1);
  const empty = monsterCount === 0;
  const color = TIER_COLORS[difficulty];
  const ratio = adjustedXp / thresholds.deadly;
  const heat = empty ? 0 : heatFor(ratio);
  const bounds = [0, ...THRESHOLD_TIERS.map((t) => thresholds[t]), max];
  const bands = (['trivial', ...THRESHOLD_TIERS] as const).map((tier, i) => ({ tier, from: frac(bounds[i]), to: frac(bounds[i + 1]) }));

  return (
    <section
      className={`relative grid grid-cols-1 items-center gap-6 overflow-hidden rounded-[10px] border border-[#3a2a1e] bg-inset p-5 sm:grid-cols-[200px_1fr] ${heat > 0 ? 'pb-14' : ''}`}
      style={{
        ['--heat' as string]: heat,
        background: heat > 0 ? `radial-gradient(420px 220px at 15% 60%, rgb(238 90 60 / ${0.12 + heat * 0.18}), transparent 70%), var(--color-inset)` : undefined,
      }}
      aria-labelledby="verdict-heading"
    >
      {heat > 0 && (
        <div className="fire" aria-hidden>
          {FLAMES.slice(0, Math.round(6 + heat * 8)).map((f) => (
            <span key={f.left} className="flame" style={{ left: `${f.left}%`, animationDelay: f.delay }} />
          ))}
          {SPARKS.slice(0, Math.round(2 + heat * 4)).map((s) => (
            <span key={s.left} className="spark" style={{ left: `${s.left}%`, animationDelay: s.delay, ['--dx' as string]: s.dx }} />
          ))}
        </div>
      )}

      <svg viewBox="0 0 240 210" className={`relative mx-auto w-full max-w-[200px] overflow-visible ${heat > 0 ? 'deadly-pulse' : ''}`} role="img" aria-label={empty ? 'No foes on the board' : `${TIER_LABELS[difficulty]}: ${adjustedXp} adjusted XP`}>
        {bands.map((b) => (
          <Segment key={b.tier} from={b.from} to={b.to} color={TIER_COLORS[b.tier]} width={12} className="opacity-15" />
        ))}
        {!empty && <Segment from={0} to={frac(adjustedXp)} color={color} width={12} />}
        <text x="120" y="118" textAnchor="middle" className="font-display" fontSize="34" fontWeight={700} fill={empty ? 'var(--color-muted)' : color}>
          {empty ? '—' : `${ratio.toFixed(1)}×`}
        </text>
        <text x="120" y="144" textAnchor="middle" fontSize="12" fontWeight={600} letterSpacing="1.5" fill="var(--color-muted)">
          DEADLY LINE
        </text>
      </svg>

      <div className="relative min-w-0">
        <h2 id="verdict-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Verdict
        </h2>
        <p className={`font-display leading-tight font-bold transition-colors duration-500 ${empty ? 'text-[32px]' : 'text-[44px]'}`} style={{ color: empty ? 'var(--color-muted)' : color }} aria-live="polite">
          {empty ? 'Awaiting foes' : TIER_LABELS[difficulty]}
        </p>
        {!empty && (
          <>
            <p className="text-lg font-semibold">{adjustedXp.toLocaleString()} adjusted XP</p>
            <p className="text-[13px] text-muted">
              {baseXp.toLocaleString()} base XP × {multiplier} ({monsterCount} {monsterCount === 1 ? 'monster' : 'monsters'})
            </p>
          </>
        )}

        <div className="mt-4 mb-1.5 flex h-2.5 overflow-hidden rounded-full">
          {bands.map((b) => (
            <span key={b.tier} style={{ width: `${(b.to - b.from) * 100}%`, background: TIER_COLORS[b.tier], opacity: b.tier === 'trivial' ? 0.5 : 0.9 }} />
          ))}
        </div>
        <div className="relative h-0">
          {!empty && (
            <span
              className="absolute -top-[17px] size-4 -translate-x-1/2 rotate-45 rounded-[3px] bg-ink transition-[left] duration-500"
              style={{ left: `${frac(adjustedXp) * 100}%`, boxShadow: `0 0 0 3px var(--color-inset), 0 0 14px ${color}` }}
              aria-hidden
            />
          )}
        </div>
        <ul className="relative mb-2 h-9 text-xs text-muted">
          {THRESHOLD_TIERS.map((tier) => (
            <li key={tier} className="absolute" style={{ left: `${frac(thresholds[tier]) * 100}%` }}>
              <span className="hidden sm:inline">{TIER_LABELS[tier]}</span>
              <b className={`block font-semibold ${tier === difficulty && !empty ? 'text-ink' : 'text-muted'}`}>{thresholds[tier].toLocaleString()}</b>
            </li>
          ))}
        </ul>
        <p className="text-[13px] font-medium [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]" style={{ color: difficulty === 'deadly' && !empty ? 'var(--color-tier-deadly)' : 'var(--color-muted)' }}>
          {verdictNote(result, ratio)}
        </p>
      </div>
    </section>
  );
}
