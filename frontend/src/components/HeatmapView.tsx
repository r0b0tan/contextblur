import { useState, useCallback } from 'react';
import type { TransformResponse, AnnotatedSpan, RiskSpan, SignalType, Strength } from '../types';
import styles from './HeatmapView.module.css';

interface Segment {
  text: string;
  span: AnnotatedSpan | RiskSpan | null;
}

function buildSegments(text: string, spans: (AnnotatedSpan | RiskSpan)[]): Segment[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start < cursor) continue; // skip overlapping (shouldn't happen)
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
  hapax:    'Hapax token',
  rare_word: 'Rare word',
};

interface TooltipState {
  span: AnnotatedSpan | RiskSpan;
  x: number;
  y: number;
}

interface Props {
  mode: 'delta' | 'risk';
  result: TransformResponse | null;
  loading: boolean;
}

export function HeatmapView({ mode, result, loading }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseEnter = useCallback(
    (span: AnnotatedSpan | RiskSpan, e: React.MouseEvent) => {
      setTooltip({ span, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

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

  const text  = mode === 'delta' ? result.transformedText : result.originalText;
  const spans = mode === 'delta'
    ? (result.annotatedSpans  ?? [])
    : (result.riskAnnotations ?? []);
  const segs  = buildSegments(text, spans);

  return (
    <div className={styles.wrapper}>
      <p className={styles.textView}>
        {segs.map((seg, i) => {
          if (!seg.span) {
            return <span key={i}>{seg.text}</span>;
          }

          const isAnnotated = mode === 'delta';
          const bg = isAnnotated
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

interface TooltipProps {
  tooltip: TooltipState;
  mode: 'delta' | 'risk';
  result: TransformResponse;
}

function Tooltip({ tooltip, mode, result }: TooltipProps) {
  const { span, x, y } = tooltip;

  // Position: try to keep within viewport
  const left = Math.min(x + 10, window.innerWidth - 260);
  const top  = Math.min(y + 10, window.innerHeight - 140);

  if (mode === 'delta') {
    const aSpan = span as AnnotatedSpan;

    // Estimate metric effect from aggregate delta
    let effectLine = '';
    const d = result.delta;
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
