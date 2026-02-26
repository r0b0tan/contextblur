export type Language = 'de' | 'en';
export type Profile = 'neutralize_v1';
export type Strength = 0 | 1 | 2 | 3;

export type LLMProvider = 'ollama' | 'openai_compatible';

export interface LLMConfig {
  enabled: boolean;
  // Provider defaults to 'ollama' when omitted.
  provider?: LLMProvider;
  // Base URL override. Defaults: ollama=http://localhost:11434, openai_compatible=http://localhost:1234
  baseUrl?: string;
  // API key for providers that require authentication (e.g. OpenAI). Not used by Ollama.
  apiKey?: string;
  model?: string;
  // Optional embedding model. When set, the pipeline computes
  // semanticSimilarity = cosine(embed(original), embed(transformed)).
  embeddingModel?: string;
}

export interface TransformRequest {
  text: string;
  language: Language;
  profile: Profile;
  strength: Strength;
  llm: LLMConfig;
}

export interface Metrics {
  sentenceCount: number;
  avgSentenceLengthTokens: number;
  stdevSentenceLengthTokens: number;
  // Punctuation marks (.,;:!?) per total tokens — raw ratio
  punctuationRate: number;
  // Unique token types / total tokens
  typeTokenRatio: number;
  // Token types appearing exactly once / total tokens (per ARCHITECTURE.md §7)
  hapaxRate: number;
  // Stopword tokens / total tokens
  stopwordRate: number;
  // Rare-word tokens / total word tokens (words ≥3 chars, not in frequency list)
  rareWordRate: number;
  // Unique trigrams / total trigrams
  basicNgramUniqueness: number;
}

export type MetricsDelta = Metrics;

// Explicit LLM execution status — separate from trace to avoid fragile trace string parsing.
export type LLMStatus = 'used' | 'skipped' | 'failed_fallback';

export interface TransformResponse {
  originalText: string;
  transformedText: string;
  metricsBefore: Metrics;
  metricsAfter: Metrics;
  delta: MetricsDelta;
  uniquenessReductionScore: number;
  trace: { applied: string[] };
  llmStatus: LLMStatus;
  // Cosine similarity between embeddings of original and transformed text.
  // Range [−1, 1]; values below 0.85 suggest semantic content was lost.
  // Absent when llm.embeddingModel is not set or embedding fails.
  semanticSimilarity?: number;
}

// All transform modules implement this interface.
// Must be pure functions — no I/O, no global state, no side effects.
export interface Transform {
  name: string;
  apply(text: string, language: Language): string;
}

// Generic LLM adapter interface — mockable in tests.
// Implementations: OllamaClient (ollama.ts), OpenAICompatibleClient (openai_compatible.ts)
export interface LLMClient {
  generate(prompt: string, model: string): Promise<string>;
  // Returns a float32 embedding vector. Throws on HTTP error or timeout.
  embed(text: string, model: string): Promise<number[]>;
}

// Backward-compatible alias — remove once all call sites are updated.
export type OllamaClient = LLMClient;
