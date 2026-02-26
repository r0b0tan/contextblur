import styles from './TraceTags.module.css';

export function TraceTags({ applied }: { applied: string[] }) {
  if (applied.length === 0) {
    return <span style={{ color: 'var(--muted)', fontSize: 12 }}>keine</span>;
  }
  return (
    <div className={styles.tags}>
      {applied.map((name, i) => {
        let cls = styles.tag;
        if (name === 'llm_transform')       cls += ` ${styles.tagLlm}`;
        if (name === 'llm_failed_fallback') cls += ` ${styles.tagFallback}`;
        return <span key={i} className={cls}>{name}</span>;
      })}
    </div>
  );
}
