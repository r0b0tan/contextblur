export type Language = 'de' | 'en';
export type Strength = 0 | 1 | 2 | 3;
export type LLMProvider = 'ollama' | 'openai_compatible';
export type LLMStatus = 'used' | 'skipped' | 'failed_fallback';
export type SignalType = 'lexical' | 'structural' | 'semantic' | 'contextual';

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

export interface AnnotatedSpan {
  start: number;
  end: number;
  originalFragment: string;
  replacedWith: string;
  transform: string;
  strength: Strength;
  signalType: SignalType;
}

export interface RiskSpan {
  start: number;
  end: number;
  feature: 'hapax' | 'rare_word';
  riskLevel: 'high' | 'medium';
}

// Versioned composite index — formula version and weights exposed for reproducibility.
export interface IndexScores {
  formulaVersion: string;
  weights: Record<string, number>;
  valueBefore: number;
  valueAfter: number;
  delta: number;
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
  sui: IndexScores;
  ssi: IndexScores;
  annotatedSpans: AnnotatedSpan[];
  riskAnnotations: RiskSpan[];
  trace: { applied: string[] };
  llmStatus: LLMStatus;
  semanticSimilarity?: number;
}

// One data point in the strength–signal tradeoff curve.
export interface CurvePoint {
  strength: Strength;
  sui: IndexScores;
  ssi: IndexScores;
  delta: Metrics;
}
