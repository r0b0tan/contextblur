import type { CurvePoint, Strength } from '../types';
import styles from './TradeoffCurve.module.css';

interface Props {
  curveData: CurvePoint[] | null;
  currentStrength: Strength;
  computing: boolean;
  onCompute: () => void;
  onStrengthSelect: (s: Strength) => void;
}

const W = 260, H = 108;
const PAD = { top: 8, right: 12, bottom: 22, left: 34 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function xPos(s: number): number {
  return PAD.left + (s / 3) * CW;
}

function yPos(v: number, min: number, max: number): number {
  const range = max - min || 1;
  return PAD.top + CH - ((v - min) / range) * CH;
}

export function TradeoffCurve({ curveData, currentStrength, computing, onCompute, onStrengthSelect }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>STRENGTH–SIGNAL TRADEOFF</span>
        <button
          className={styles.computeBtn}
          onClick={onCompute}
          disabled={computing}
          type="button"
        >
          {computing ? 'Computing…' : 'Compute curve'}
        </button>
      </div>

      {!curveData && !computing && (
        <div className={styles.empty}>
          Requires 4 API calls (strength 0–3). Triggered explicitly.
        </div>
      )}

      {computing && (
        <div className={styles.empty}>Computing…</div>
      )}

      {curveData && !computing && (
        <>
          <CurveSvg
            data={curveData}
            currentStrength={currentStrength}
            onStrengthSelect={onStrengthSelect}
          />
          <p className={styles.note}>
            Signal reduction is not lossless. SUI = Stylometric Uniqueness, SSI = Semantic Specificity.
            Indices are relative within-session proxies.
          </p>
          <FeatureSensitivity data={curveData} />
        </>
      )}
    </div>
  );
}

function CurveSvg({
  data, currentStrength, onStrengthSelect,
}: {
  data: CurvePoint[];
  currentStrength: Strength;
  onStrengthSelect: (s: Strength) => void;
}) {
  const suiVals = data.map((d) => d.sui?.valueAfter ?? 0);
  const ssiVals = data.map((d) => d.ssi?.valueAfter ?? 0);

  const allVals = [...suiVals, ...ssiVals];
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);

  const suiPoints = data.map((d, i) => `${xPos(i)},${yPos(suiVals[i], minV, maxV)}`).join(' ');
  const ssiPoints = data.map((d, i) => `${xPos(i)},${yPos(ssiVals[i], minV, maxV)}`).join(' ');

  return (
    <svg
      width={W}
      height={H}
      className={styles.svg}
      viewBox={`0 0 ${W} ${H}`}
    >
      {/* Current strength band */}
      <rect
        x={xPos(currentStrength) - 12}
        y={PAD.top}
        width={24}
        height={CH}
        fill="rgba(55,65,81,0.07)"
        rx={2}
      />

      {/* Y-axis labels */}
      <text x={PAD.left - 4} y={PAD.top + 4}       textAnchor="end" className={styles.axisLabel}>{maxV.toFixed(0)}</text>
      <text x={PAD.left - 4} y={PAD.top + CH + 4}  textAnchor="end" className={styles.axisLabel}>{minV.toFixed(0)}</text>

      {/* X-axis labels */}
      {[0,1,2,3].map((s) => (
        <text key={s} x={xPos(s)} y={H - 4} textAnchor="middle" className={styles.axisLabel}>{s}</text>
      ))}

      {/* Grid lines */}
      {[0,1,2,3].map((s) => (
        <line key={s} x1={xPos(s)} y1={PAD.top} x2={xPos(s)} y2={PAD.top + CH}
          stroke="var(--border-subtle)" strokeWidth="1" />
      ))}

      {/* SSI line (slate) */}
      <polyline points={ssiPoints} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round" />

      {/* SUI line (dark) */}
      <polyline points={suiPoints} fill="none" stroke="#374151" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots — clickable to select strength */}
      {data.map((d, i) => (
        <g key={i} className={styles.dotGroup} onClick={() => onStrengthSelect(i as Strength)}>
          <circle cx={xPos(i)} cy={yPos(ssiVals[i], minV, maxV)} r={3} fill="#94A3B8" />
          <circle cx={xPos(i)} cy={yPos(suiVals[i], minV, maxV)} r={4} fill="#374151" />
          {/* Hit area */}
          <rect x={xPos(i) - 10} y={PAD.top} width={20} height={CH} fill="transparent" cursor="pointer" />
        </g>
      ))}

      {/* Legend */}
      <circle cx={PAD.left} cy={H - 20} r={3} fill="#374151" />
      <text x={PAD.left + 6} y={H - 16} className={styles.legendLabel}>SUI</text>
      <circle cx={PAD.left + 34} cy={H - 20} r={3} fill="#94A3B8" />
      <text x={PAD.left + 40} y={H - 16} className={styles.legendLabel}>SSI</text>
    </svg>
  );
}

const METRIC_DISPLAY: Record<string, string> = {
  hapaxRate:                 'Hapax Rate',
  rareWordRate:              'Rare Word Rate',
  typeTokenRatio:            'TTR',
  stdevSentenceLengthTokens: 'Sent Length σ',
  basicNgramUniqueness:      'N-gram Uniq.',
  punctuationRate:           'Punct Rate',
};

function FeatureSensitivity({ data }: { data: CurvePoint[] }) {
  const metrics: (keyof CurvePoint['delta'])[] = [
    'hapaxRate', 'rareWordRate', 'typeTokenRatio',
    'stdevSentenceLengthTokens', 'basicNgramUniqueness',
  ];

  const transitions = ([0, 1, 2] as const).map((s) => {
    const from = data[s].delta;
    const to   = data[s + 1].delta;
    let maxMag = -Infinity;
    let dominant = '';
    for (const m of metrics) {
      const mag = Math.abs((from[m] as number) - (to[m] as number));
      if (mag > maxMag) { maxMag = mag; dominant = m; }
    }
    return { from: s, to: s + 1, dominant, magnitude: maxMag };
  });

  return (
    <div className={styles.sensitivity}>
      <div className={styles.sensitivityLabel}>FEATURE SENSITIVITY</div>
      {transitions.map(({ from, to, dominant, magnitude }) => (
        <div key={from} className={styles.sensitivityRow}>
          <span className={styles.sensitivityTransition}>{from}→{to}</span>
          <span className={styles.sensitivityMetric}>{METRIC_DISPLAY[dominant] ?? dominant}</span>
          <span className={styles.sensitivityMag}>Δ{magnitude.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}
