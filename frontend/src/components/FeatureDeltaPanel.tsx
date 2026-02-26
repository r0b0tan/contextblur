import type { TransformResponse, CurvePoint, Strength, Metrics } from '../types';
import { TradeoffCurve } from './TradeoffCurve';
import styles from './FeatureDeltaPanel.module.css';

interface Props {
  result: TransformResponse | null;
  curveData: CurvePoint[] | null;
  computingCurve: boolean;
  currentStrength: Strength;
  onComputeCurve: () => void;
  onStrengthSelect: (s: Strength) => void;
}

const DELTA_ROWS: { key: keyof Metrics; label: string }[] = [
  { key: 'hapaxRate',                 label: 'HAPAX RATE' },
  { key: 'rareWordRate',              label: 'RARE WORD RATE' },
  { key: 'typeTokenRatio',            label: 'TYPE-TOKEN RATIO' },
  { key: 'stdevSentenceLengthTokens', label: 'SENT LENGTH σ' },
  { key: 'basicNgramUniqueness',      label: 'N-GRAM UNIQ.' },
  { key: 'punctuationRate',           label: 'PUNCT RATE' },
];

function deltaColor(d: number): string {
  if (Math.abs(d) < 0.0005) return 'var(--delta-neutral)';
  return d < 0 ? 'var(--delta-positive)' : 'var(--delta-negative)';
}

function fmtDelta(d: number): string {
  const s = d >= 0 ? '+' : '';
  return `${s}${d.toFixed(3)}`;
}

function rankFeatures(delta: Metrics): { key: keyof Metrics; delta: number }[] {
  return DELTA_ROWS
    .map(({ key }) => ({ key, delta: delta[key] as number }))
    .filter((f) => Math.abs(f.delta) > 0.0005)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);
}

const METRIC_DISPLAY: Record<string, string> = {
  hapaxRate:                 'Hapax Rate',
  rareWordRate:              'Rare Word Rate',
  typeTokenRatio:            'TTR',
  stdevSentenceLengthTokens: 'Sent Length σ',
  basicNgramUniqueness:      'N-gram Uniqueness',
  punctuationRate:           'Punct Rate',
};

export function FeatureDeltaPanel({
  result, curveData, computingCurve, currentStrength,
  onComputeCurve, onStrengthSelect,
}: Props) {
  return (
    <div className={styles.panel}>

      {/* ── Composite indices ────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>FEATURE DELTA</div>

        {result ? (
          <>
            {result.sui && <IndexRow label="Stylometric Uniqueness Index" index={result.sui} />}
            {result.ssi && <IndexRow label="Semantic Specificity Index"   index={result.ssi} />}
            {result.semanticSimilarity != null && (
              <div className={styles.simRow}>
                <span className={styles.simLabel}>SEMANTIC SIMILARITY</span>
                <span className={styles.simValue} style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {result.semanticSimilarity.toFixed(4)}
                </span>
                <span className={styles.simNote}>cosine · embedding-backed</span>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>Run transformation to populate.</div>
        )}
      </div>

      <div className={styles.divider} />

      {/* ── Component deltas ─────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>COMPONENT DELTAS</div>

        {result ? (
          <div className={styles.deltaList}>
            {DELTA_ROWS.map(({ key, label }) => {
              const d = result.delta[key] as number;
              return (
                <div key={key} className={styles.deltaRow}>
                  <span className={styles.deltaLabel}>{label}</span>
                  <span className={styles.deltaValue} style={{ color: deltaColor(d) }}>
                    {fmtDelta(d)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>—</div>
        )}
      </div>

      <div className={styles.divider} />

      {/* ── Signal contribution ranking ───────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>SIGNAL CONTRIBUTION RANKING</div>

        {result ? (
          <div className={styles.rankList}>
            {rankFeatures(result.delta).map(({ key, delta: d }) => (
              <div key={key} className={styles.rankRow}>
                <div className={styles.rankBar}>
                  <div
                    className={styles.rankFill}
                    style={{
                      width: `${Math.min(Math.abs(d) * 300, 100)}%`,
                      background: d < 0 ? 'var(--delta-positive)' : 'var(--delta-negative)',
                    }}
                  />
                </div>
                <span className={styles.rankMetric}>{METRIC_DISPLAY[key] ?? key}</span>
                <span className={styles.rankDelta} style={{ color: deltaColor(d) }}>
                  {fmtDelta(d)}
                </span>
              </div>
            ))}
            {rankFeatures(result.delta).length === 0 && (
              <div className={styles.empty}>No significant feature changes.</div>
            )}
          </div>
        ) : (
          <div className={styles.empty}>—</div>
        )}
      </div>

      <div className={styles.divider} />

      {/* ── Tradeoff curve ────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <TradeoffCurve
          curveData={curveData}
          currentStrength={currentStrength}
          computing={computingCurve}
          onCompute={onComputeCurve}
          onStrengthSelect={onStrengthSelect}
        />
      </div>

    </div>
  );
}

interface IndexRowProps {
  label: string;
  index: TransformResponse['sui'];
}

function IndexRow({ label, index }: IndexRowProps) {
  const deltaColor_ = deltaColor(index.delta);
  return (
    <div className={styles.indexRow}>
      <div className={styles.indexLabel}>{label}</div>
      <div className={styles.indexBody}>
        <div className={styles.indexValues}>
          <span className={styles.indexBefore}>{index.valueBefore.toFixed(1)}</span>
          <span className={styles.indexArrow}>→</span>
          <span className={styles.indexAfter}>{index.valueAfter.toFixed(1)}</span>
        </div>
        <span className={styles.indexDelta} style={{ color: deltaColor_ }}>
          {index.delta >= 0 ? '+' : ''}{index.delta.toFixed(1)} pts
        </span>
      </div>
      <div className={styles.indexVersion}>{index.formulaVersion}</div>
    </div>
  );
}
