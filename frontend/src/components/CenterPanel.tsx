import type { Language, Strength, LLMProvider, TransformResponse } from '../types';
import { HeatmapView } from './HeatmapView';
import { LLMAccordion } from './LLMAccordion';
import styles from './CenterPanel.module.css';

const STRENGTH_DESCRIPTIONS: Record<Strength, string> = {
  0: 'Syntax normalization only',
  1: '+ entity generalization, number bucketing',
  2: '+ context dampening',
  3: '+ conservative lexical neutralization',
};

const SIGNAL_LEGEND = [
  { label: 'Lexical',    color: 'var(--signal-lexical-dot)' },
  { label: 'Structural', color: 'var(--signal-structural-dot)' },
  { label: 'Semantic',   color: 'var(--signal-semantic-dot)' },
  { label: 'Contextual', color: 'var(--signal-contextual-dot)' },
  { label: 'Modified',   color: 'rgba(250, 204, 21, 0.85)' },
];

interface Props {
  text: string;
  strength: Strength;
  heatmapMode: 'delta' | 'risk';
  result: TransformResponse | null;
  loading: boolean;
  error: string | null;
  llmEnabled: boolean;
  llmProvider: LLMProvider;
  models: string[];
  ollamaModel: string;
  ollamaEmbedModel: string;
  oaiBaseUrl: string;
  oaiApiKey: string;
  oaiModel: string;
  oaiEmbedModel: string;
  onStrengthChange: (s: Strength) => void;
  onHeatmapModeChange: (m: 'delta' | 'risk') => void;
  onLLMEnabledChange: (v: boolean) => void;
  onLLMProviderChange: (v: LLMProvider) => void;
  onOllamaModelChange: (v: string) => void;
  onOllamaEmbedChange: (v: string) => void;
  onOaiChange: (field: 'baseUrl' | 'apiKey' | 'model' | 'embedModel', v: string) => void;
  onLoadModels: () => void;
  onRun: () => void;
}

export function CenterPanel({
  text, strength, heatmapMode, result, loading, error,
  llmEnabled, llmProvider, models, ollamaModel, ollamaEmbedModel,
  oaiBaseUrl, oaiApiKey, oaiModel, oaiEmbedModel,
  onStrengthChange, onHeatmapModeChange, onLLMEnabledChange, onLLMProviderChange,
  onOllamaModelChange, onOllamaEmbedChange, onOaiChange, onLoadModels, onRun,
}: Props) {
  const canRun = text.trim().length > 0 && !loading;

  return (
    <div className={styles.panel}>

      {/* ── Control bar ──────────────────────────────────────────────────── */}
      <div className={styles.controlBar}>
        <div className={styles.modeToggle}>
          {(['delta', 'risk'] as const).map((m) => (
            <button
              key={m}
              className={`${styles.modeBtn} ${m === heatmapMode ? styles.modeBtnActive : ''}`}
              onClick={() => onHeatmapModeChange(m)}
              type="button"
            >
              {m === 'delta' ? 'Delta Mode' : 'Risk Mode'}
            </button>
          ))}
        </div>

        <div className={styles.legend}>
          {SIGNAL_LEGEND.map(({ label, color }) => (
            <div key={label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span className={styles.legendLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Heatmap view ──────────────────────────────────────────────────── */}
      <div className={styles.heatmapArea}>
        {error ? (
          <div className={styles.errorMsg}>{error}</div>
        ) : (
          <HeatmapView mode={heatmapMode} result={result} loading={loading} />
        )}
      </div>

      <div className={styles.divider} />

      {/* ── Config bar ───────────────────────────────────────────────────── */}
      <div className={styles.configBar}>

        <div className={styles.configRow}>
          <div className={styles.configGroup}>
            <span className={styles.configLabel}>SIGNAL MANIPULATION STRENGTH</span>
            <div className={styles.strengthSelector}>
              {([0, 1, 2, 3] as Strength[]).map((s) => (
                <button
                  key={s}
                  className={`${styles.strengthBtn} ${s === strength ? styles.strengthBtnActive : ''}`}
                  onClick={() => onStrengthChange(s)}
                  title={STRENGTH_DESCRIPTIONS[s]}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
            <span className={styles.strengthDesc}>{STRENGTH_DESCRIPTIONS[strength]}</span>
          </div>

          <div className={styles.configGroup}>
            <label className={styles.configLabel} htmlFor="llm-toggle">
              LLM LAYER
            </label>
            <div className={styles.llmRow}>
              <input
                id="llm-toggle"
                type="checkbox"
                className={styles.toggle}
                checked={llmEnabled}
                onChange={(e) => onLLMEnabledChange(e.target.checked)}
              />
              <span className={styles.toggleHint}>ollama / openai_compatible</span>
            </div>
          </div>
        </div>

        <div className={styles.runRow}>
          <button
            className={styles.runBtn}
            onClick={onRun}
            disabled={!canRun}
            type="button"
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Transforming…
              </>
            ) : (
              'Run Transformation'
            )}
          </button>

          {result && result.llmStatus !== 'skipped' && (
            <span
              className={`${styles.llmBadge} ${
                result.llmStatus === 'failed_fallback' ? styles.llmBadgeFailed : ''
              }`}
            >
              {result.llmStatus === 'used'            && 'LLM used'}
              {result.llmStatus === 'failed_fallback' && 'LLM failed — check Ollama connection'}
            </span>
          )}
        </div>

        {llmEnabled && (
          <LLMAccordion
            enabled={llmEnabled}
            provider={llmProvider}
            models={models}
            modelsStatus="idle"
            ollamaModel={ollamaModel}
            ollamaEmbedModel={ollamaEmbedModel}
            oaiBaseUrl={oaiBaseUrl}
            oaiApiKey={oaiApiKey}
            oaiModel={oaiModel}
            oaiEmbedModel={oaiEmbedModel}
            onEnabledChange={onLLMEnabledChange}
            onProviderChange={onLLMProviderChange}
            onOllamaModelChange={onOllamaModelChange}
            onOllamaEmbedChange={onOllamaEmbedChange}
            onOaiChange={onOaiChange}
            onLoadModels={onLoadModels}
          />
        )}
      </div>
    </div>
  );
}
