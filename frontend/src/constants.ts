import type { Language, Strength } from './types';

export const SAMPLES: Record<Language, string> = {
  de: `Thomas Müller ist seit 2019 Leiter der Produktentwicklung bei der Siemens AG in Berlin. Er verantwortet ein Team von 15 Ingenieuren. Die Ergebnisse des letzten Quartals waren phänomenal — die Umsatzsteigerung von 23 Prozent ist außergewöhnlich.

Ich bin fest überzeugt, dass wir diese Leistung halten können. Ich habe gestern in Hamburg eine Präsentation vor der Anna Weber GmbH gehalten. Ich glaube, wir brauchen deshalb daher eine neue Strategie.`,

  en: `John Smith has been leading the engineering department at Acme Corp in London since 2018. He manages a team of 15 engineers. The results from last quarter were absolutely phenomenal — revenue increased by 23 percent, which is quite extraordinary.

I believe we can sustain this performance. I presented yesterday in New York before the board. I am convinced that our strategy is outstanding and the competition's approach is catastrophic.`,
};

export const STR_DESC: Record<Strength, { label: string; detail: string }> = {
  0: { label: 'Syntax-Normalisierung', detail: 'Normalisiert Leerzeichen und Whitespace. Kaum sichtbare Änderungen.' },
  1: { label: '+ Entitäten & Zahlen', detail: 'Ersetzt Städte → [CITY], Organisationen → [ORG], Personen → [PERSON], Zahlen → viele/einige, Daten → vor einiger Zeit.' },
  2: { label: '+ Kontext-Dämpfung', detail: 'Reduziert wiederholte Ich-Pronomen (>2× in 200 Zeichen) → man/one. Entfernt redundante Diskursmarker (deshalb daher → deshalb).' },
  3: { label: '+ Lexikalische Neutralisierung', detail: 'Ersetzt intensive Wertungen (phänomenal → gut, katastrophal → schlecht, außergewöhnlich → besonders).' },
};

export const METRIC_LABELS: Record<string, string> = {
  sentenceCount:             'Sätze',
  avgSentenceLengthTokens:   'Ø Satzlänge',
  stdevSentenceLengthTokens: 'σ Satzlänge',
  punctuationRate:           'Interpunktionsrate',
  typeTokenRatio:            'TTR',
  hapaxRate:                 'Hapax-Rate',
  stopwordRate:              'Stopwort-Rate',
  rareWordRate:              'Seltenwort-Rate',
  basicNgramUniqueness:      'N-Gramm-Einzigartigkeit',
};
