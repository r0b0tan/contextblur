import type { Metrics } from '../core/types.js';
import type { FeatureVector } from './types.js';

export function metricsToVector(m: Metrics): FeatureVector {
  return {
    ttr: m.typeTokenRatio,
    hapaxRate: m.hapaxRate,
    stdevSentenceLength: m.stdevSentenceLengthTokens,
    stopwordRate: m.stopwordRate,
    punctuationRate: m.punctuationRate,
  };
}

// Stable dimension order — must match classifier's expectation.
export function vectorToArray(v: FeatureVector): number[] {
  return [v.ttr, v.hapaxRate, v.stdevSentenceLength, v.stopwordRate, v.punctuationRate];
}
