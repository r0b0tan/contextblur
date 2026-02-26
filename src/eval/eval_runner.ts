import { runPipeline } from '../core/pipeline.js';
import { computeMetrics } from '../metrics/index.js';
import { metricsToVector, vectorToArray } from './feature_extractor.js';
import { looCV } from './classifier.js';
import type { AuthoredText, EvalConfig, EvalResult, StrengthCurveResult } from './types.js';
import type { Strength } from '../core/types.js';

// ── Math utilities ─────────────────────────────────────────────────────────

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
  const dx = Math.sqrt(x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0));
  const dy = Math.sqrt(y.reduce((sum, yi) => sum + (yi - my) ** 2, 0));
  return dx > 0 && dy > 0 ? Math.round((num / (dx * dy)) * 10000) / 10000 : 0;
}

// Per-sample attribution change: +1 if correctly attributed before but not after,
// -1 if incorrectly attributed before but correctly after, 0 if unchanged.
// Positive values are desired (transformation made attribution harder).
function attributionChangePerSample(
  before: ReturnType<typeof looCV>,
  after: ReturnType<typeof looCV>,
): number[] {
  return before.perSample.map((b, i) => {
    const correctBefore = b.predicted === b.actual ? 1 : 0;
    const correctAfter = after.perSample[i].predicted === after.perSample[i].actual ? 1 : 0;
    return correctBefore - correctAfter;
  });
}

// Continuous distance-delta correlation: pairs (score_i, distanceDelta_i) where
// distanceDelta = distanceToTrueCentroid_after − distanceToTrueCentroid_before.
// Positive delta = sample moved further from its true class centroid (desired).
// Skips folds where distanceToTrueCentroid is NaN (degenerate: author absent
// from training split). Returns paired arrays aligned to the scores array.
function distanceDeltaPairs(
  scores: number[],
  before: ReturnType<typeof looCV>,
  after: ReturnType<typeof looCV>,
): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < before.perSample.length; i++) {
    const db = before.perSample[i].distanceToTrueCentroid;
    const da = after.perSample[i].distanceToTrueCentroid;
    if (Number.isFinite(db) && Number.isFinite(da)) {
      xs.push(scores[i]);
      ys.push(da - db);
    }
  }
  return { xs, ys };
}

// ── Core eval ─────────────────────────────────────────────────────────────

export async function runEval(
  corpus: AuthoredText[],
  config: EvalConfig = { strength: 2 },
): Promise<EvalResult> {
  if (corpus.length < 2) {
    throw new Error('Corpus requires at least 2 samples');
  }

  const authorIds = [...new Set(corpus.map((s) => s.authorId))];

  // ── Feature vectors: before (original metrics) ────────────────────────────
  const samplesBefore = corpus.map((s) => ({
    authorId: s.authorId,
    features: vectorToArray(metricsToVector(computeMetrics(s.text, s.language))),
  }));

  // ── Feature vectors + scores: after (transformed metrics) ─────────────────
  const scores: number[] = [];
  const samplesAfter = await Promise.all(
    corpus.map(async (s) => {
      const result = await runPipeline({
        text: s.text,
        language: s.language,
        profile: 'neutralize_v1',
        strength: config.strength,
        llm: { enabled: false },
      });
      scores.push(result.uniquenessReductionScore);
      return {
        authorId: s.authorId,
        features: vectorToArray(metricsToVector(result.metricsAfter)),
      };
    }),
  );

  // ── LOO-CV on both sets ────────────────────────────────────────────────────
  const resultBefore = looCV(samplesBefore);
  const resultAfter = looCV(samplesAfter);

  // ── Score-accuracy correlation (discrete) ────────────────────────────────
  const attributionChange = attributionChangePerSample(resultBefore, resultAfter);
  const scoreCorrelation = pearson(scores, attributionChange);

  // ── Score-distance correlation (continuous, more sensitive) ───────────────
  const { xs, ys } = distanceDeltaPairs(scores, resultBefore, resultAfter);
  const scoreCorrelationContinuous = pearson(xs, ys);

  return {
    sampleCount: corpus.length,
    authorCount: authorIds.length,
    strength: config.strength,
    accuracyBefore: resultBefore.accuracy,
    accuracyAfter: resultAfter.accuracy,
    attributionDelta:
      Math.round((resultAfter.accuracy - resultBefore.accuracy) * 10000) / 10000,
    perAuthorBefore: resultBefore.perAuthor,
    perAuthorAfter: resultAfter.perAuthor,
    scoreCorrelation,
    scoreCorrelationContinuous,
    scoreCorrelationReliable: corpus.length >= 20,
  };
}

// ── Strength curve ─────────────────────────────────────────────────────────

export async function runStrengthCurve(
  corpus: AuthoredText[],
  strengths: Strength[] = [0, 1, 2, 3],
): Promise<StrengthCurveResult> {
  if (corpus.length < 2) {
    throw new Error('Corpus requires at least 2 samples');
  }

  const authorIds = [...new Set(corpus.map((s) => s.authorId))];

  // Run all strength levels in parallel; accuracyBefore is identical across all.
  const results = await Promise.all(strengths.map((s) => runEval(corpus, { strength: s })));

  return {
    sampleCount: corpus.length,
    authorCount: authorIds.length,
    baselineAccuracy: results[0].accuracyBefore,
    entries: results.map((r, i) => ({
      strength: strengths[i],
      accuracyAfter: r.accuracyAfter,
      attributionDelta: r.attributionDelta,
      scoreCorrelation: r.scoreCorrelation,
      scoreCorrelationContinuous: r.scoreCorrelationContinuous,
    })),
  };
}
