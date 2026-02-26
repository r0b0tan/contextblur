import type { TransformResponse, Strength } from '../types';
import { ScoreCard } from './ScoreCard';
import { BadgeRow } from './BadgeRow';
import { WordDiff } from './WordDiff';
import { MetricsTable } from './MetricsTable';
import { TraceTags } from './TraceTags';
import styles from './ResultsPanel.module.css';

interface Props {
  result: TransformResponse | null;
  error: string | null;
  strength: Strength;
  llmModel?: string;
}

export function ResultsPanel({ result, error, strength, llmModel }: Props) {
  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errBox}>⚠ Fehler: {error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>⟳</div>
          <div>Noch kein Ergebnis</div>
          <div className={styles.emptyHint}>Beispieltext laden und Transformieren drücken</div>
        </div>
      </div>
    );
  }

  const unchanged = result.originalText === result.transformedText;

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <ScoreCard score={result.uniquenessReductionScore} />

        <BadgeRow llmStatus={result.llmStatus} semanticSimilarity={result.semanticSimilarity} llmModel={llmModel} />

        {unchanged && (
          <div className={styles.noChange}>
            ⚠ Kein Unterschied — der Text enthält keine Merkmale, die Stärke {strength} erkennt.
            Versuche Stärke 1 mit einem Text, der Städte, Organisationen oder Zahlen enthält.
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardTitle}>Original</div>
          <div className={styles.originalText}>{result.originalText}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Transformiert</div>
          <WordDiff
            original={result.originalText}
            transformed={result.transformedText}
            unchanged={unchanged}
          />
        </div>

        <div className={`${styles.card} ${styles.cardSpan}`}>
          <div className={styles.cardTitle}>Metriken — Vorher / Nachher / Δ</div>
          <MetricsTable before={result.metricsBefore} after={result.metricsAfter} />
        </div>

        <div className={`${styles.card} ${styles.cardSpan}`}>
          <div className={styles.cardTitle}>Angewandte Transforms</div>
          <TraceTags applied={result.trace.applied} />
        </div>
      </div>
    </div>
  );
}
