import type { LLMStatus } from '../types';
import styles from './BadgeRow.module.css';

interface Props {
  llmStatus: LLMStatus;
  semanticSimilarity?: number;
  llmModel?: string;
}

export function BadgeRow({ llmStatus, semanticSimilarity, llmModel }: Props) {
  const llmCls = styles[llmStatus as keyof typeof styles] ?? '';
  const llmLabel = llmStatus === 'used' && llmModel ? llmModel : llmStatus;

  return (
    <div className={styles.row}>
      <span className={`${styles.badge} ${llmCls}`}>LLM: {llmLabel}</span>
      {semanticSimilarity !== undefined && (
        <span className={`${styles.badge} ${semanticSimilarity >= 0.85 ? styles.simOk : styles.simWarn}`}>
          Ähnlichkeit: {semanticSimilarity.toFixed(4)}
          {semanticSimilarity < 0.85 && ' ⚠ <0.85'}
        </span>
      )}
    </div>
  );
}
