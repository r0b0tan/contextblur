import { useRef, useState } from 'react';
import styles from './WordDiff.module.css';

type DiffToken =
  | { kind: 'same' | 'whitespace'; text: string }
  | { kind: 'changed'; text: string; original: string };

function tokenize(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? [];
}

function computeDiff(original: string, transformed: string): DiffToken[] {
  const origTok = tokenize(original);
  const tranTok = tokenize(transformed);
  const result: DiffToken[] = [];
  let oi = 0;
  let ti = 0;

  while (ti < tranTok.length) {
    const tt = tranTok[ti];
    const ot = origTok[oi];

    if (tt === ot) {
      result.push({ kind: 'same', text: tt });
      oi++; ti++;
    } else if (/^\[(?:CITY|ORG|PERSON)\]$/.test(tt)) {
      let consumed = ot ?? '';
      if (origTok[oi + 1] === ' ' && origTok[oi + 2] && /^[A-ZÜÖÄ]/.test(origTok[oi + 2])) {
        consumed = `${ot ?? ''} ${origTok[oi + 2] ?? ''}`;
        oi += 3;
      } else {
        oi++;
      }
      result.push({ kind: 'changed', text: tt, original: consumed });
      ti++;
    } else if (/^\s+$/.test(tt)) {
      result.push({ kind: 'whitespace', text: tt });
      oi++; ti++;
    } else {
      result.push({ kind: 'changed', text: tt, original: ot ?? '' });
      oi++; ti++;
    }
  }
  return result;
}

interface Props {
  original: string;
  transformed: string;
  unchanged: boolean;
}

export function WordDiff({ original, transformed, unchanged }: Props) {
  const [copied, setCopied] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    const text = outRef.current?.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const tokens = unchanged ? [] : computeDiff(original, transformed);

  return (
    <>
      <div className={styles.out} ref={outRef}>
        {unchanged
          ? <span className={styles.muted}>{transformed}</span>
          : tokens.map((tok, i) =>
              tok.kind === 'changed'
                ? <mark key={i} title={`war: ${tok.original}`}>{tok.text}</mark>
                : tok.text
            )
        }
      </div>
      {!unchanged && (
        <div className={styles.legend}>
          <mark>markiert</mark> = geändert (Hover für Original)
        </div>
      )}
      <button className={styles.copyBtn} onClick={handleCopy} type="button">
        {copied ? 'Kopiert ✓' : 'Kopieren'}
      </button>
    </>
  );
}
