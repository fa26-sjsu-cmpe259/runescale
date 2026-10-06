'use client';

import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { getToolName, isToolUIPart } from 'ai';
import { useState, type ReactElement } from 'react';
import { CONFIG_IDS, CONFIGS, type ConfigId } from '@/lib/agent/config-info';
import type { RunescaleUIMessage } from '@/lib/agent/configs';
import type { BoardMonster, MonsterOption } from './types';
import { TIER_LABELS } from './types';

type ToolPart = Extract<RunescaleUIMessage['parts'][number], { type: `tool-${string}` }>;
type Chat = UseChatHelpers<RunescaleUIMessage>;
type ApplyFn = (monsters: { name: string; cr: string; count: number }[]) => void;

export interface BoardContext {
  partyLevels: number[];
  monsters: { name: string; cr: string; count: number }[];
}

function unknownList(unknown: { query: string; closeMatches: string[] }[]): string {
  return unknown.map((u) => `${u.query}${u.closeMatches.length ? ` (close: ${u.closeMatches.slice(0, 3).join(', ')})` : ''}`).join('; ');
}

const applyButton = 'rounded-rune border border-rune/60 px-2 py-0.5 text-xs text-rune-soft hover:bg-rune/15';

// Tool calls render as visible evidence cards, so grounding is shown rather than claimed.
function ToolCard({ part, onApply }: { part: ToolPart; onApply: ApplyFn }): ReactElement {
  let summary: ReactElement | string = 'Consulting the tomes...';
  if (part.state === 'output-error') summary = `Failed: ${part.errorText}`;
  if (part.state === 'output-available') {
    switch (part.type) {
      case 'tool-lookup_monster':
        summary =
          part.output.status === 'found'
            ? `Looked up ${part.output.monster.name}: CR ${part.output.monster.cr}, AC ${part.output.monster.ac}, ${part.output.monster.hp} HP`
            : `"${part.output.query}" is not in the SRD. Close: ${part.output.closeMatches.join(', ') || 'none'}`;
        break;
      case 'tool-search_monsters':
        summary = `Found ${part.output.total} monsters: ${part.output.monsters.slice(0, 6).map((m) => m.name).join(', ')}${part.output.total > 6 ? '…' : ''}`;
        break;
      case 'tool-get_party_thresholds': {
        const t = part.output.thresholds;
        summary = `Party of ${part.output.partySize}: Easy ${t.easy} · Medium ${t.medium} · Hard ${t.hard} · Deadly ${t.deadly}`;
        break;
      }
      case 'tool-evaluate_encounter': {
        const out = part.output;
        summary =
          out.status === 'ok' ? (
            <span className="flex flex-wrap items-center gap-2">
              {out.baseXp.toLocaleString()} XP × {out.multiplier} = {out.adjustedXp.toLocaleString()} → {TIER_LABELS[out.difficulty]}
              <button type="button" className={applyButton} onClick={() => onApply(out.monsters)}>
                Put on board
              </button>
            </span>
          ) : (
            `Unknown monsters: ${unknownList(out.unknown)}`
          );
        break;
      }
      case 'tool-suggest_adjustments': {
        const out = part.output;
        summary =
          out.status === 'ok' ? (
            out.suggestions.length === 0 ? (
              'No single change reaches that difficulty.'
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {out.suggestions.map((s) => (
                  <li key={s.change} className="flex flex-wrap items-center gap-2">
                    {s.change} → {s.adjustedXp.toLocaleString()} XP, {TIER_LABELS[s.difficulty]}
                    <button type="button" className={applyButton} onClick={() => onApply(s.monsters)}>
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            `Unknown monsters: ${unknownList(out.unknown)}`
          );
        break;
      }
    }
  }

  return (
    <div className="my-2 rounded-rune border-l-2 border-rune bg-void/60 px-3 py-2 text-sm">
      <span className="font-display mr-2 text-xs tracking-wide text-rune-soft">{getToolName(part).replace(/_/g, ' ')}</span>
      {summary}
    </div>
  );
}

function Thread({ chat, config, onApply }: { chat: Chat; config: ConfigId; onApply: ApplyFn }): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
      <p className="text-xs uppercase tracking-wider text-ink-muted">
        {config}: {CONFIGS[config].label}
      </p>
      {chat.messages.length === 0 && (
        <p className="text-sm text-ink-muted">
          Ask about the board (&ldquo;Is this fair?&rdquo;, &ldquo;Make this harder&rdquo;) or describe any encounter.
        </p>
      )}
      {chat.messages.map((message) => (
        <div key={message.id} className={message.role === 'user' ? 'self-end rounded-rune bg-panel-raised px-3 py-2' : ''}>
          {message.parts.map((part, i) => {
            if (part.type === 'text') return <p key={i} className="whitespace-pre-wrap leading-relaxed">{part.text}</p>;
            if (isToolUIPart(part)) return <ToolCard key={i} part={part as ToolPart} onApply={onApply} />;
            return null;
          })}
        </div>
      ))}
      {chat.status === 'submitted' && <p className="text-sm text-ink-muted">The runes are turning...</p>}
      {chat.error && (
        <p role="alert" className="text-sm text-ember">
          The spell fizzled: {chat.error.message}. Check the server log for details.
        </p>
      )}
    </div>
  );
}

function ConfigSelect({ value, onChange, label }: { value: ConfigId; onChange: (id: ConfigId) => void; label: string }): ReactElement {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      {label}
      <select className="rounded-rune border border-line bg-void px-2 py-1 text-ink" value={value} onChange={(e) => onChange(e.currentTarget.value as ConfigId)}>
        {CONFIG_IDS.map((id) => (
          <option key={id} value={id}>
            {id}: {CONFIGS[id].label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ChatPanel({
  board,
  options,
  onApply,
}: {
  board: BoardContext;
  options: MonsterOption[];
  onApply: (monsters: BoardMonster[]) => void;
}): ReactElement {
  const [input, setInput] = useState('');
  const [compare, setCompare] = useState(false);
  const [configs, setConfigs] = useState<[ConfigId, ConfigId]>(['B1', 'A1']);
  const primary = useChat<RunescaleUIMessage>({ id: 'primary' });
  const secondary = useChat<RunescaleUIMessage>({ id: 'secondary' });
  const busy = [primary, ...(compare ? [secondary] : [])].some((c) => c.status === 'submitted' || c.status === 'streaming');

  const apply: ApplyFn = (monsters) =>
    onApply(
      monsters.map((m) => {
        const option = options.find((o) => o.name === m.name);
        return { name: m.name, cr: m.cr, count: m.count, type: option?.type ?? 'Homebrew', size: option?.size ?? '' };
      }),
    );

  const setConfig = (index: 0 | 1, id: ConfigId) => {
    setConfigs((prev) => (index === 0 ? [id, prev[1]] : [prev[0], id]));
    (index === 0 ? primary : secondary).setMessages([]);
  };

  return (
    <section className="rune-panel flex h-full min-h-[480px] flex-col gap-3 p-4" aria-labelledby="chat-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="chat-heading" className="font-display text-lg text-rune-soft">
          The Oracle
        </h2>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.currentTarget.checked)} className="accent-rune" />
          Compare side by side
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <ConfigSelect label={compare ? 'Left' : 'Config'} value={configs[0]} onChange={(id) => setConfig(0, id)} />
        {compare && <ConfigSelect label="Right" value={configs[1]} onChange={(id) => setConfig(1, id)} />}
      </div>

      <div className={`flex min-h-0 flex-1 gap-4 ${compare ? 'flex-col md:flex-row' : ''}`}>
        <Thread chat={primary} config={configs[0]} onApply={apply} />
        {compare && <Thread chat={secondary} config={configs[1]} onApply={apply} />}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          primary.sendMessage({ text: input }, { body: { config: configs[0], board } });
          if (compare) secondary.sendMessage({ text: input }, { body: { config: configs[1], board } });
          setInput('');
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask the Oracle
        </label>
        <input
          id="chat-input"
          className="flex-1 rounded-rune border border-line bg-void px-3 py-2 placeholder:text-ink-muted/70"
          value={input}
          placeholder="Is this fight fair?"
          onChange={(e) => setInput(e.currentTarget.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy} className="rounded-rune border border-rune bg-rune/20 px-4 font-display text-rune-soft hover:bg-rune/30 disabled:opacity-40">
          Ask
        </button>
      </form>
    </section>
  );
}
