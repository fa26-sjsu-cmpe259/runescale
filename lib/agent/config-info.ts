// Client-safe config metadata. Model and tool wiring lives in configs.ts (server only).

export const CONFIG_IDS = ['A1', 'B1', 'A2', 'B2'] as const;
export type ConfigId = (typeof CONFIG_IDS)[number];

export interface ConfigInfo {
  label: string;
  provider: 'claude' | 'ollama';
  grounded: boolean;
}

export const CONFIGS: Record<ConfigId, ConfigInfo> = {
  A1: { label: 'Claude, memory only', provider: 'claude', grounded: false },
  B1: { label: 'Claude, tool-grounded', provider: 'claude', grounded: true },
  A2: { label: 'Ollama, memory only', provider: 'ollama', grounded: false },
  B2: { label: 'Ollama, tool-grounded', provider: 'ollama', grounded: true },
};

export function isConfigId(value: unknown): value is ConfigId {
  return typeof value === 'string' && (CONFIG_IDS as readonly string[]).includes(value);
}
