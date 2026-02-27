import { useState, useCallback } from 'react';
import { postLLMRun } from '../api';
import { saveRuns } from '../storage/runStore';
import { BatchResultsView } from './BatchResultsView';
import { RunHistoryPanel } from './RunHistoryPanel';
import type {
  RunModeOrBoth,
  RunMode,
  EntityPolicy,
  LLMRunRequest,
  BatchResult,
  RunRecord,
  BackendRunRecord,
} from '../features/transform/types';
import { ENTITY_POLICY_LABELS } from '../features/transform/types';
import type { Language } from '../types';
import styles from './LLMModePanel.module.css';

type ActiveTab = 'run' | 'history';

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  text: string;
  lang: Language;
}

export function LLMModePanel({ text, lang }: Props) {
  // Config state
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey]   = useState('');
  const [model, setModel]     = useState('');
  const [maxTokens, setMaxTokens] = useState(2048);
  const [mode, setMode]             = useState<RunModeOrBoth>('both');
  const [entityPolicy, setEntityPolicy] = useState<EntityPolicy>('preserve_all');
  const [batchSize, setBatchSize]   = useState(5);
  const [signalDef, setSignalDef]   = useState('');

  // Results state
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [batchResult, setBatchResult]   = useState<BatchResult | null>(null);
  const [activeTab, setActiveTab]       = useState<ActiveTab>('run');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // Loaded-from-history record
  const [loadedRecord, setLoadedRecord] = useState<RunRecord | null>(null);

  const handleRun = useCallback(async () => {
    if (!text.trim()) {
      setError('Input text is empty.');
      return;
    }
    if (!baseUrl.trim()) {
      setError('Base URL is required.');
      return;
    }
    if (!model.trim()) {
      setError('Model ID is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadedRecord(null);

    try {
      const req: LLMRunRequest = {
        text: text.trim(),
        language: lang,
        signalDefinition: signalDef.trim() || undefined,
        mode,
        entityPolicy,
        batchSize,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        maxTokens,
        apiKey: apiKey.trim() || undefined,
      };

      const response = await postLLMRun(req);
      const batchId = generateBatchId();
      const created_at = new Date().toISOString();

      // Attach batch_id to each record for IndexedDB grouping
      const records: RunRecord[] = response.runs.map(
        (r: BackendRunRecord): RunRecord => ({ ...r, batch_id: batchId }),
      );

      const batch: BatchResult = { batch_id: batchId, request: req, response, records, created_at };
      setBatchResult(batch);

      // Persist to IndexedDB
      await saveRuns(records);
      setHistoryRefresh((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [text, lang, baseUrl, apiKey, model, maxTokens, mode, entityPolicy, batchSize, signalDef]);

  const handleLoadFromHistory = useCallback((record: RunRecord) => {
    setLoadedRecord(record);
    setActiveTab('run');
  }, []);

  return (
    <div className={styles.root}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'run' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('run')}
        >
          LLM Mode Run
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className={styles.historyPane}>
          <RunHistoryPanel
            onLoad={handleLoadFromHistory}
            refreshTrigger={historyRefresh}
          />
        </div>
      ) : (
        <div className={styles.runPane}>
          {/* Config panel */}
          <div className={styles.configGrid}>
            {/* Row 1: Base URL + API key */}
            <div className={styles.configCell}>
              <label className={styles.configLabel}>Base URL</label>
              <input
                className={styles.input}
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            <div className={styles.configCell}>
              <label className={styles.configLabel}>
                API key <span className={styles.dimNote}>(optional)</span>
              </label>
              <input
                type="password"
                className={styles.input}
                placeholder="sk-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {/* Row 2: Model */}
            <div className={styles.configCell}>
              <label className={styles.configLabel}>Model ID</label>
              <input
                className={styles.input}
                placeholder="llama3, mistral, claude-sonnet-4-6, …"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>

            {/* Row 3: Mode */}
            <div className={styles.configCell}>
              <label className={styles.configLabel}>Mode</label>
              <div className={styles.modeToggle}>
                {(['constrained', 'unconstrained', 'both'] as RunModeOrBoth[]).map((m) => (
                  <button
                    key={m}
                    className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Entity Policy */}
            <div className={styles.configFull}>
              <label className={styles.configLabel}>Entity Policy</label>
              <div className={styles.modeToggle}>
                {(Object.keys(ENTITY_POLICY_LABELS) as EntityPolicy[]).map((p) => (
                  <button
                    key={p}
                    className={`${styles.modeBtn} ${entityPolicy === p ? styles.modeBtnActive : ''}`}
                    onClick={() => setEntityPolicy(p)}
                  >
                    {ENTITY_POLICY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 5: Batch size + max tokens */}
            <div className={styles.configCell}>
              <label className={styles.configLabel}>
                Batch size <span className={styles.dimNote}>(1–20 per mode)</span>
              </label>
              <input
                type="number"
                className={styles.inputNarrow}
                min={1}
                max={20}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(20, Number(e.target.value))))}
              />
            </div>

            <div className={styles.configCell}>
              <label className={styles.configLabel}>Max tokens</label>
              <input
                type="number"
                className={styles.inputNarrow}
                min={256}
                max={8192}
                step={256}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>

            {/* Signal definition */}
            <div className={styles.configFull}>
              <label className={styles.configLabel}>
                Signal definition{' '}
                <span className={styles.dimNote}>(leave blank for default)</span>
              </label>
              <input
                className={styles.input}
                placeholder="hapax legomena, unusual sentence-length variance, distinctive vocabulary…"
                value={signalDef}
                onChange={(e) => setSignalDef(e.target.value)}
              />
            </div>
          </div>

          {/* Fixed params notice */}
          <div className={styles.fixedParams}>
            Fixed params: temperature=0, top_p=1 — not configurable.
          </div>

          {/* Run button */}
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={loading || !text.trim()}
          >
            {loading
              ? `Running ${mode === 'both' ? batchSize * 2 : batchSize} requests…`
              : `Run${mode === 'both' ? ` (${batchSize} × 2 modes)` : ` (${batchSize})`}`}
          </button>

          {error && <div className={styles.error}>{error}</div>}

          {/* Loaded from history */}
          {loadedRecord && !batchResult && (
            <div className={styles.loadedSection}>
              <div className={styles.loadedHeader}>Loaded from history</div>
              <div className={styles.cardWrapper}>
                <BatchResultsView
                  batch={{
                    batch_id: loadedRecord.batch_id,
                    request: {
                      text: '',
                      language: lang,
                      mode: loadedRecord.mode,
                      entityPolicy: loadedRecord.entity_policy,
                      batchSize: 1,
                      baseUrl: '',
                      model: loadedRecord.model_id,
                      maxTokens: loadedRecord.params.max_tokens,
                    },
                    response: {
                      runs: [loadedRecord],
                      mode_stats: {},
                      prompt_version: loadedRecord.prompt_version,
                    },
                    records: [loadedRecord],
                    created_at: loadedRecord.created_at,
                  }}
                />
              </div>
            </div>
          )}

          {/* Current batch results */}
          {batchResult && (
            <div className={styles.resultsSection}>
              <BatchResultsView batch={batchResult} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
