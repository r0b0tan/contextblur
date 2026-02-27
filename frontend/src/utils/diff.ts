// ── Types ──────────────────────────────────────────────────────────────────

export interface SubSpan {
  start: number;
  end: number;
  originalFragment: string;
}

export interface DiffSpan {
  _kind: 'diff';
  start: number;
  end: number;
  originalFragment: string; // first (or only) fragment
  subSpans?: SubSpan[];     // populated when multiple raw spans were merged
}

// ── Tokenization ───────────────────────────────────────────────────────────

export function wordTokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

// ── LCS ────────────────────────────────────────────────────────────────────

export function lcsDP(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

// Backtrack LCS DP, emitting all ops aligned to b (transformed).
// 'delete' entries carry the original token but do NOT consume a b-slot;
// 'equal' and 'insert' entries carry their b-token.
export type DiffOp =
  | { op: 'equal' | 'insert'; tok: string }
  | { op: 'delete'; tok: string };

export function backtrackFullOps(dp: number[][], a: string[], b: string[]): DiffOp[] {
  const ops: DiffOp[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ op: 'equal', tok: b[j - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ op: 'insert', tok: b[j - 1] }); j--;
    } else {
      ops.push({ op: 'delete', tok: a[i - 1] }); i--;
    }
  }
  return ops.reverse();
}

// ── Paragraph splitting ────────────────────────────────────────────────────

// Split text into paragraphs (separated by \n\n+), returning each with its
// start offset in the source string so callers can map spans back to full text.
export function paragraphRanges(text: string): Array<{ text: string; start: number }> {
  const ranges: Array<{ text: string; start: number }> = [];
  const re = /\n{2,}/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const para = text.slice(lastEnd, m.index);
    if (para.trim().length > 0) ranges.push({ text: para, start: lastEnd });
    lastEnd = m.index + m[0].length;
  }
  const last = text.slice(lastEnd);
  if (last.trim().length > 0) ranges.push({ text: last, start: lastEnd });
  return ranges;
}

// ── Word diff ─────────────────────────────────────────────────────────────

// Word diff for a single paragraph, produces raw (un-merged) DiffSpans.
// `offset` is the paragraph's start position in the full transformed text.
export function wordDiffSpans(orig: string, trans: string, offset: number): DiffSpan[] {
  const origToks = wordTokenize(orig);
  const transToks = wordTokenize(trans);
  if (origToks.length > 800 || transToks.length > 800) return [];

  const dp  = lcsDP(origToks, transToks);
  const ops = backtrackFullOps(dp, origToks, transToks);

  const raw: DiffSpan[] = [];
  let cursor       = offset;
  let spanStart    = -1;
  let pendingOrig  = ''; // accumulates deleted tokens preceding/during an insert cluster

  for (const entry of ops) {
    const { op } = entry;

    if (op === 'delete') {
      pendingOrig += entry.tok;
      continue;
    }

    const tok     = entry.tok;
    const isSpace = /^\s+$/.test(tok);

    if (op === 'insert' && !isSpace) {
      if (spanStart === -1) spanStart = cursor;
    } else {
      if (spanStart !== -1) {
        raw.push({ _kind: 'diff', start: spanStart, end: cursor, originalFragment: pendingOrig.trim() });
        spanStart   = -1;
        pendingOrig = '';
      } else {
        pendingOrig = '';
      }
    }
    cursor += tok.length;
  }
  if (spanStart !== -1) {
    raw.push({ _kind: 'diff', start: spanStart, end: cursor, originalFragment: pendingOrig.trim() });
  }

  return raw;
}

// ── Span merging ───────────────────────────────────────────────────────────

export function mergeNearby(spans: DiffSpan[], gap: number): DiffSpan[] {
  if (spans.length === 0) return spans;
  const merged: DiffSpan[] = [{ ...spans[0] }];
  for (let i = 1; i < spans.length; i++) {
    const last = merged[merged.length - 1];
    if (spans[i].start - last.end <= gap) {
      if (!last.subSpans) {
        last.subSpans = [{ start: last.start, end: last.end, originalFragment: last.originalFragment }];
      }
      last.subSpans.push({ start: spans[i].start, end: spans[i].end, originalFragment: spans[i].originalFragment });
      last.end = spans[i].end;
    } else {
      merged.push({ ...spans[i] });
    }
  }
  return merged;
}

// ── Full pipeline ──────────────────────────────────────────────────────────

// Paragraph-scoped diff: runs word diff independently per paragraph so common
// words in different paragraphs are never incorrectly matched as equal.
// Falls back to a single full-text diff for texts without paragraph breaks.
export function computeDiffSpans(original: string, transformed: string): DiffSpan[] {
  const origParas = paragraphRanges(original);
  const tranParas = paragraphRanges(transformed);

  let all: DiffSpan[];

  if (tranParas.length <= 1) {
    all = wordDiffSpans(original, transformed, 0);
  } else {
    all = [];
    for (let i = 0; i < tranParas.length; i++) {
      const tp       = tranParas[i];
      const origText = i < origParas.length ? origParas[i].text : '';
      all.push(...wordDiffSpans(origText, tp.text, tp.start));
    }
  }

  return mergeNearby(all, 20);
}
