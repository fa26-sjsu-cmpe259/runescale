import type { ReactElement } from 'react';
import type { EncounterResult } from '@/lib/rules/calculator';
import { THRESHOLD_TIERS } from '@/lib/rules/tables';
import { TIER_COLORS, TIER_LABELS } from './types';

const R = 88;
const CIRCUMFERENCE = 2 * Math.PI * R;
const SWEEP = 0.75; // the rune circle is a 270 degree arc, open at the bottom
const ARC = CIRCUMFERENCE * SWEEP;

function Segment({ from, to, color, width, glow, opacity = 1 }: { from: number; to: number; color: string; width: number; glow?: boolean; opacity?: number }): ReactElement {
  const length = Math.max(0, (to - from) * ARC);
  return (
    <circle
      cx="120"
      cy="120"
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeOpacity={opacity}
      strokeDasharray={`${length} ${CIRCUMFERENCE}`}
      strokeDashoffset={-from * ARC}
      transform="rotate(135 120 120)"
      style={{ transition: 'stroke-dasharray 500ms ease-out', filter: glow ? `drop-shadow(0 0 6px ${color})` : undefined }}
    />
  );
}

export function DifficultyMeter({ result }: { result: EncounterResult }): ReactElement {
  const { thresholds, adjustedXp, difficulty, baseXp, multiplier, monsterCount, nextTier } = result;
  const max = Math.max(thresholds.deadly * 1.5, adjustedXp);
  const frac = (xp: number) => Math.min(xp / max, 1);
  const bounds = [0, ...THRESHOLD_TIERS.map((t) => thresholds[t]), max];
  const bands = (['trivial', ...THRESHOLD_TIERS] as const).map((tier, i) => ({ tier, from: frac(bounds[i]), to: frac(bounds[i + 1]) }));
  const empty = monsterCount === 0;
  const color = TIER_COLORS[difficulty];

  return (
    <section className="rune-panel flex flex-col items-center gap-3 p-4" aria-labelledby="meter-heading">
      <h2 id="meter-heading" className="sr-only">Encounter difficulty</h2>
      <svg
        viewBox="0 0 240 220"
        className="w-full max-w-[260px]"
        role="img"
        aria-label={empty ? 'No monsters on the board' : `${TIER_LABELS[difficulty]}: ${adjustedXp} adjusted XP`}
      >
        <circle cx="120" cy="120" r={R + 14} fill="none" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 6" />
        {bands.map((b) => (
          <Segment key={b.tier} from={b.from} to={b.to} color={TIER_COLORS[b.tier]} width={4} opacity={0.4} />
        ))}
        {!empty && <Segment from={0} to={frac(adjustedXp)} color={color} width={12} glow />}
        <text x="120" y="112" textAnchor="middle" className="font-display" fontSize="26" fill={empty ? 'var(--color-ink-muted)' : color}>
          {empty ? 'Awaiting foes' : TIER_LABELS[difficulty]}
        </text>
        {!empty && (
          <text x="120" y="140" textAnchor="middle" fontSize="15" fill="var(--color-ink)">
            {adjustedXp.toLocaleString()} adjusted XP
          </text>
        )}
      </svg>

      <p className="text-center text-sm text-ink-muted" aria-live="polite">
        {empty
          ? 'Add monsters to the board to rate the fight.'
          : `${baseXp.toLocaleString()} XP × ${multiplier} (${monsterCount} ${monsterCount === 1 ? 'monster' : 'monsters'}) = ${adjustedXp.toLocaleString()}`}
        {!empty && nextTier && (
          <>
            <br />
            {nextTier.xpNeeded.toLocaleString()} more to reach {TIER_LABELS[nextTier.difficulty]}
          </>
        )}
      </p>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {THRESHOLD_TIERS.map((tier) => (
          <li key={tier} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rotate-45" style={{ background: TIER_COLORS[tier] }} aria-hidden />
            <span className={tier === difficulty ? 'text-ink' : 'text-ink-muted'}>
              {TIER_LABELS[tier]} {thresholds[tier].toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
