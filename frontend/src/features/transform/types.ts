import type { Language, Metrics } from '../../types';

export type RunMode = 'constrained' | 'unconstrained';
export type RunModeOrBoth = RunMode | 'both';

export type EntityPolicy =
  | 'preserve_all'
  | 'pseudonymize_persons'
  | 'pseudonymize_all_named_entities';

export const ENTITY_POLICY_LABELS: Record<EntityPolicy, string> = {
  preserve_all: 'Preserve all',
  pseudonymize_persons: 'Pseudonymize persons',
  pseudonymize_all_named_entities: 'Pseudonymize all named entities',
};

export interface SelfCheck {
  meaning_preserved: boolean;
  meaning_risk_notes: string[];
  surface_novelty_level: 'low' | 'medium' | 'high';
  signal_reduction_actions: string[];
}

export interface LLMOutput {
  mode: RunMode;
  input_summary: string;
  transformed_text: string;
  self_check: SelfCheck;
}

export interface RunParams {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

// Stored per-run record (mirrors backend RunRecord + batch_id for grouping)
export interface RunRecord {
  id: string;
  mode: RunMode;
  entity_policy: EntityPolicy;
  batch_id: string;
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
  mode: RunModeOrBoth;
  entityPolicy: EntityPolicy;
  batchSize: number;
  baseUrl: string;
  model: string;
  maxTokens: number;
  apiKey?: string;
}

// Backend response shape (RunRecord without batch_id, which is added client-side)
export interface BackendRunRecord {
  id: string;
  mode: RunMode;
  entity_policy: EntityPolicy;
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

export interface LLMRunResponse {
  runs: BackendRunRecord[];
  mode_stats: Partial<Record<RunMode, BatchModeStats>>;
  prompt_version: string;
}

// A completed batch stored in session state (not persisted as a unit)
export interface BatchResult {
  batch_id: string;
  request: LLMRunRequest;
  response: LLMRunResponse;
  records: RunRecord[];
  created_at: string;
}
