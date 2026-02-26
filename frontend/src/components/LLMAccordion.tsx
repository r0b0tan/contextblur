import type { LLMProvider } from '../types';
import { SegmentedControl } from './SegmentedControl';
import styles from './LLMAccordion.module.css';

type ModelsStatus = 'idle' | 'loading' | 'ok' | 'error';

interface Props {
  enabled: boolean;
  provider: LLMProvider;
  models: string[];
  modelsStatus: ModelsStatus;
  ollamaModel: string;
  ollamaEmbedModel: string;
  oaiBaseUrl: string;
  oaiApiKey: string;
  oaiModel: string;
  oaiEmbedModel: string;
  onEnabledChange: (v: boolean) => void;
  onProviderChange: (v: LLMProvider) => void;
  onOllamaModelChange: (v: string) => void;
  onOllamaEmbedChange: (v: string) => void;
  onOaiChange: (field: 'baseUrl' | 'apiKey' | 'model' | 'embedModel', v: string) => void;
  onLoadModels: () => void;
}

const PROVIDER_OPTIONS = [
  { value: 'ollama' as const,            label: 'Ollama' },
  { value: 'openai_compatible' as const, label: 'OpenAI-kompatibel' },
];

function statusColor(s: ModelsStatus): string {
  if (s === 'ok')    return 'var(--green)';
  if (s === 'error') return 'var(--red)';
  return 'var(--muted)';
}

function statusText(s: ModelsStatus, count: number): string {
  if (s === 'loading') return 'Lade…';
  if (s === 'error')   return '⚠ Ollama nicht erreichbar';
  if (s === 'ok')      return `${count} Modell${count === 1 ? '' : 'e'}`;
  return '';
}

export function LLMAccordion({
  enabled, provider, models, modelsStatus,
  ollamaModel, ollamaEmbedModel,
  oaiBaseUrl, oaiApiKey, oaiModel, oaiEmbedModel,
  onEnabledChange, onProviderChange,
  onOllamaModelChange, onOllamaEmbedChange,
  onOaiChange, onLoadModels,
}: Props) {
  return (
    <details
      className={styles.details}
      onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) onLoadModels(); }}
    >
      <summary className={styles.summary}>
        <span className={styles.caret}>▶</span> LLM-Einstellungen
      </summary>
      <div className={styles.body}>

        <div className={styles.toggleRow}>
          <input
            type="checkbox"
            id="llm-enabled"
            checked={enabled}
            onChange={e => onEnabledChange(e.target.checked)}
          />
          <label htmlFor="llm-enabled">LLM aktivieren</label>
        </div>

        <div>
          <label>Provider</label>
          <SegmentedControl
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={onProviderChange}
          />
        </div>

        {provider === 'ollama' ? (
          <>
            <div>
              <label>
                Modell
                {modelsStatus !== 'idle' && (
                  <span className={styles.statusTxt} style={{ color: statusColor(modelsStatus) }}>
                    {statusText(modelsStatus, models.length)}
                  </span>
                )}
              </label>
              <select value={ollamaModel} onChange={e => onOllamaModelChange(e.target.value)}>
                <option value="">— Modell wählen —</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Embedding-Modell (für semantische Ähnlichkeit)</label>
              <select value={ollamaEmbedModel} onChange={e => onOllamaEmbedChange(e.target.value)}>
                <option value="">— kein Embedding —</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label>Base URL</label>
              <input type="text" value={oaiBaseUrl} onChange={e => onOaiChange('baseUrl', e.target.value)} />
            </div>
            <div>
              <label>API Key (optional)</label>
              <input type="text" value={oaiApiKey} onChange={e => onOaiChange('apiKey', e.target.value)} placeholder="sk-…" autoComplete="off" />
            </div>
            <div>
              <label>Modell</label>
              <input type="text" value={oaiModel} onChange={e => onOaiChange('model', e.target.value)} placeholder="gpt-4o-mini, mistral-7b-instruct, …" />
            </div>
            <div>
              <label>Embedding-Modell (optional)</label>
              <input type="text" value={oaiEmbedModel} onChange={e => onOaiChange('embedModel', e.target.value)} placeholder="text-embedding-3-small, …" />
            </div>
          </>
        )}
      </div>
    </details>
  );
}
