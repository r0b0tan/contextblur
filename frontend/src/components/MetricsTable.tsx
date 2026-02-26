import type { Metrics } from '../types';
import { METRIC_LABELS } from '../constants';
import styles from './MetricsTable.module.css';

function fmt(n: number | undefined, d = 4): string {
  if (n === null || n === undefined) return '—';
  if (Number.isInteger(n)) return String(n);
  return Number(n).toFixed(d);
}

function fmtDelta(v: number): { txt: string; cls: string } {
  if (!Number.isFinite(v) || Math.abs(v) < 1e-9) return { txt: '±0', cls: styles.dz };
  const sign = v < 0 ? '−' : '+';
  return { txt: `${sign}${Math.abs(v).toFixed(4)}`, cls: v < 0 ? styles.dn : styles.dp };
}

interface Props {
  before: Metrics;
  after: Metrics;
}

export function MetricsTable({ before, after }: Props) {
  return (
    <div className={styles.wrap}>
      <table>
        <thead>
          <tr>
            <th>Metrik</th>
            <th style={{ textAlign: 'right' }}>Vorher</th>
            <th style={{ textAlign: 'right' }}>Nachher</th>
            <th style={{ textAlign: 'right' }}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(METRIC_LABELS).map(([key, lbl]) => {
            const b = before[key as keyof Metrics];
            const a = after[key as keyof Metrics];
            const d = fmtDelta((a ?? 0) - (b ?? 0));
            return (
              <tr key={key}>
                <td className={styles.mn}>{lbl}</td>
                <td className={styles.nr}>{fmt(b)}</td>
                <td className={styles.nr}>{fmt(a)}</td>
                <td className={`${styles.dl} ${d.cls}`}>{d.txt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
