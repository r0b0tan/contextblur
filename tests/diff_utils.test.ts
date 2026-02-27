import { describe, it, expect } from 'vitest';
import {
  wordTokenize,
  lcsDP,
  backtrackFullOps,
  wordDiffSpans,
  paragraphRanges,
  mergeNearby,
  computeDiffSpans,
} from '../frontend/src/utils/diff.js';
import type { DiffSpan } from '../frontend/src/utils/diff.js';

// ── wordTokenize ────────────────────────────────────────────────────────────

describe('wordTokenize', () => {
  it('splits into word and whitespace tokens', () => {
    expect(wordTokenize('hello world')).toEqual(['hello', ' ', 'world']);
  });

  it('preserves multiple spaces as one token', () => {
    const toks = wordTokenize('a  b');
    expect(toks).toEqual(['a', '  ', 'b']);
  });

  it('returns empty array for empty string', () => {
    expect(wordTokenize('')).toEqual([]);
  });

  it('handles leading/trailing whitespace', () => {
    const toks = wordTokenize(' hello ');
    expect(toks[0]).toBe(' ');
    expect(toks[toks.length - 1]).toBe(' ');
  });
});

// ── backtrackFullOps ────────────────────────────────────────────────────────

describe('backtrackFullOps', () => {
  it('returns only equal ops for identical sequences', () => {
    const toks = ['a', 'b', 'c'];
    const dp = lcsDP(toks, toks);
    const ops = backtrackFullOps(dp, toks, toks);
    expect(ops.every(o => o.op === 'equal')).toBe(true);
    expect(ops.length).toBe(3);
  });

  it('emits delete for removed tokens', () => {
    const a = ['the', ' ', 'cat'];
    const b = ['the', ' ', 'dog'];
    const dp = lcsDP(a, b);
    const ops = backtrackFullOps(dp, a, b);
    const deletes = ops.filter(o => o.op === 'delete');
    const inserts = ops.filter(o => o.op === 'insert');
    expect(deletes.some(o => o.tok === 'cat')).toBe(true);
    expect(inserts.some(o => o.tok === 'dog')).toBe(true);
  });

  it('b-tokens (equal + insert) reconstruct transformed text', () => {
    const a = wordTokenize('the quick brown fox');
    const b = wordTokenize('the slow red fox');
    const dp = lcsDP(a, b);
    const ops = backtrackFullOps(dp, a, b);
    const reconstructed = ops
      .filter(o => o.op !== 'delete')
      .map(o => o.tok)
      .join('');
    expect(reconstructed).toBe('the slow red fox');
  });
});

// ── wordDiffSpans ───────────────────────────────────────────────────────────

describe('wordDiffSpans', () => {
  it('returns empty array for identical texts', () => {
    const spans = wordDiffSpans('hello world', 'hello world', 0);
    expect(spans).toHaveLength(0);
  });

  it('detects a single word replacement', () => {
    const orig  = 'the cat sat';
    const trans = 'the dog sat';
    const spans = wordDiffSpans(orig, trans, 0);
    expect(spans).toHaveLength(1);
    expect(trans.slice(spans[0].start, spans[0].end)).toBe('dog');
    expect(spans[0].originalFragment).toBe('cat');
  });

  it('respects offset parameter for absolute positions', () => {
    // Simulate a second paragraph starting at offset 50
    const spans = wordDiffSpans('old word', 'new word', 50);
    expect(spans[0].start).toBeGreaterThanOrEqual(50);
  });

  it('captures originalFragment for replaced words', () => {
    const orig  = 'sehr außergewöhnlich';
    const trans = 'sehr bemerkenswert';
    const spans = wordDiffSpans(orig, trans, 0);
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].originalFragment).toBe('außergewöhnlich');
  });

  it('span end position is correct within transformed text', () => {
    const orig  = 'the quick brown fox';
    const trans = 'the slow red fox';
    const spans = wordDiffSpans(orig, trans, 0);
    // All span ranges should be valid positions in trans
    for (const s of spans) {
      expect(s.start).toBeGreaterThanOrEqual(0);
      expect(s.end).toBeLessThanOrEqual(trans.length);
      expect(s.start).toBeLessThan(s.end);
    }
  });

  it('returns empty array for very long paragraphs (safety guard)', () => {
    const long = Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
    const spans = wordDiffSpans(long, long + ' extra', 0);
    expect(spans).toHaveLength(0);
  });
});

// ── paragraphRanges ─────────────────────────────────────────────────────────

describe('paragraphRanges', () => {
  it('returns single range for text without paragraph breaks', () => {
    const ranges = paragraphRanges('One sentence only.');
    expect(ranges).toHaveLength(1);
    expect(ranges[0].text).toBe('One sentence only.');
    expect(ranges[0].start).toBe(0);
  });

  it('splits on double newline', () => {
    const text = 'Para one.\n\nPara two.';
    const ranges = paragraphRanges(text);
    expect(ranges).toHaveLength(2);
    expect(ranges[0].text).toBe('Para one.');
    expect(ranges[0].start).toBe(0);
    expect(ranges[1].text).toBe('Para two.');
    expect(ranges[1].start).toBe(11); // 'Para one.\n\n'.length
  });

  it('absolute start offsets are correct for 3 paragraphs', () => {
    const text = 'A\n\nB\n\nC';
    const ranges = paragraphRanges(text);
    expect(ranges).toHaveLength(3);
    for (const r of ranges) {
      expect(text.slice(r.start, r.start + r.text.length)).toBe(r.text);
    }
  });

  it('ignores blank-only paragraphs', () => {
    const ranges = paragraphRanges('A\n\n   \n\nB');
    expect(ranges).toHaveLength(2);
  });
});

// ── mergeNearby ─────────────────────────────────────────────────────────────

describe('mergeNearby', () => {
  it('returns empty for empty input', () => {
    expect(mergeNearby([], 20)).toEqual([]);
  });

  it('does not merge spans further apart than gap', () => {
    const spans: DiffSpan[] = [
      { _kind: 'diff', start: 0,  end: 3,  originalFragment: 'foo' },
      { _kind: 'diff', start: 30, end: 33, originalFragment: 'bar' },
    ];
    const merged = mergeNearby(spans, 20);
    expect(merged).toHaveLength(2);
  });

  it('merges spans within gap', () => {
    const spans: DiffSpan[] = [
      { _kind: 'diff', start: 0,  end: 3,  originalFragment: 'foo' },
      { _kind: 'diff', start: 10, end: 13, originalFragment: 'bar' },
    ];
    const merged = mergeNearby(spans, 20);
    expect(merged).toHaveLength(1);
    expect(merged[0].start).toBe(0);
    expect(merged[0].end).toBe(13);
  });

  it('populates subSpans when merging', () => {
    const spans: DiffSpan[] = [
      { _kind: 'diff', start: 0,  end: 3,  originalFragment: 'foo' },
      { _kind: 'diff', start: 10, end: 13, originalFragment: 'bar' },
    ];
    const merged = mergeNearby(spans, 20);
    expect(merged[0].subSpans).toHaveLength(2);
    expect(merged[0].subSpans![0].originalFragment).toBe('foo');
    expect(merged[0].subSpans![1].originalFragment).toBe('bar');
  });

  it('does not set subSpans for unmerged single span', () => {
    const spans: DiffSpan[] = [
      { _kind: 'diff', start: 0, end: 3, originalFragment: 'x' },
    ];
    const merged = mergeNearby(spans, 20);
    expect(merged[0].subSpans).toBeUndefined();
  });
});

// ── computeDiffSpans ────────────────────────────────────────────────────────

describe('computeDiffSpans', () => {
  it('returns empty for identical texts', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    expect(computeDiffSpans(text, text)).toHaveLength(0);
  });

  it('finds changed words in a single paragraph', () => {
    const orig  = 'The quick brown fox';
    const trans = 'The slow red fox';
    const spans = computeDiffSpans(orig, trans);
    expect(spans.length).toBeGreaterThan(0);
    // All spans should be within transformed text bounds
    for (const s of spans) {
      expect(trans.slice(s.start, s.end).trim().length).toBeGreaterThan(0);
    }
  });

  it('does not cross-contaminate paragraphs (regression)', () => {
    // "kurzen" appears in both paragraphs of orig; after transform it appears
    // only in para 2. A full-text diff would incorrectly match it as equal.
    const orig  = 'Ein kurzen Satz hier.\n\nNoch ein kurzen Satz da.';
    const trans = 'Ein langer Satz hier.\n\nNoch ein kurzen Satz da.';
    const spans = computeDiffSpans(orig, trans);
    // Only paragraph 1 changed — all spans must be in the first paragraph
    const firstParaEnd = trans.indexOf('\n\n');
    for (const s of spans) {
      expect(s.start).toBeLessThan(firstParaEnd);
    }
  });

  it('span text slices reconstruct to non-empty strings', () => {
    const orig  = 'Er ist sehr außergewöhnlich talentiert.';
    const trans = 'Er ist sehr bemerkenswert talentiert.';
    const spans = computeDiffSpans(orig, trans);
    for (const s of spans) {
      expect(trans.slice(s.start, s.end).trim().length).toBeGreaterThan(0);
    }
  });
});
