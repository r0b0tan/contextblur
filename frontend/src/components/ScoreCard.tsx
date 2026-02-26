import styles from './ScoreCard.module.css';

function scoreColor(s: number) {
  return s >= 60 ? 'var(--green)' : s >= 30 ? 'var(--amber)' : 'var(--red)';
}

function scoreDesc(s: number) {
  return s >= 60 ? 'Gute Signalreduktion' : s >= 30 ? 'Moderate Reduktion' : 'Geringe Reduktion';
}

export function ScoreCard({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className={styles.card}>
      <div className={styles.num} style={{ color }}>{score}</div>
      <div className={styles.right}>
        <div className={styles.lbl}>Uniqueness Reduction Score</div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${score}%`, background: color }} />
        </div>
        <div className={styles.sub}>
          {scoreDesc(score)} &nbsp;·&nbsp; 0 = kein Effekt, 100 = maximale Reduktion
        </div>
      </div>
    </div>
  );
}
