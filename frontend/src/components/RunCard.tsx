import type { RunRecord } from '../features/transform/types';
import styles from './RunCard.module.css';

interface Props {
  record: RunRecord;
  index: number;
}

const NOVELTY_COLOR: Record<string, string> = {
  low: 'var(--delta-positive)',
  medium: '#D97706',
  high: 'var(--delta-negative)',
};

export function RunCard({ record, index }: Props) {
  const output = record.parsed_output;

  return (
    <div className={`${styles.card} ${record.valid ? styles.valid : styles.invalid}`}>
      <div className={styles.header}>
        <span className={styles.index}>Run {index + 1}</span>
        <span className={styles.status}>
          {record.valid ? (record.repaired ? 'repaired' : 'valid') : 'failed'}
        </span>
        {record.repaired && <span className={styles.repairedBadge}>repaired</span>}
        <span className={styles.time}>
          {new Date(record.created_at).toLocaleTimeString()}
        </span>
      </div>

      {output ? (
        <>
          <div className={styles.section}>
            <span className={styles.label}>Summary</span>
            <p className={styles.summary}>{output.input_summary}</p>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Transformed text</span>
            <p className={styles.transformedText}>{output.transformed_text}</p>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Self-check</span>
            <div className={styles.selfCheck}>
              <div className={styles.checkRow}>
                <span className={styles.checkLabel}>Meaning preserved</span>
                <span
                  className={styles.checkValue}
                  style={{ color: output.self_check.meaning_preserved ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
                >
                  {output.self_check.meaning_preserved ? 'yes' : 'no'}
                </span>
              </div>
              <div className={styles.checkRow}>
                <span className={styles.checkLabel}>Surface novelty</span>
                <span
                  className={styles.checkValue}
                  style={{ color: NOVELTY_COLOR[output.self_check.surface_novelty_level] }}
                >
                  {output.self_check.surface_novelty_level}
                </span>
              </div>
              {output.self_check.meaning_risk_notes.length > 0 && (
                <div className={styles.noteList}>
                  <span className={styles.checkLabel}>Risks</span>
                  <ul>
                    {output.self_check.meaning_risk_notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              {output.self_check.signal_reduction_actions.length > 0 && (
                <div className={styles.noteList}>
                  <span className={styles.checkLabel}>Actions</span>
                  <ul>
                    {output.self_check.signal_reduction_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {record.metrics_after && (
            <div className={styles.section}>
              <span className={styles.label}>Metrics (after)</span>
              <div className={styles.metricsGrid}>
                <MetricCell label="hapaxRate" value={record.metrics_after.hapaxRate} />
                <MetricCell label="rareWordRate" value={record.metrics_after.rareWordRate} />
                <MetricCell label="TTR" value={record.metrics_after.typeTokenRatio} />
                <MetricCell label="stdevSentLen" value={record.metrics_after.stdevSentenceLengthTokens} />
                <MetricCell label="punctRate" value={record.metrics_after.punctuationRate} />
                <MetricCell label="ngramUniq" value={record.metrics_after.basicNgramUniqueness} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.failedBody}>
          <span className={styles.failedLabel}>Run failed — no valid JSON output</span>
          {record.raw_output && (
            <details className={styles.rawDetails}>
              <summary>Raw output</summary>
              <pre className={styles.rawPre}>{record.raw_output.slice(0, 800)}</pre>
            </details>
          )}
        </div>
      )}

      <div className={styles.meta}>
        <span>model: {record.model_id}</span>
        <span>prompt: {record.prompt_version}</span>
        <span>temp: {record.params.temperature} / top_p: {record.params.top_p}</span>
        <span>id: {record.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metricCell}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value.toFixed(4)}</span>
    </div>
  );
}
