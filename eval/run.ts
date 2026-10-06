// Runs the eval query set through the agent configs and writes eval/results/<timestamp>/raw.jsonl,
// then grades it into results.csv.
//
//   npm run eval                                  all configs, all queries, 3 runs each
//   npm run eval -- --configs B1,A1 --runs 1 --queries Q01,S3
//   npm run eval -- --no-grade                    skip grading (regrade later with npm run eval:grade)

import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createAgent } from '../lib/agent/configs';
import { CONFIG_IDS, CONFIGS, isConfigId, type ConfigId } from '../lib/agent/config-info';
import { QUERIES, type EvalQuery } from './expectations';
import { gradeRunDir, type RunRecord } from './grade';

const TIMEOUT_MS = 180_000;

async function runOne(config: ConfigId, q: EvalQuery, run: number, runId: string): Promise<RunRecord> {
  const started = performance.now();
  const base = { runId, config, queryId: q.id, run };
  try {
    const result = await createAgent(config).generate({
      prompt: q.query,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const toolCalls = result.steps.flatMap((step) =>
      step.content.flatMap((part): RunRecord['toolCalls'] => {
        if (part.type === 'tool-result') return [{ toolName: part.toolName, input: part.input, output: part.output }];
        if (part.type === 'tool-error') return [{ toolName: part.toolName, input: part.input, error: String(part.error) }];
        return [];
      }),
    );
    return {
      ...base,
      response: result.text,
      toolCalls,
      toolErrors: toolCalls.filter((t) => t.error !== undefined).length,
      latencyMs: Math.round(performance.now() - started),
      inputTokens: result.totalUsage.inputTokens ?? null,
      outputTokens: result.totalUsage.outputTokens ?? null,
    };
  } catch (err) {
    return {
      ...base,
      response: '',
      toolCalls: [],
      toolErrors: 0,
      latencyMs: Math.round(performance.now() - started),
      inputTokens: null,
      outputTokens: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      configs: { type: 'string', default: CONFIG_IDS.join(',') },
      queries: { type: 'string' },
      runs: { type: 'string', default: '3' },
      concurrency: { type: 'string', default: '3' },
      'no-grade': { type: 'boolean', default: false },
    },
  });

  const configs = values.configs.split(',');
  const unknown = configs.filter((c) => !isConfigId(c));
  if (unknown.length > 0) throw new Error(`Unknown configs: ${unknown.join(', ')}`);
  const queryIds = values.queries?.split(',');
  const queries = queryIds ? QUERIES.filter((q) => queryIds.includes(q.id)) : QUERIES;
  const runs = Number(values.runs);

  const jobs: [ConfigId, EvalQuery, number][] = [];
  for (const config of configs as ConfigId[]) {
    for (const q of queries) {
      // Memory-only configs never see tool data, so the injected-record test does not apply to them.
      if (q.groundedOnly && !CONFIGS[config].grounded) continue;
      for (let run = 1; run <= runs; run++) jobs.push([config, q, run]);
    }
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join('eval', 'results', runId);
  await mkdir(dir, { recursive: true });
  const rawPath = path.join(dir, 'raw.jsonl');

  // Ollama runs on one local machine, so its jobs go one at a time; Claude jobs run in parallel.
  const pools: Record<string, number> = { claude: Number(values.concurrency), ollama: 1 };
  let done = 0;
  await Promise.all(
    Object.entries(pools).map(async ([provider, width]) => {
      const queue = jobs.filter(([c]) => CONFIGS[c].provider === provider);
      await Promise.all(
        Array.from({ length: width }, async () => {
          for (let job = queue.shift(); job; job = queue.shift()) {
            const record = await runOne(...job, runId);
            await appendFile(rawPath, JSON.stringify(record) + '\n');
            done += 1;
            const status = record.error ? `ERROR ${record.error.slice(0, 80)}` : `${record.latencyMs}ms`;
            console.log(`[${done}/${jobs.length}] ${record.config} ${record.queryId} run ${record.run}: ${status}`);
          }
        }),
      );
    }),
  );

  console.log(`Raw transcripts: ${rawPath}`);
  if (!values['no-grade']) console.log(`Graded results: ${await gradeRunDir(dir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
