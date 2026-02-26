import { describe, it, expect } from 'vitest';
import { looCV, type LabeledVector } from '../src/eval/classifier.js';
import { metricsToVector, vectorToArray } from '../src/eval/feature_extractor.js';
import { runEval, runStrengthCurve } from '../src/eval/eval_runner.js';
import { computeMetrics } from '../src/metrics/index.js';
import type { AuthoredText } from '../src/eval/types.js';

// ── feature_extractor ─────────────────────────────────────────────────────

describe('metricsToVector', () => {
  it('returns all five dimensions', () => {
    const m = computeMetrics('Hello world. How are you?', 'en');
    const v = metricsToVector(m);
    expect(Object.keys(v)).toHaveLength(5);
    expect(v).toHaveProperty('ttr');
    expect(v).toHaveProperty('hapaxRate');
    expect(v).toHaveProperty('stdevSentenceLength');
    expect(v).toHaveProperty('stopwordRate');
    expect(v).toHaveProperty('punctuationRate');
  });

  it('vectorToArray returns array of length 5', () => {
    const m = computeMetrics('Hello world. How are you?', 'en');
    const arr = vectorToArray(metricsToVector(m));
    expect(arr).toHaveLength(5);
    expect(arr.every((v) => typeof v === 'number' && Number.isFinite(v))).toBe(true);
  });

  it('maps ttr from metrics.typeTokenRatio', () => {
    const m = computeMetrics('apple apple apple', 'en');
    const v = metricsToVector(m);
    expect(v.ttr).toBe(m.typeTokenRatio);
  });

  it('maps stdevSentenceLength from metrics.stdevSentenceLengthTokens', () => {
    const m = computeMetrics('Hello world. How are you today?', 'en');
    const v = metricsToVector(m);
    expect(v.stdevSentenceLength).toBe(m.stdevSentenceLengthTokens);
  });
});

// ── classifier — looCV ────────────────────────────────────────────────────

describe('looCV — structure', () => {
  it('throws when fewer than 2 samples', () => {
    const samples: LabeledVector[] = [{ authorId: 'a', features: [1, 0, 0, 0, 0] }];
    expect(() => looCV(samples)).toThrow();
  });

  it('returns accuracy in [0, 1]', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
  });

  it('returns perAuthor totals matching input', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'a', features: [0.15, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
      { authorId: 'b', features: [0.85, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    expect(result.perAuthor['a'].total).toBe(2);
    expect(result.perAuthor['b'].total).toBe(2);
  });

  it('perSample has length equal to input', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'a', features: [0.12, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
      { authorId: 'b', features: [0.88, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    expect(result.perSample).toHaveLength(4);
  });

  it('perSample[i].distanceToTrueCentroid is finite and ≥0 when ≥2 samples per author', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'a', features: [0.12, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
      { authorId: 'b', features: [0.88, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    for (const s of result.perSample) {
      expect(Number.isFinite(s.distanceToTrueCentroid)).toBe(true);
      expect(s.distanceToTrueCentroid).toBeGreaterThanOrEqual(0);
    }
  });

  it('perSample[i].distanceToTrueCentroid is NaN in degenerate 1-sample-per-author case', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    // Each fold has 0 training samples for the true author → no centroid → NaN.
    for (const s of result.perSample) {
      expect(Number.isNaN(s.distanceToTrueCentroid)).toBe(true);
    }
  });

  it('perSample[i].actual matches samples[i].authorId', () => {
    const samples: LabeledVector[] = [
      { authorId: 'alice', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'alice', features: [0.12, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'bob', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
      { authorId: 'bob', features: [0.88, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    expect(result.perSample[0].actual).toBe('alice');
    expect(result.perSample[1].actual).toBe('alice');
    expect(result.perSample[2].actual).toBe('bob');
    expect(result.perSample[3].actual).toBe('bob');
  });

  it('perSample correct count matches perAuthor correct count', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'a', features: [0.12, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
      { authorId: 'b', features: [0.88, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    const perSampleCorrect = result.perSample.filter(
      (s) => s.actual === s.predicted,
    ).length;
    const perAuthorCorrect = Object.values(result.perAuthor).reduce(
      (sum, v) => sum + v.correct,
      0,
    );
    expect(perSampleCorrect).toBe(perAuthorCorrect);
  });
});

describe('looCV — perfect separation', () => {
  // Author A: all features near 0.1 / Author B: all features near 0.9
  // After min-max normalization and centroid computation, classification is trivial.
  it('accuracy = 1.0 for clearly separable authors (3 samples each)', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'a', features: [0.12, 0.11, 0.09, 0.1, 0.1] },
      { authorId: 'a', features: [0.11, 0.1, 0.1, 0.12, 0.09] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
      { authorId: 'b', features: [0.88, 0.91, 0.9, 0.89, 0.9] },
      { authorId: 'b', features: [0.9, 0.9, 0.88, 0.91, 0.9] },
    ];
    const result = looCV(samples);
    expect(result.accuracy).toBe(1);
    expect(result.perAuthor['a'].correct).toBe(3);
    expect(result.perAuthor['b'].correct).toBe(3);
  });
});

describe('looCV — degenerate case (1 sample per author)', () => {
  // LOO fold for author A: only author B in training → can only predict B → wrong.
  // LOO fold for author B: only author A in training → can only predict A → wrong.
  // Expected accuracy: 0.
  it('accuracy = 0 with exactly 1 sample per author', () => {
    const samples: LabeledVector[] = [
      { authorId: 'a', features: [0.1, 0.1, 0.1, 0.1, 0.1] },
      { authorId: 'b', features: [0.9, 0.9, 0.9, 0.9, 0.9] },
    ];
    const result = looCV(samples);
    expect(result.accuracy).toBe(0);
  });
});

describe('looCV — three authors', () => {
  it('accuracy = 1.0 for perfectly separated three-author corpus', () => {
    const mk = (id: string, base: number): LabeledVector[] =>
      Array.from({ length: 3 }, (_, k) => ({
        authorId: id,
        features: [base + k * 0.01, base, base, base, base],
      }));

    const samples = [...mk('a', 0.1), ...mk('b', 0.5), ...mk('c', 0.9)];
    const result = looCV(samples);
    expect(result.accuracy).toBe(1);
    expect(Object.keys(result.perAuthor)).toHaveLength(3);
  });
});

// ── eval_runner ────────────────────────────────────────────────────────────

describe('runEval — structure', () => {
  const corpus: AuthoredText[] = [
    {
      authorId: 'a',
      language: 'en',
      text: 'The quick brown fox jumps over the lazy dog. Hello world today.',
    },
    {
      authorId: 'a',
      language: 'en',
      text: 'She sells seashells by the seashore. The shells she sells are seashells.',
    },
    {
      authorId: 'b',
      language: 'en',
      text: 'Extraordinary circumstances require phenomenal solutions for bizarre problems.',
    },
    {
      authorId: 'b',
      language: 'en',
      text: 'The catastrophic event devastated the brilliant and outstanding community.',
    },
  ];

  it('returns correct structure', async () => {
    const result = await runEval(corpus, { strength: 1 });
    expect(result).toHaveProperty('sampleCount', 4);
    expect(result).toHaveProperty('authorCount', 2);
    expect(result).toHaveProperty('strength', 1);
    expect(result).toHaveProperty('accuracyBefore');
    expect(result).toHaveProperty('accuracyAfter');
    expect(result).toHaveProperty('attributionDelta');
    expect(result).toHaveProperty('perAuthorBefore');
    expect(result).toHaveProperty('perAuthorAfter');
  });

  it('accuracyBefore and accuracyAfter are in [0, 1]', async () => {
    const result = await runEval(corpus, { strength: 1 });
    expect(result.accuracyBefore).toBeGreaterThanOrEqual(0);
    expect(result.accuracyBefore).toBeLessThanOrEqual(1);
    expect(result.accuracyAfter).toBeGreaterThanOrEqual(0);
    expect(result.accuracyAfter).toBeLessThanOrEqual(1);
  });

  it('attributionDelta equals accuracyAfter - accuracyBefore', async () => {
    const result = await runEval(corpus, { strength: 2 });
    expect(result.attributionDelta).toBeCloseTo(
      result.accuracyAfter - result.accuracyBefore,
      4,
    );
  });

  it('throws when corpus has fewer than 2 samples', async () => {
    await expect(
      runEval([corpus[0]], { strength: 1 }),
    ).rejects.toThrow();
  });

  it('perAuthorBefore totals sum to sampleCount', async () => {
    const result = await runEval(corpus, { strength: 1 });
    const total = Object.values(result.perAuthorBefore).reduce(
      (sum, v) => sum + v.total,
      0,
    );
    expect(total).toBe(result.sampleCount);
  });

  it('scoreCorrelation is present and in [-1, 1]', async () => {
    const result = await runEval(corpus, { strength: 2 });
    expect(result).toHaveProperty('scoreCorrelation');
    expect(result.scoreCorrelation).toBeGreaterThanOrEqual(-1);
    expect(result.scoreCorrelation).toBeLessThanOrEqual(1);
  });

  it('scoreCorrelationContinuous is present and in [-1, 1]', async () => {
    const result = await runEval(corpus, { strength: 2 });
    expect(result).toHaveProperty('scoreCorrelationContinuous');
    expect(result.scoreCorrelationContinuous).toBeGreaterThanOrEqual(-1);
    expect(result.scoreCorrelationContinuous).toBeLessThanOrEqual(1);
  });

  it('scoreCorrelationReliable is false for small corpus (n=4 < 20)', async () => {
    const result = await runEval(corpus, { strength: 1 });
    expect(result.scoreCorrelationReliable).toBe(false);
  });
});

// ── runStrengthCurve ────────────────────────────────────────────────────────

const CURVE_CORPUS: AuthoredText[] = [
  {
    authorId: 'a',
    language: 'en',
    text: 'The quick brown fox jumps over the lazy dog. Hello world today.',
  },
  {
    authorId: 'a',
    language: 'en',
    text: 'She sells seashells by the seashore. The shells she sells.',
  },
  {
    authorId: 'b',
    language: 'en',
    text: 'Extraordinary circumstances require phenomenal solutions.',
  },
  {
    authorId: 'b',
    language: 'en',
    text: 'The catastrophic event devastated the brilliant community.',
  },
];

describe('runStrengthCurve — structure', () => {
  it('returns correct top-level shape', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS);
    expect(result).toHaveProperty('sampleCount', 4);
    expect(result).toHaveProperty('authorCount', 2);
    expect(result).toHaveProperty('baselineAccuracy');
    expect(result).toHaveProperty('entries');
    expect(result.baselineAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.baselineAccuracy).toBeLessThanOrEqual(1);
  });

  it('has 4 entries for default strengths [0,1,2,3]', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS);
    expect(result.entries).toHaveLength(4);
  });

  it('entry strengths match requested strengths', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS, [0, 2]);
    expect(result.entries[0].strength).toBe(0);
    expect(result.entries[1].strength).toBe(2);
  });

  it('each entry has accuracyAfter in [0, 1]', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS);
    for (const e of result.entries) {
      expect(e.accuracyAfter).toBeGreaterThanOrEqual(0);
      expect(e.accuracyAfter).toBeLessThanOrEqual(1);
    }
  });

  it('each entry attributionDelta = accuracyAfter - baselineAccuracy', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS);
    for (const e of result.entries) {
      expect(e.attributionDelta).toBeCloseTo(
        e.accuracyAfter - result.baselineAccuracy,
        4,
      );
    }
  });

  it('each entry scoreCorrelation is in [-1, 1]', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS);
    for (const e of result.entries) {
      expect(e.scoreCorrelation).toBeGreaterThanOrEqual(-1);
      expect(e.scoreCorrelation).toBeLessThanOrEqual(1);
    }
  });

  it('each entry scoreCorrelationContinuous is in [-1, 1]', async () => {
    const result = await runStrengthCurve(CURVE_CORPUS);
    for (const e of result.entries) {
      expect(e.scoreCorrelationContinuous).toBeGreaterThanOrEqual(-1);
      expect(e.scoreCorrelationContinuous).toBeLessThanOrEqual(1);
    }
  });

  it('throws for corpus with fewer than 2 samples', async () => {
    await expect(runStrengthCurve([CURVE_CORPUS[0]])).rejects.toThrow();
  });
});
