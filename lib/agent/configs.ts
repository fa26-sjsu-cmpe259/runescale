import { ToolLoopAgent, type InferAgentUIMessage, type LanguageModel } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { runescaleTools, type RunescaleTools } from '../tools';
import { MEMORY_ONLY_PROMPT, TOOL_GROUNDED_PROMPT } from './prompts';
import { CONFIGS, type ConfigId, type ConfigInfo } from './config-info';

export const CLAUDE_MODEL = 'claude-sonnet-5-5';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:8b';

// Ollama serves an OpenAI-compatible API, which avoids depending on a community provider package.
const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
});

function modelFor(provider: ConfigInfo['provider']): LanguageModel {
  return provider === 'claude' ? anthropic(CLAUDE_MODEL) : ollama(OLLAMA_MODEL);
}

export interface Board {
  partyLevels: number[];
  monsters: { name: string; cr: string; count: number }[];
}

// The War Table's current state, so "is this fair?" and "make this harder" refer to the board.
function boardContext(board: Board): string {
  const party = board.partyLevels.map((l) => `level ${l}`).join(', ');
  const monsters = board.monsters.length
    ? board.monsters.map((m) => `${m.count} x ${m.name} (CR ${m.cr})`).join(', ')
    : 'none yet';
  return `\n\nThe user's War Table board right now (use it when they say "this encounter" or "this fight"):\n- Party: ${party}\n- Monsters: ${monsters}`;
}

// Memory-only configs keep the same tool set type but expose none of them to the model.
export function createAgent(id: ConfigId, board?: Board): ToolLoopAgent<never, RunescaleTools> {
  const { provider, grounded } = CONFIGS[id];
  return new ToolLoopAgent({
    model: modelFor(provider),
    instructions: (grounded ? TOOL_GROUNDED_PROMPT : MEMORY_ONLY_PROMPT) + (board ? boardContext(board) : ''),
    tools: runescaleTools,
    activeTools: grounded ? undefined : [],
  });
}

export type RunescaleUIMessage = InferAgentUIMessage<ToolLoopAgent<never, RunescaleTools>>;
