'use client';

import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { getToolName, isToolUIPart } from 'ai';
import { useState, type ReactElement } from 'react';
import { CONFIGS, type ConfigId } from '@/lib/agent/config-info';
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

const applyButton = 'ml-auto shrink-0 rounded-full border border-gold px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-gold hover:bg-gold/15';

// Tool calls render as visible evidence cards, so grounding is shown rather than claimed.
function ToolCard({ part, onApply }: { part: ToolPart; onApply: ApplyFn }): ReactElement {
  let summary: ReactElement | string = 'Consulting the tomes…';
  let action: ReactElement | null = null;
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
        if (out.status === 'ok')
          action = (
            <button type="button" className={applyButton} onClick={() => onApply(out.monsters)}>
              Put on board
            </button>
          );
        summary =
          out.status === 'ok' ? (
            <span>
              {out.baseXp.toLocaleString()} XP × {out.multiplier} ={' '}
              <b className="text-ink">
                {out.adjustedXp.toLocaleString()} XP → {TIER_LABELS[out.difficulty]}
              </b>
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
              <ul className="flex flex-col gap-1.5">
                {out.suggestions.map((s) => (
                  <li key={s.change} className="flex items-center gap-2">
                    <span>
                      {s.change} → <b className="text-ink">{s.adjustedXp.toLocaleString()} XP, {TIER_LABELS[s.difficulty]}</b>
                    </span>
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

  const icon =
    part.state === 'output-available' ? (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-tier-easy text-[11px] font-extrabold text-[#10261b]">✓</span>
    ) : part.state === 'output-error' ? (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-tier-deadly text-[11px] font-extrabold text-void">!</span>
    ) : (
      <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-gold" />
    );

  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-[#2e271f] bg-inset px-3 py-2 text-[13px]">
      {icon}
      <code className="shrink-0 font-mono text-xs font-semibold text-gold">{getToolName(part)}</code>
      <span className="min-w-0 flex-1 text-muted">{summary}</span>
      {action}
    </div>
  );
}

function Thread({ chat, config, showLabel, onApply }: { chat: Chat; config: ConfigId; showLabel: boolean; onApply: ApplyFn }): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
      {showLabel && (
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
          {config} · {CONFIGS[config].label}
        </p>
      )}
      {chat.messages.length === 0 && (
        <p className="text-sm text-muted">Ask about the board or describe any encounter. Every number the Oracle looks up shows as a card.</p>
      )}
      {chat.messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === 'user'
              ? 'max-w-[80%] self-end rounded-[16px_16px_4px_16px] bg-gold px-3.5 py-2 font-medium text-on-gold'
              : 'flex flex-col gap-2.5'
          }
        >
          {message.parts.map((part, i) => {
            if (part.type === 'text') return <p key={i} className="leading-relaxed whitespace-pre-wrap">{part.text}</p>;
            if (isToolUIPart(part)) return <ToolCard key={i} part={part as ToolPart} onApply={onApply} />;
            return null;
          })}
        </div>
      ))}
      {chat.status === 'submitted' && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-gold" aria-hidden />
          The Oracle is thinking…
        </p>
      )}
      {chat.error && (
        <p role="alert" className="text-sm text-tier-deadly">
          The spell fizzled: {chat.error.message}. Check the server log for details.
        </p>
      )}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }): ReactElement {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[10px] border border-line bg-inset p-[3px]">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={`rounded-[7px] px-3 py-1 text-[13px] font-semibold ${v === value ? 'bg-gold text-on-gold shadow' : 'text-muted hover:text-ink'}`}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

// The 2x2 grid as two toggles: model picks the 1/2 column, grounding picks the A/B row.
function ConfigPicker({ value, onChange, label }: { value: ConfigId; onChange: (id: ConfigId) => void; label?: string }): ReactElement {
  const model = value.endsWith('1') ? '1' : '2';
  const mode = value.startsWith('B') ? 'B' : 'A';
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {label && <span className="w-10 text-xs font-semibold tracking-wider text-muted uppercase">{label}</span>}
      <Segmented label="Model" value={model} options={[['1', 'Claude'], ['2', 'Qwen (local)']]} onChange={(m) => onChange(`${mode}${m}` as ConfigId)} />
      <Segmented label="Grounding" value={mode} options={[['A', 'Memory'], ['B', 'Tools']]} onChange={(g) => onChange(`${g}${model}` as ConfigId)} />
    </div>
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

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    primary.sendMessage({ text }, { body: { config: configs[0], board } });
    if (compare) secondary.sendMessage({ text }, { body: { config: configs[1], board } });
    setInput('');
  };
  const started = primary.messages.length > 0;
  const suggestions = started ? ['Make it Hard', 'Why this difficulty?', 'Add some minions'] : ['Is this fight fair?', 'Make it Hard', 'What could go wrong?'];

  return (
    <section className="card flex h-full min-h-[480px] flex-col gap-4 p-5 lg:min-h-0" aria-labelledby="chat-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="chat-heading" className="label-caps">
          Oracle
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.currentTarget.checked)} className="peer sr-only" />
          <span
            className="relative h-5 w-[34px] rounded-full bg-line transition-colors peer-checked:bg-gold peer-focus-visible:outline-2 peer-focus-visible:outline-gold after:absolute after:top-[3px] after:left-[3px] after:size-3.5 after:rounded-full after:bg-ink after:transition-transform peer-checked:after:translate-x-[14px]"
            aria-hidden
          />
          Compare
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <ConfigPicker label={compare ? 'Left' : undefined} value={configs[0]} onChange={(id) => setConfig(0, id)} />
        {compare && <ConfigPicker label="Right" value={configs[1]} onChange={(id) => setConfig(1, id)} />}
      </div>

      <div className={`flex min-h-0 flex-1 gap-4 ${compare ? 'flex-col md:flex-row' : ''}`}>
        <Thread chat={primary} config={configs[0]} showLabel={compare} onApply={apply} />
        {compare && <Thread chat={secondary} config={configs[1]} showLabel onApply={apply} />}
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((text) => (
          <button key={text} type="button" disabled={busy} className="rounded-full border border-line px-3 py-1.5 text-[13px] font-medium hover:border-gold disabled:opacity-40" onClick={() => send(text)}>
            {text}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 rounded-[14px] border border-line bg-inset py-1.5 pr-1.5 pl-3.5 focus-within:border-gold"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask the Oracle
        </label>
        <input
          id="chat-input"
          className="flex-1 bg-transparent placeholder:text-muted focus:outline-none"
          value={input}
          placeholder="Ask about this encounter…"
          onChange={(e) => setInput(e.currentTarget.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy} aria-label="Send" className="grid size-[38px] place-items-center rounded-[10px] bg-gold text-on-gold hover:brightness-110 disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </section>
  );
}
