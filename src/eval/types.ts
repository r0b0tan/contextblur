import type { Strength } from '../core/types.js';

export interface AuthoredText {
  authorId: string;
  text: string;
  language: 'de' | 'en';
}

// Five-dimensional feature vector over Metrics.
// Chosen for orthogonality relative to each other:
//   ttr and hapaxRate measure lexical diversity from different angles;
//   stdevSentenceLength captures syntactic variance;
//   stopwordRate and punctuationRate reflect structural habits.
// rareWordRate is intentionally excluded: it depends on the embedded frequency list,
// keeping the feature space independent from the proxy score.
export interface FeatureVector {
  ttr: number;
  hapaxRate: number;
  stdevSentenceLength: number;
  stopwordRate: number;
  punctuationRate: number;
}

export interface EvalConfig {
  strength: Strength;
}

export interface EvalResult {
  sampleCount: number;
  authorCount: number;
  strength: Strength;
  // LOO-CV nearest-centroid accuracy on original texts
  accuracyBefore: number;
  // LOO-CV nearest-centroid accuracy on transformed texts
  accuracyAfter: number;
  // accuracyAfter − accuracyBefore; negative = attribution harder (desired)
  attributionDelta: number;
  perAuthorBefore: Record<string, { correct: number; total: number }>;
  perAuthorAfter: Record<string, { correct: number; total: number }>;
  // Pearson r between uniquenessReductionScore and discrete attribution change {-1,0,+1}.
  // +1: score perfectly predicts where attribution got harder.
  //  0: score uncorrelated with attribution change — miscalibrated.
  // -1: score predicts the wrong direction.
  scoreCorrelation: number;
  // Pearson r between uniquenessReductionScore and continuous distanceDelta
  // (distanceToTrueCentroid_after − distanceToTrueCentroid_before, per sample).
  // More sensitive than scoreCorrelation because it captures margin, not just the
  // classification boundary. NaN-pairs (degenerate folds) are excluded before Pearson.
  scoreCorrelationContinuous: number;
  // True when n ≥ 20; below this threshold both correlation metrics are unreliable.
  scoreCorrelationReliable: boolean;
}

// Result of running eval at every strength level.
// baselineAccuracy is computed once (same original corpus for all levels).
export interface StrengthCurveResult {
  sampleCount: number;
  authorCount: number;
  baselineAccuracy: number;
  entries: Array<{
    strength: Strength;
    accuracyAfter: number;
    attributionDelta: number;
    scoreCorrelation: number;
    scoreCorrelationContinuous: number;
  }>;
}
