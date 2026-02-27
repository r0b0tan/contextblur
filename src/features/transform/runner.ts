import { createHash, randomUUID } from 'crypto';
import { createOpenAICompatibleClient } from '../../llm/openai_compatible.js';
import {
  SYSTEM_PROMPT,
  USER_PROMPT_CONSTRAINED,
  USER_PROMPT_UNCONSTRAINED,
  REPAIR_PROMPT,
  PROMPT_VERSION,
  DEFAULT_SIGNAL_DEFINITION,
} from './prompts.js';
import { LLMOutputSchema, type LLMOutput } from './schema.js';
import { computeMetrics } from '../../metrics/index.js';
import type { Language, Metrics } from '../../core/types.js';

// ── Fixed inference params (enforced in code, not configurable) ───────────
// temperature=0 is hardcoded inside openai_compatible chatAttempt.
// top_p=1 is the API default; stored in RunRecord.params for reproducibility.
export const FIXED_TEMPERATURE = 0;
export const FIXED_TOP_P = 1;
export const DEFAULT_MAX_TOKENS = 2048;

export type RunMode = 'constrained' | 'unconstrained';

export interface RunParams {
  temperature: typeof FIXED_TEMPERATURE;
  top_p: typeof FIXED_TOP_P;
  max_tokens: number;
}

export interface RunRecord {
  id: string;
  mode: RunMode;
  input_hash: string;
  model_id: string;
  prompt_version: string;
  params: RunParams;
  raw_output: string;
  parsed_output: LLMOutput | null;
  valid: boolean;
  repaired: boolean;
  created_at: string;
  metrics_after: Metrics | null;
}

export interface BatchModeStats {
  total: number;
  valid: number;
  repaired: number;
  success_rate: number;
  metrics_mean: Partial<Metrics>;
  metrics_stddev: Partial<Metrics>;
}

export interface LLMRunRequest {
  text: string;
  language: Language;
  signalDefinition?: string;
  mode: RunMode | 'both';
  batchSize: number;
  baseUrl: string;
  model: string;
  maxTokens: number;
  apiKey?: string;
}

export interface LLMRunResponse {
  runs: RunRecord[];
  mode_stats: Partial<Record<RunMode, BatchModeStats>>;
  prompt_version: string;
}

// ── JSON extraction helpers (mirrors existing pipeline logic) ─────────────

function stripMarkdownFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
}

function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return raw.slice(start, i + 1);
      }
    }
  }
  return null;
}

function sanitiseControlChars(raw: string): string {
  // Escape bare control characters inside JSON string values
  return raw.replace(
    /"(?:[^"\\]|\\.)*"/g,
    (match) =>
      match.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, (c) => {
        const hex = c.charCodeAt(0).toString(16).padStart(4, '0');
        return `\\u${hex}`;
      }),
  );
}

function parseRawOutput(raw: string): unknown | null {
  const stripped = stripMarkdownFence(raw.trim());
  const extracted = extractFirstJsonObject(stripped);
  if (!extracted) return null;
  try {
    return JSON.parse(extracted);
  } catch {
    try {
      return JSON.parse(sanitiseControlChars(extracted));
    } catch {
      return null;
    }
  }
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateOutput(raw: unknown): LLMOutput | null {
  const result = LLMOutputSchema.safeParse(raw);
  return result.success ? result.data : null;
}

// ── Single run ─────────────────────────────────────────────────────────────

async function executeSingleRun(
  text: string,
  language: Language,
  mode: RunMode,
  signalDefinition: string,
  baseUrl: string,
  model: string,
  maxTokens: number,
  apiKey: string | undefined,
): Promise<RunRecord> {
  const client = createOpenAICompatibleClient(baseUrl, apiKey);
  const id = randomUUID();
  const created_at = new Date().toISOString();
  const input_hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
  const params: RunParams = {
    temperature: FIXED_TEMPERATURE,
    top_p: FIXED_TOP_P,
    max_tokens: maxTokens,
  };

  // Fold system prompt into the user message — the openai_compatible client
  // uses a single messages[{role:'user'}] call without a separate system turn.
  const modePrompt =
    mode === 'constrained'
      ? USER_PROMPT_CONSTRAINED(text, signalDefinition)
      : USER_PROMPT_UNCONSTRAINED(text, signalDefinition);
  const combinedPrompt = SYSTEM_PROMPT + '\n\n' + modePrompt;

  let raw_output = '';
  let parsed_output: LLMOutput | null = null;
  let valid = false;
  let repaired = false;

  try {
    raw_output = await client.generate(combinedPrompt, model);

    const parsed = parseRawOutput(raw_output);
    parsed_output = validateOutput(parsed);

    if (!parsed_output) {
      // ONE repair attempt
      const repairPrompt = SYSTEM_PROMPT + '\n\n' + REPAIR_PROMPT(raw_output);
      const repairRaw = await client.generate(repairPrompt, model);
      repaired = true;
      const reparsed = parseRawOutput(repairRaw);
      parsed_output = validateOutput(reparsed);
      if (parsed_output) {
        raw_output = repairRaw;
      }
    }

    valid = parsed_output !== null;
  } catch {
    valid = false;
  }

  const metrics_after =
    valid && parsed_output
      ? computeMetrics(parsed_output.transformed_text, language)
      : null;

  return {
    id,
    mode,
    input_hash,
    model_id: model,
    prompt_version: PROMPT_VERSION,
    params,
    raw_output,
    parsed_output,
    valid,
    repaired,
    created_at,
    metrics_after,
  };
}

// ── Batch statistics helpers ───────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length,
  );
}

function aggregateMetrics(records: RunRecord[]): {
  mean: Partial<Metrics>;
  stddev: Partial<Metrics>;
} {
  const validMetrics = records
    .map((r) => r.metrics_after)
    .filter((m): m is Metrics => m !== null);

  if (validMetrics.length === 0) return { mean: {}, stddev: {} };

  const keys: (keyof Metrics)[] = [
    'hapaxRate',
    'rareWordRate',
    'typeTokenRatio',
    'stdevSentenceLengthTokens',
    'punctuationRate',
    'stopwordRate',
    'basicNgramUniqueness',
    'avgSentenceLengthTokens',
    'sentenceCount',
  ];

  const meanOut: Partial<Metrics> = {};
  const stddevOut: Partial<Metrics> = {};

  for (const key of keys) {
    const vals = validMetrics.map((m) => m[key]);
    (meanOut as Record<string, number>)[key] =
      Math.round(mean(vals) * 10000) / 10000;
    (stddevOut as Record<string, number>)[key] =
      Math.round(stddev(vals) * 10000) / 10000;
  }

  return { mean: meanOut, stddev: stddevOut };
}

function computeModeStats(records: RunRecord[]): BatchModeStats {
  const valid = records.filter((r) => r.valid).length;
  const repaired = records.filter((r) => r.repaired && r.valid).length;
  const agg = aggregateMetrics(records);
  return {
    total: records.length,
    valid,
    repaired,
    success_rate: records.length > 0 ? valid / records.length : 0,
    metrics_mean: agg.mean,
    metrics_stddev: agg.stddev,
  };
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function executeLLMRun(
  req: LLMRunRequest,
): Promise<LLMRunResponse> {
  const signalDefinition = req.signalDefinition?.trim() || DEFAULT_SIGNAL_DEFINITION;
  const model = req.model;
  const maxTokens = req.maxTokens || DEFAULT_MAX_TOKENS;
  const batchSize = Math.max(1, Math.min(req.batchSize, 20));

  const modes: RunMode[] =
    req.mode === 'both' ? ['constrained', 'unconstrained'] : [req.mode];

  // Build run tasks: n per mode, all launched concurrently
  const tasks: Array<{ mode: RunMode; promise: Promise<RunRecord> }> = [];

  for (const mode of modes) {
    for (let i = 0; i < batchSize; i++) {
      tasks.push({
        mode,
        promise: executeSingleRun(
          req.text,
          req.language,
          mode,
          signalDefinition,
          req.baseUrl,
          model,
          maxTokens,
          req.apiKey,
        ),
      });
    }
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.promise));

  const runs: RunRecord[] = settled.map((result, idx) => {
    if (result.status === 'fulfilled') return result.value;
    // Promise rejection: return a failed record
    const mode = tasks[idx].mode;
    const id = randomUUID();
    return {
      id,
      mode,
      input_hash: createHash('sha256')
        .update(req.text)
        .digest('hex')
        .slice(0, 16),
      model_id: model,
      prompt_version: PROMPT_VERSION,
      params: {
        temperature: FIXED_TEMPERATURE,
        top_p: FIXED_TOP_P,
        max_tokens: maxTokens,
      },
      raw_output: '',
      parsed_output: null,
      valid: false,
      repaired: false,
      created_at: new Date().toISOString(),
      metrics_after: null,
    } satisfies RunRecord;
  });

  const mode_stats: Partial<Record<RunMode, BatchModeStats>> = {};
  for (const mode of modes) {
    const modeRuns = runs.filter((r) => r.mode === mode);
    mode_stats[mode] = computeModeStats(modeRuns);
  }

  return { runs, mode_stats, prompt_version: PROMPT_VERSION };
}
