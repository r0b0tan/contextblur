import type { Language, Metrics, IndexScores, RiskSpan } from '../core/types.js';
import { getStopwords } from './stopwords.js';
import { isRareWord } from './frequency.js';

// Tokenize to lowercase alpha+digit tokens, including German umlauts.
function tokenize(text: string): string[] {
  return text
    .replace(/[^a-zA-ZäöüßÄÖÜ0-9\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// Split on sentence-ending punctuation followed by whitespace.
// Texts without .!? are treated as a single sentence.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function populationStdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildTrigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    out.push(`${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`);
  }
  return out;
}

function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function computeMetrics(text: string, language: Language): Metrics {
  const allTokens = tokenize(text);
  const totalTokens = allTokens.length;

  if (totalTokens === 0) {
    return {
      sentenceCount: 0,
      avgSentenceLengthTokens: 0,
      stdevSentenceLengthTokens: 0,
      punctuationRate: 0,
      typeTokenRatio: 0,
      hapaxRate: 0,
      stopwordRate: 0,
      rareWordRate: 0,
      basicNgramUniqueness: 0,
    };
  }

  const sentences = splitSentences(text);
  const sentenceLengths = sentences.map((s) => tokenize(s).length);
  const avgSentenceLength =
    sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

  // Punctuation rate: count / totalTokens (raw ratio, per ARCHITECTURE.md §7)
  const punctuationCount = (text.match(/[.,;:!?]/g) ?? []).length;
  const punctuationRate = punctuationCount / totalTokens;

  // Type-token ratio
  const typeSet = new Set(allTokens);
  const typeTokenRatio = typeSet.size / totalTokens;

  // Hapax rate: word types with frequency == 1 / totalTokens (per ARCHITECTURE.md §7)
  const freq = new Map<string, number>();
  for (const t of allTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const hapaxCount = [...freq.values()].filter((v) => v === 1).length;
  const hapaxRate = hapaxCount / totalTokens;

  // Stopword rate
  const stopwords = getStopwords(language);
  const stopwordCount = allTokens.filter((t) => stopwords.has(t)).length;
  const stopwordRate = stopwordCount / totalTokens;

  // Rare word rate — only over word tokens (≥3 alpha chars), excludes numbers
  const wordTokens = allTokens.filter((t) => /[a-züöäß]{3,}/.test(t));
  const rareCount = wordTokens.filter((t) => isRareWord(t, language)).length;
  const rareWordRate = wordTokens.length > 0 ? rareCount / wordTokens.length : 0;

  // Basic n-gram uniqueness (trigrams)
  const trigrams = buildTrigrams(allTokens);
  const uniqueTrigrams = new Set(trigrams);
  const basicNgramUniqueness =
    trigrams.length > 0 ? uniqueTrigrams.size / trigrams.length : 0;

  return {
    sentenceCount: sentences.length,
    avgSentenceLengthTokens: r4(avgSentenceLength),
    stdevSentenceLengthTokens: r4(populationStdev(sentenceLengths)),
    punctuationRate: r4(punctuationRate),
    typeTokenRatio: r4(typeTokenRatio),
    hapaxRate: r4(hapaxRate),
    stopwordRate: r4(stopwordRate),
    rareWordRate: r4(rareWordRate),
    basicNgramUniqueness: r4(basicNgramUniqueness),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SUI — Stylometric Uniqueness Index
// Formula version: sui-v1.0
// Composite score [0–100] weighted over hapax, rare word, TTR, sentence stdev.
// stdevSentenceLengthTokens is normalized by SUI_STDEV_NORM (empirical baseline).
// ──────────────────────────────────────────────────────────────────────────────
const SUI_FORMULA_VERSION = 'sui-v1.0';
const SUI_STDEV_NORM = 10.0;
const SUI_WEIGHTS = {
  hapaxRate: 0.25,
  rareWordRate: 0.25,
  typeTokenRatio: 0.20,
  stdevSentenceLengthTokens: 0.30,
} as const;

function suiValue(m: Metrics): number {
  return (
    SUI_WEIGHTS.hapaxRate * m.hapaxRate +
    SUI_WEIGHTS.rareWordRate * m.rareWordRate +
    SUI_WEIGHTS.typeTokenRatio * m.typeTokenRatio +
    SUI_WEIGHTS.stdevSentenceLengthTokens *
      Math.min(m.stdevSentenceLengthTokens / SUI_STDEV_NORM, 1)
  );
}

export function computeSUI(before: Metrics, after: Metrics): IndexScores {
  const valueBefore = Math.round(suiValue(before) * 10000) / 100;
  const valueAfter = Math.round(suiValue(after) * 10000) / 100;
  return {
    formulaVersion: SUI_FORMULA_VERSION,
    weights: { ...SUI_WEIGHTS, stdevNormFactor: SUI_STDEV_NORM },
    valueBefore,
    valueAfter,
    delta: r4(valueBefore - valueAfter),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SSI — Semantic Specificity Index
// Formula version: ssi-v1.0
// Composite score [0–100] weighted over n-gram uniqueness, rare word rate,
// and non-stopword rate (proxy for semantic content density).
// ──────────────────────────────────────────────────────────────────────────────
const SSI_FORMULA_VERSION = 'ssi-v1.0';
const SSI_WEIGHTS = {
  basicNgramUniqueness: 0.40,
  rareWordRate: 0.35,
  nonStopwordRate: 0.25,
} as const;

function ssiValue(m: Metrics): number {
  return (
    SSI_WEIGHTS.basicNgramUniqueness * m.basicNgramUniqueness +
    SSI_WEIGHTS.rareWordRate * m.rareWordRate +
    SSI_WEIGHTS.nonStopwordRate * (1 - m.stopwordRate)
  );
}

export function computeSSI(before: Metrics, after: Metrics): IndexScores {
  const valueBefore = Math.round(ssiValue(before) * 10000) / 100;
  const valueAfter = Math.round(ssiValue(after) * 10000) / 100;
  return {
    formulaVersion: SSI_FORMULA_VERSION,
    weights: { ...SSI_WEIGHTS },
    valueBefore,
    valueAfter,
    delta: r4(valueBefore - valueAfter),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Risk annotations — computed on originalText before any transformation.
// Identifies tokens with elevated stylometric load: hapax and/or rare words.
// Stopwords are excluded (low distinctiveness by definition).
// ──────────────────────────────────────────────────────────────────────────────
export function computeRiskAnnotations(text: string, language: Language): RiskSpan[] {
  // Scan word-boundary tokens (≥1 alpha chars) preserving character positions.
  const wordRegex = /[a-zA-ZäöüßÄÖÜ]{2,}/g;
  const positions: Array<{ start: number; end: number; word: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    positions.push({ start: match.index, end: match.index + match[0].length, word: match[0].toLowerCase() });
  }

  // Frequency map over lowercased word forms
  const freq = new Map<string, number>();
  for (const pos of positions) freq.set(pos.word, (freq.get(pos.word) ?? 0) + 1);

  const stopwords = getStopwords(language);
  const spans: RiskSpan[] = [];

  for (const pos of positions) {
    if (stopwords.has(pos.word)) continue;

    const isHapax = (freq.get(pos.word) ?? 0) === 1;
    const isRare = isRareWord(pos.word, language);

    if (isHapax && isRare) {
      spans.push({ start: pos.start, end: pos.end, feature: 'hapax', riskLevel: 'high' });
    } else if (isRare) {
      spans.push({ start: pos.start, end: pos.end, feature: 'rare_word', riskLevel: 'high' });
    } else if (isHapax) {
      spans.push({ start: pos.start, end: pos.end, feature: 'hapax', riskLevel: 'medium' });
    }
  }

  return spans;
}

export function computeDelta(before: Metrics, after: Metrics): Metrics {
  return {
    sentenceCount: after.sentenceCount - before.sentenceCount,
    avgSentenceLengthTokens: r4(
      after.avgSentenceLengthTokens - before.avgSentenceLengthTokens,
    ),
    stdevSentenceLengthTokens: r4(
      after.stdevSentenceLengthTokens - before.stdevSentenceLengthTokens,
    ),
    punctuationRate: r4(after.punctuationRate - before.punctuationRate),
    typeTokenRatio: r4(after.typeTokenRatio - before.typeTokenRatio),
    hapaxRate: r4(after.hapaxRate - before.hapaxRate),
    stopwordRate: r4(after.stopwordRate - before.stopwordRate),
    rareWordRate: r4(after.rareWordRate - before.rareWordRate),
    basicNgramUniqueness: r4(
      after.basicNgramUniqueness - before.basicNgramUniqueness,
    ),
  };
}
