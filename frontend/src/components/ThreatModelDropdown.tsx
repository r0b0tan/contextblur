import { useState } from 'react';
import styles from './ThreatModelDropdown.module.css';

const THREAT_MODEL = `Adversary Model (excerpt)

Goal: reduce measurable stylometric distinctiveness.
Not: guarantee anonymity. Not: forensic-proof de-identification.

In scope:
  · Stylometric authorship attribution via surface features
  · Corpus-level frequency analysis
  · N-gram pattern matching

Out of scope:
  · Semantic understanding
  · Cross-document entity resolution
  · Any inference beyond surface-level text features

All processing is transient and in-memory.
No input text is persisted or logged.`;

export function ThreatModelDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
      >
        Threat Model {open ? '▲' : '▾'}
      </button>

      {open && (
        <div className={styles.popover}>
          <pre className={styles.content}>{THREAT_MODEL}</pre>
        </div>
      )}
    </div>
  );
}
