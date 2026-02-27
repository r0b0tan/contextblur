import type { Language, TransformResponse } from '../types';
import { SAMPLES } from '../constants';
import { unescapeJsonSequences } from '../utils/text';
import styles from './InputPanel.module.css';

interface Props {
  text: string;
  lang: Language;
  result: TransformResponse | null;
  onTextChange: (t: string) => void;
  onLangChange: (l: Language) => void;
}

const METRIC_ROWS: { key: keyof TransformResponse['metricsBefore']; label: string }[] = [
  { key: 'hapaxRate',                  label: 'HAPAX RATE' },
  { key: 'rareWordRate',               label: 'RARE WORD RATE' },
  { key: 'typeTokenRatio',             label: 'TYPE-TOKEN RATIO' },
  { key: 'stdevSentenceLengthTokens',  label: 'SENT LENGTH σ' },
  { key: 'punctuationRate',            label: 'PUNCT RATE' },
  { key: 'basicNgramUniqueness',       label: 'N-GRAM UNIQ.' },
];

function tokenCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}


export function InputPanel({ text, lang, result, onTextChange, onLangChange }: Props) {
  const metrics = result?.metricsBefore ?? null;
  const tokens  = tokenCount(text);

  return (
    <div className={styles.panel}>

      {/* ── Section: Input ───────────────────────────────────────────────── */}
      <div className={`${styles.section} ${styles.sectionInput}`}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>INPUT</span>
          <button
            className={styles.sampleBtn}
            onClick={() => onTextChange(SAMPLES[lang])}
            type="button"
          >
            Load sample ↓
          </button>
        </div>

        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            const clean  = unescapeJsonSequences(pasted);
            if (clean === pasted) return; // nothing to fix — let browser handle normally
            e.preventDefault();
            const el    = e.currentTarget;
            const start = el.selectionStart ?? 0;
            const end   = el.selectionEnd   ?? 0;
            onTextChange(text.slice(0, start) + clean + text.slice(end));
          }}
          placeholder={`Paste target text.\nEN or DE.`}
          rows={12}
        />

        <div className={styles.metaRow}>
          <div className={styles.chip}>
            <span className={styles.chipLabel}>Tokens</span>
            <span className={styles.chipValue}>{tokens > 0 ? tokens : '—'}</span>
          </div>
          <div className={styles.langToggle}>
            {(['de', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                className={`${styles.langBtn} ${l === lang ? styles.langBtnActive : ''}`}
                onClick={() => onLangChange(l)}
                type="button"
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Section: Baseline Feature Snapshot ───────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>BASELINE FEATURES</span>
        </div>

        <div className={styles.metricList}>
          {METRIC_ROWS.map(({ key, label }) => (
            <div key={key} className={styles.metricRow}>
              <span className={styles.metricLabel}>{label}</span>
              <span className={styles.metricValue}>
                {metrics != null
                  ? (metrics[key] as number).toFixed(3)
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
