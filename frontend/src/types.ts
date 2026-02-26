export type Language = 'de' | 'en';
export type Strength = 0 | 1 | 2 | 3;
export type LLMProvider = 'ollama' | 'openai_compatible';
export type LLMStatus = 'used' | 'skipped' | 'failed_fallback';

export interface Metrics {
  sentenceCount: number;
  avgSentenceLengthTokens: number;
  stdevSentenceLengthTokens: number;
  punctuationRate: number;
  typeTokenRatio: number;
  hapaxRate: number;
  stopwordRate: number;
  rareWordRate: number;
  basicNgramUniqueness: number;
}

export interface TransformRequest {
  text: string;
  language: Language;
  profile: 'neutralize_v1';
  strength: Strength;
  llm: {
    enabled: boolean;
    provider?: LLMProvider;
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    embeddingModel?: string;
  };
}

export interface TransformResponse {
  originalText: string;
  transformedText: string;
  metricsBefore: Metrics;
  metricsAfter: Metrics;
  delta: Metrics;
  uniquenessReductionScore: number;
  trace: { applied: string[] };
  llmStatus: LLMStatus;
  semanticSimilarity?: number;
}
