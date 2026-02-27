import type { BatchResult, RunMode, BatchModeStats } from '../features/transform/types';
import type { Metrics } from '../types';
import { RunCard } from './RunCard';
import styles from './BatchResultsView.module.css';

interface Props {
  batch: BatchResult;
}

const METRIC_LABELS: Partial<Record<keyof Metrics, string>> = {
  hapaxRate: 'Hapax Rate',
  rareWordRate: 'Rare Word Rate',
  typeTokenRatio: 'Type-Token Ratio',
  stdevSentenceLengthTokens: 'StDev Sent. Len',
  punctuationRate: 'Punct. Rate',
  basicNgramUniqueness: 'N-gram Uniq.',
};

function StatsPanel({ mode, stats }: { mode: RunMode; stats: BatchModeStats }) {
  const metricKeys = Object.keys(METRIC_LABELS) as (keyof Metrics)[];

  return (
    <div className={styles.statsPanel}>
      <div className={styles.statsHeader}>
        <span className={styles.modeLabel}>{mode}</span>
        <span className={styles.successRate}>
          {stats.valid}/{stats.total} valid
          {' '}({(stats.success_rate * 100).toFixed(0)}%)
        </span>
        {stats.repaired > 0 && (
          <span className={styles.repairedCount}>{stats.repaired} repaired</span>
        )}
      </div>

      {Object.keys(stats.metrics_mean).length > 0 && (
        <table className={styles.statsTable}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Mean</th>
              <th>StdDev</th>
            </tr>
          </thead>
          <tbody>
            {metricKeys.map((key) => {
              const m = stats.metrics_mean[key];
              const s = stats.metrics_stddev[key];
              if (m === undefined) return null;
              return (
                <tr key={key}>
                  <td>{METRIC_LABELS[key]}</td>
                  <td className={styles.monoCell}>{m.toFixed(4)}</td>
                  <td className={styles.monoCell}>{(s ?? 0).toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function BatchResultsView({ batch }: Props) {
  const { response, records } = batch;
  const modes = Object.keys(response.mode_stats) as RunMode[];
  const isBoth = modes.length === 2;

  return (
    <div className={styles.root}>
      {/* Aggregate stats row */}
      <div className={`${styles.statsRow} ${isBoth ? styles.twoCol : ''}`}>
        {modes.map((mode) => {
          const stats = response.mode_stats[mode];
          if (!stats) return null;
          return <StatsPanel key={mode} mode={mode} stats={stats} />;
        })}
      </div>

      {/* Per-run cards */}
      {isBoth ? (
        <div className={styles.sideBySide}>
          {modes.map((mode) => {
            const modeRecords = records.filter((r) => r.mode === mode);
            return (
              <div key={mode} className={styles.modeColumn}>
                <div className={styles.columnHeader}>{mode}</div>
                <div className={styles.cardList}>
                  {modeRecords.map((record, i) => (
                    <RunCard key={record.id} record={record} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.cardList}>
          {records.map((record, i) => (
            <RunCard key={record.id} record={record} index={i} />
          ))}
        </div>
      )}

      <div className={styles.batchMeta}>
        <span>batch: {batch.batch_id.slice(0, 8)}</span>
        <span>prompt_version: {response.prompt_version}</span>
        <span>{new Date(batch.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}
