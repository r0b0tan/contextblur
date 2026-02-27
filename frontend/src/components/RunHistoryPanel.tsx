import { useState, useEffect, useCallback } from 'react';
import { getAllRuns, deleteRun, clearAllRuns } from '../storage/runStore';
import type { RunRecord } from '../features/transform/types';
import { RunCard } from './RunCard';
import styles from './RunHistoryPanel.module.css';

interface Props {
  onLoad: (record: RunRecord) => void;
  refreshTrigger: number;
}

export function RunHistoryPanel({ onLoad, refreshTrigger }: Props) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllRuns();
      setRuns(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns, refreshTrigger]);

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await deleteRun(id);
      setRuns((prev) => prev.filter((r) => r.id !== id));
    },
    [],
  );

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Delete all run history?')) return;
    await clearAllRuns();
    setRuns([]);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading history…</div>;
  }

  if (runs.length === 0) {
    return (
      <div className={styles.empty}>
        No saved runs yet. Run a batch to populate history.
      </div>
    );
  }

  // Group by batch_id for display
  const byBatch = new Map<string, RunRecord[]>();
  for (const run of runs) {
    const group = byBatch.get(run.batch_id) ?? [];
    group.push(run);
    byBatch.set(run.batch_id, group);
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.count}>{runs.length} saved runs</span>
        <button className={styles.clearBtn} onClick={handleClearAll}>
          Clear all
        </button>
      </div>

      <div className={styles.list}>
        {[...byBatch.entries()].map(([batchId, batchRuns]) => {
          const first = batchRuns[0];
          const mode = [...new Set(batchRuns.map((r) => r.mode))].join(' + ');
          const valid = batchRuns.filter((r) => r.valid).length;
          const isOpen = expanded === batchId;

          return (
            <div key={batchId} className={styles.batchGroup}>
              <button
                className={styles.batchHeader}
                onClick={() => toggleExpand(batchId)}
              >
                <span className={styles.batchMode}>{mode}</span>
                <span className={styles.batchStats}>
                  {valid}/{batchRuns.length} valid
                </span>
                <span className={styles.batchTime}>
                  {new Date(first.created_at).toLocaleString()}
                </span>
                <span className={styles.batchModel}>{first.model_id}</span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className={styles.batchBody}>
                  {batchRuns.map((record, i) => (
                    <div key={record.id} className={styles.runRow}>
                      <div className={styles.runActions}>
                        <button
                          className={styles.loadBtn}
                          onClick={() => onLoad(record)}
                        >
                          Load
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={(e) => handleDelete(record.id, e)}
                        >
                          ×
                        </button>
                      </div>
                      <RunCard record={record} index={i} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
