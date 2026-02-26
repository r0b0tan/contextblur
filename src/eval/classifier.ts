// Nearest-centroid classifier with leave-one-out cross-validation.
//
// Choice rationale (per discussion):
//   - Numerically stable — no gradient descent, no regularization tuning.
//   - Interpretable: distance to class centroid is inspectable.
//   - Honest sanity check: if even a trivial classifier can't beat random,
//     the feature signal is absent; if it can, transformation should reduce it.
//
// Feature scaling: min-max normalization computed per LOO fold from the
// training split only (no data leakage from the test sample).
//
// Limitation: requires ≥2 texts per author for meaningful LOO-CV.
// With exactly 1 text per author, every test fold has zero training data for
// the correct author → that author can never be predicted correctly.

export interface LabeledVector {
  authorId: string;
  features: number[]; // raw, unscaled
}

export interface LOOCVResult {
  accuracy: number;
  perAuthor: Record<string, { correct: number; total: number }>;
  // Per-sample predictions in input order — used for cross-metric correlation.
  // distanceToTrueCentroid: Euclidean distance (normalized space) to the true
  // author's centroid. NaN in degenerate folds where the true author has no
  // training samples (1-sample-per-author case). Used for continuous correlation.
  perSample: Array<{ actual: string; predicted: string; distanceToTrueCentroid: number }>;
}

function computeMinMax(
  vectors: number[][],
): { min: number[]; max: number[] } {
  const dim = vectors[0]?.length ?? 0;
  const min = Array<number>(dim).fill(Infinity);
  const max = Array<number>(dim).fill(-Infinity);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      if (v[i] < min[i]) min[i] = v[i];
      if (v[i] > max[i]) max[i] = v[i];
    }
  }
  return { min, max };
}

function normalize(v: number[], min: number[], max: number[]): number[] {
  return v.map((val, i) => {
    const range = max[i] - min[i];
    return range > 0 ? (val - min[i]) / range : 0;
  });
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function computeCentroid(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const sum = Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / vectors.length);
}

export function looCV(samples: LabeledVector[]): LOOCVResult {
  if (samples.length < 2) {
    throw new Error('LOO-CV requires at least 2 samples');
  }

  const perAuthor: Record<string, { correct: number; total: number }> = {};
  const perSample: LOOCVResult['perSample'] = [];
  let correctTotal = 0;

  for (let i = 0; i < samples.length; i++) {
    const testSample = samples[i];
    const training = samples.filter((_, j) => j !== i);

    // ── Feature scaling from training split only ─────────────────────────────
    const trainingRaw = training.map((s) => s.features);
    const { min, max } = computeMinMax(trainingRaw);
    const trainingNorm = trainingRaw.map((v) => normalize(v, min, max));

    // ── Per-author centroids ─────────────────────────────────────────────────
    const groups = new Map<string, number[][]>();
    for (let j = 0; j < training.length; j++) {
      const id = training[j].authorId;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(trainingNorm[j]);
    }

    const centroids = new Map<string, number[]>();
    for (const [id, vecs] of groups) {
      const c = computeCentroid(vecs);
      if (c !== null) centroids.set(id, c);
    }

    // ── Classify test sample ─────────────────────────────────────────────────
    const testNorm = normalize(testSample.features, min, max);
    let predicted = '';
    let bestDist = Infinity;
    for (const [id, centroid] of centroids) {
      const dist = euclidean(testNorm, centroid);
      if (dist < bestDist) {
        bestDist = dist;
        predicted = id;
      }
    }

    // ── Record result ────────────────────────────────────────────────────────
    const trueId = testSample.authorId;
    const trueCentroid = centroids.get(trueId);
    const distanceToTrueCentroid =
      trueCentroid !== undefined ? euclidean(testNorm, trueCentroid) : NaN;

    if (!perAuthor[trueId]) perAuthor[trueId] = { correct: 0, total: 0 };
    perAuthor[trueId].total++;
    perSample.push({ actual: trueId, predicted, distanceToTrueCentroid });
    if (predicted === trueId) {
      perAuthor[trueId].correct++;
      correctTotal++;
    }
  }

  return {
    accuracy: Math.round((correctTotal / samples.length) * 10000) / 10000,
    perAuthor,
    perSample,
  };
}
