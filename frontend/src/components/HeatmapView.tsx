import { useState, useCallback, useMemo } from 'react';
import type { TransformResponse, AnnotatedSpan, RiskSpan, SignalType, Strength } from '../types';
import styles from './HeatmapView.module.css';

// ── Diff span: positions in transformedText not covered by annotatedSpans ──
interface DiffSpan {
  _kind: 'diff';
  start: number;
  end: number;
}

type AnySpan = AnnotatedSpan | RiskSpan | DiffSpan;

// ── Word-level diff computation ────────────────────────────────────────────

function wordTokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

function lcsDP(a: string[], b: string[]): number[][] {
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

// Backtrack LCS DP, emit only ops that consume b (transformed): 'equal' | 'insert'.
// Length of result === b.length.
function backtrackOps(dp: number[][], a: string[], b: string[]): Array<'equal' | 'insert'> {
  const ops: Array<'equal' | 'insert'> = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push('equal'); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push('insert'); j--;
    } else {
      i--; // delete from orig — does not consume b token
    }
  }
  return ops.reverse();
}

// Returns character spans in `transformed` where words differ from `original`,
// with nearby spans merged to form cleaner segments (e.g. entire LLM sentences).
function computeDiffSpans(original: string, transformed: string): DiffSpan[] {
  const origToks = wordTokenize(original);
  const transToks = wordTokenize(transformed);
  if (origToks.length > 1500 || transToks.length > 1500) return [];

  const dp   = lcsDP(origToks, transToks);
  const ops  = backtrackOps(dp, origToks, transToks);

  const raw: DiffSpan[] = [];
  let cursor    = 0;
  let spanStart = -1;

  for (let k = 0; k < ops.length; k++) {
    const op  = ops[k];
    const tok = transToks[k];
    const isSpace = /^\s+$/.test(tok);

    if (op === 'insert' && !isSpace) {
      if (spanStart === -1) spanStart = cursor;
    } else {
      if (spanStart !== -1) {
        raw.push({ _kind: 'diff', start: spanStart, end: cursor });
        spanStart = -1;
      }
    }
    cursor += tok.length;
  }
  if (spanStart !== -1) raw.push({ _kind: 'diff', start: spanStart, end: cursor });

  // Merge spans separated by ≤ 20 chars (whitespace between changed words)
  return mergeNearby(raw, 20);
}

function mergeNearby(spans: DiffSpan[], gap: number): DiffSpan[] {
  if (spans.length === 0) return spans;
  const merged: DiffSpan[] = [{ ...spans[0] }];
  for (let i = 1; i < spans.length; i++) {
    const last = merged[merged.length - 1];
    if (spans[i].start - last.end <= gap) {
      last.end = spans[i].end;
    } else {
      merged.push({ ...spans[i] });
    }
  }
  return merged;
}

// ── Segment building ───────────────────────────────────────────────────────

interface Segment {
  text: string;
  span: AnySpan | null;
}

function buildSegments(text: string, spans: AnySpan[]): Segment[] {
  // Annotated/risk spans take priority over diff spans at same start position.
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const aIsDiff = '_kind' in a;
    const bIsDiff = '_kind' in b;
    if (aIsDiff && !bIsDiff) return 1;
    if (!aIsDiff && bIsDiff) return -1;
    return 0;
  });

  const segments: Segment[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start < cursor) continue;
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start), span: null });
    }
    segments.push({ text: text.slice(span.start, span.end), span });
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), span: null });
  }

  return segments;
}

// ── Styling ────────────────────────────────────────────────────────────────

function signalBackground(signalType: SignalType, strength: Strength): string {
  const alpha = [0.13, 0.20, 0.32, 0.45][strength];
  switch (signalType) {
    case 'lexical':    return `rgba(59,130,246,${alpha})`;
    case 'structural': return `rgba(245,158,11,${alpha})`;
    case 'semantic':   return `rgba(139,92,246,${alpha})`;
    case 'contextual': return `rgba(20,184,166,${alpha})`;
  }
}

function riskBackground(level: 'high' | 'medium'): string {
  return level === 'high' ? 'rgba(239,68,68,0.16)' : 'rgba(251,191,36,0.13)';
}

const SIGNAL_LABELS: Record<SignalType, string> = {
  lexical:    'Lexical normalization',
  structural: 'Structural smoothing',
  semantic:   'Semantic generalization',
  contextual: 'Context dampening',
};

const FEATURE_LABELS: Record<string, string> = {
  hapax:     'Hapax token',
  rare_word: 'Rare word',
};

// ── Types ──────────────────────────────────────────────────────────────────

interface TooltipState {
  span: AnySpan;
  x: number;
  y: number;
}

interface Props {
  mode: 'delta' | 'risk';
  result: TransformResponse | null;
  loading: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export function HeatmapView({ mode, result, loading }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseEnter = useCallback(
    (span: AnySpan, e: React.MouseEvent) => {
      setTooltip({ span, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Diff spans: changed positions in transformedText not covered by annotatedSpans.
  const diffSpans = useMemo<DiffSpan[]>(() => {
    if (!result || mode !== 'delta') return [];
    const annotated = result.annotatedSpans ?? [];
    const all = computeDiffSpans(result.originalText, result.transformedText);
    return all.filter(d => !annotated.some(a => a.start <= d.start && a.end >= d.end));
  }, [result, mode]);

  if (loading) {
    return <div className={styles.state}>Transforming…</div>;
  }

  if (!result) {
    return (
      <div className={styles.state}>
        No transformation applied. Configure strength and run.
      </div>
    );
  }

  const text = mode === 'delta' ? result.transformedText : result.originalText;
  const baseSpans: AnySpan[] = mode === 'delta'
    ? [...(result.annotatedSpans ?? []), ...diffSpans]
    : (result.riskAnnotations ?? []);
  const segs = buildSegments(text, baseSpans);

  return (
    <div className={styles.wrapper}>
      <p className={styles.textView}>
        {segs.map((seg, i) => {
          if (!seg.span) {
            return <span key={i}>{seg.text}</span>;
          }

          // Diff-only span: change not attributed to a specific transform (e.g. LLM)
          if ('_kind' in seg.span) {
            return (
              <mark
                key={i}
                className={styles.markDiff}
                onMouseEnter={(e) => handleMouseEnter(seg.span!, e)}
                onMouseLeave={handleMouseLeave}
              >
                {seg.text}
              </mark>
            );
          }

          const bg = mode === 'delta'
            ? signalBackground(
                (seg.span as AnnotatedSpan).signalType,
                (seg.span as AnnotatedSpan).strength,
              )
            : riskBackground((seg.span as RiskSpan).riskLevel);

          return (
            <mark
              key={i}
              style={{ background: bg, borderRadius: '2px', padding: '0 1px' }}
              onMouseEnter={(e) => handleMouseEnter(seg.span!, e)}
              onMouseLeave={handleMouseLeave}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>

      {tooltip && (
        <Tooltip tooltip={tooltip} mode={mode} result={result} />
      )}
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipProps {
  tooltip: TooltipState;
  mode: 'delta' | 'risk';
  result: TransformResponse;
}

function Tooltip({ tooltip, mode, result }: TooltipProps) {
  const { span, x, y } = tooltip;
  const left = Math.min(x + 10, window.innerWidth - 260);
  const top  = Math.min(y + 10, window.innerHeight - 160);

  // Diff-only span
  if ('_kind' in span) {
    return (
      <div className={styles.tooltip} style={{ left, top }}>
        <div className={styles.tooltipBadge} data-signal="diff">
          Modified
        </div>
        <div className={styles.tooltipMeta}>
          Unannotated change — LLM or unlisted transform
        </div>
      </div>
    );
  }

  if (mode === 'delta') {
    const aSpan = span as AnnotatedSpan;
    const d = result.delta;
    let effectLine = '';
    if (aSpan.transform === 'lexical_neutralization') {
      effectLine = `Rare Word Rate Δ ${d.rareWordRate >= 0 ? '+' : ''}${d.rareWordRate.toFixed(3)}`;
    } else if (aSpan.transform === 'entity_generalization') {
      effectLine = `Hapax Rate Δ ${d.hapaxRate >= 0 ? '+' : ''}${d.hapaxRate.toFixed(3)}`;
    } else if (aSpan.transform === 'numbers_bucketing') {
      effectLine = `TTR Δ ${d.typeTokenRatio >= 0 ? '+' : ''}${d.typeTokenRatio.toFixed(3)}`;
    } else if (aSpan.transform === 'context_dampening') {
      effectLine = `Hapax Rate Δ ${d.hapaxRate >= 0 ? '+' : ''}${d.hapaxRate.toFixed(3)}`;
    }

    return (
      <div className={styles.tooltip} style={{ left, top }}>
        <div className={styles.tooltipBadge} data-signal={aSpan.signalType}>
          {SIGNAL_LABELS[aSpan.signalType]}
        </div>
        <div className={styles.tooltipCause}>
          "{aSpan.originalFragment}" → "{aSpan.replacedWith}"
        </div>
        {effectLine && (
          <div className={styles.tooltipEffect}>{effectLine}</div>
        )}
        <div className={styles.tooltipMeta}>{aSpan.transform} · s={aSpan.strength}</div>
      </div>
    );
  }

  const rSpan = span as RiskSpan;
  const riskLabel = rSpan.riskLevel === 'high' ? 'High stylometric load' : 'Moderate stylometric load';
  return (
    <div className={styles.tooltip} style={{ left, top }}>
      <div className={styles.tooltipBadge} data-risk={rSpan.riskLevel}>
        {riskLabel}
      </div>
      <div className={styles.tooltipCause}>{FEATURE_LABELS[rSpan.feature]}</div>
      <div className={styles.tooltipMeta}>
        Potential target for signal reduction
      </div>
    </div>
  );
}
