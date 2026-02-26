import { describe, it, expect } from 'vitest';
import { computeMetrics, computeDelta } from '../src/metrics/index.js';

const EN_SHORT = 'The quick brown fox jumps over the lazy dog. The dog barked loudly.';
const DE_SHORT = 'Der schnelle braune Fuchs springt über den faulen Hund. Der Hund bellte laut.';
const REPEAT = 'apple apple apple apple apple banana banana banana';
const UNIQUE = 'apple banana cherry date elderberry fig grape hazelnut iris jasmine';

describe('computeMetrics — shape', () => {
  it('returns all required keys', () => {
    const m = computeMetrics(EN_SHORT, 'en');
    const keys: (keyof typeof m)[] = [
      'sentenceCount',
      'avgSentenceLengthTokens',
      'stdevSentenceLengthTokens',
      'punctuationRate',
      'typeTokenRatio',
      'hapaxRate',
      'stopwordRate',
      'rareWordRate',
      'basicNgramUniqueness',
    ];
    for (const k of keys) expect(m).toHaveProperty(k);
  });

  it('all values are finite numbers', () => {
    const m = computeMetrics(EN_SHORT, 'en');
    for (const v of Object.values(m)) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('computeMetrics — sentenceCount', () => {
  it('counts two sentences in EN_SHORT', () => {
    expect(computeMetrics(EN_SHORT, 'en').sentenceCount).toBe(2);
  });

  it('counts two sentences in DE_SHORT', () => {
    expect(computeMetrics(DE_SHORT, 'de').sentenceCount).toBe(2);
  });

  it('counts one sentence when no terminating punctuation', () => {
    expect(computeMetrics('Hello world how are you', 'en').sentenceCount).toBe(1);
  });

  it('returns zero for empty string', () => {
    expect(computeMetrics('', 'en').sentenceCount).toBe(0);
  });
});

describe('computeMetrics — ratios in [0, 1]', () => {
  for (const metric of ['typeTokenRatio', 'hapaxRate', 'stopwordRate', 'rareWordRate', 'basicNgramUniqueness'] as const) {
    it(`${metric} is in [0, 1]`, () => {
      const m = computeMetrics(EN_SHORT, 'en');
      expect(m[metric]).toBeGreaterThanOrEqual(0);
      expect(m[metric]).toBeLessThanOrEqual(1);
    });
  }
});

describe('computeMetrics — hapaxRate', () => {
  it('hapaxRate is 0 for text where all words repeat', () => {
    // "apple apple apple apple apple banana banana banana" — no word appears exactly once
    const m = computeMetrics(REPEAT, 'en');
    expect(m.hapaxRate).toBe(0);
  });

  it('hapaxRate is higher for unique text than for repetitive text', () => {
    const mUnique = computeMetrics(UNIQUE, 'en');
    const mRepeat = computeMetrics(REPEAT, 'en');
    expect(mUnique.hapaxRate).toBeGreaterThan(mRepeat.hapaxRate);
  });
});

describe('computeMetrics — typeTokenRatio', () => {
  it('TTR = 1 for all-unique tokens', () => {
    const m = computeMetrics(UNIQUE, 'en');
    expect(m.typeTokenRatio).toBe(1);
  });

  it('TTR < 1 for repetitive text', () => {
    const m = computeMetrics(REPEAT, 'en');
    expect(m.typeTokenRatio).toBeLessThan(1);
  });
});

describe('computeMetrics — basicNgramUniqueness', () => {
  it('uniqueness = 1 for text with no repeated trigrams', () => {
    const m = computeMetrics(UNIQUE, 'en');
    expect(m.basicNgramUniqueness).toBe(1);
  });

  it('uniqueness < 1 for highly repetitive text', () => {
    const m = computeMetrics('the cat sat on the mat and the cat sat', 'en');
    expect(m.basicNgramUniqueness).toBeLessThan(1);
  });
});

describe('computeMetrics — stopwordRate', () => {
  it('is > 0 for a sentence with articles and prepositions', () => {
    const m = computeMetrics(EN_SHORT, 'en');
    expect(m.stopwordRate).toBeGreaterThan(0);
  });

  it('is > 0 for German text', () => {
    const m = computeMetrics(DE_SHORT, 'de');
    expect(m.stopwordRate).toBeGreaterThan(0);
  });
});

describe('computeMetrics — punctuationRate', () => {
  it('is > 0 for text with punctuation', () => {
    const m = computeMetrics('Hello world. How are you?', 'en');
    expect(m.punctuationRate).toBeGreaterThan(0);
  });

  it('is 0 for text with no punctuation', () => {
    const m = computeMetrics('hello world how are you', 'en');
    expect(m.punctuationRate).toBe(0);
  });
});

describe('computeMetrics — zeros on empty input', () => {
  it('returns all zeros for empty string', () => {
    const m = computeMetrics('', 'en');
    for (const v of Object.values(m)) expect(v).toBe(0);
  });
});

describe('computeDelta', () => {
  it('delta is zero when before === after', () => {
    const m = computeMetrics(EN_SHORT, 'en');
    const d = computeDelta(m, m);
    for (const v of Object.values(d)) expect(v).toBe(0);
  });

  it('hapaxRate delta is negative when output is more repetitive than input', () => {
    const before = computeMetrics('apple banana cherry grape mango peach', 'en');
    const after = computeMetrics('apple apple apple apple apple apple', 'en');
    const d = computeDelta(before, after);
    expect(d.hapaxRate).toBeLessThan(0);
  });

  it('typeTokenRatio delta is negative when output is more repetitive', () => {
    const before = computeMetrics('alpha beta gamma delta epsilon', 'en');
    const after = computeMetrics('alpha alpha alpha alpha alpha', 'en');
    const d = computeDelta(before, after);
    expect(d.typeTokenRatio).toBeLessThan(0);
  });
});
