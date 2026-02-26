import type { Language, Strength, LLMProvider } from '../types';
import { SAMPLES, STR_DESC } from '../constants';
import { SegmentedControl } from './SegmentedControl';
import { LLMAccordion } from './LLMAccordion';
import styles from './InputPanel.module.css';

type ModelsStatus = 'idle' | 'loading' | 'ok' | 'error';

interface Props {
  text: string;
  lang: Language;
  strength: Strength;
  llmEnabled: boolean;
  llmProvider: LLMProvider;
  ollamaModel: string;
  ollamaEmbedModel: string;
  oaiBaseUrl: string;
  oaiApiKey: string;
  oaiModel: string;
  oaiEmbedModel: string;
  models: string[];
  modelsStatus: ModelsStatus;
  submitting: boolean;
  onTextChange: (t: string) => void;
  onLangChange: (l: Language) => void;
  onStrengthChange: (s: Strength) => void;
  onLLMEnabledChange: (v: boolean) => void;
  onLLMProviderChange: (v: LLMProvider) => void;
  onOllamaModelChange: (v: string) => void;
  onOllamaEmbedChange: (v: string) => void;
  onOaiChange: (field: 'baseUrl' | 'apiKey' | 'model' | 'embedModel', v: string) => void;
  onLoadModels: () => void;
  onSubmit: () => void;
}

const LANG_OPTIONS = [
  { value: 'de' as const, label: 'DE', sublabel: 'Deutsch' },
  { value: 'en' as const, label: 'EN', sublabel: 'English' },
];

const STR_OPTIONS = [
  { value: 0 as const, label: '0', sublabel: 'Syntax' },
  { value: 1 as const, label: '1', sublabel: 'Entitäten' },
  { value: 2 as const, label: '2', sublabel: 'Kontext' },
  { value: 3 as const, label: '3', sublabel: 'Lexik' },
];

export function InputPanel({
  text, lang, strength,
  llmEnabled, llmProvider,
  ollamaModel, ollamaEmbedModel,
  oaiBaseUrl, oaiApiKey, oaiModel, oaiEmbedModel,
  models, modelsStatus, submitting,
  onTextChange, onLangChange, onStrengthChange,
  onLLMEnabledChange, onLLMProviderChange,
  onOllamaModelChange, onOllamaEmbedChange,
  onOaiChange, onLoadModels, onSubmit,
}: Props) {
  const desc = STR_DESC[strength];

  return (
    <div className={styles.panel}>
      <div>
        <label>
          Text
          <span style={{ color: 'var(--border)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — </span>
          <span
            style={{ color: 'var(--accent)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, cursor: 'pointer' }}
            onClick={() => onTextChange(SAMPLES[lang])}
          >
            Beispieltext laden ↓
          </span>
        </label>
        <div className={styles.textareaWrap}>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={e => onTextChange(e.target.value)}
            placeholder={"Eigenen Text einfügen oder Beispieltext laden…\n\nStrg+Enter zum Transformieren"}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
          />
        </div>
      </div>

      <div>
        <label>Sprache</label>
        <SegmentedControl options={LANG_OPTIONS} value={lang} onChange={onLangChange} />
      </div>

      <div>
        <label>Stärke</label>
        <SegmentedControl options={STR_OPTIONS} value={strength} onChange={onStrengthChange} />
        <div className={styles.strDesc}>
          <strong>{desc.label}:</strong> {desc.detail}
        </div>
      </div>

      <LLMAccordion
        enabled={llmEnabled}
        provider={llmProvider}
        models={models}
        modelsStatus={modelsStatus}
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

      <div className={styles.submitWrap}>
        <button className={styles.btnPrimary} onClick={onSubmit} disabled={submitting} type="button">
          {submitting && <span className={styles.spinner} />}
          {submitting ? 'Verarbeite…' : 'Transformieren'}
        </button>
        <div className={styles.shortcut}>Strg + Enter</div>
      </div>
    </div>
  );
}
