import type { Language, Metrics } from '../core/types.js';
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
