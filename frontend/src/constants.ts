import type { Language, Strength } from './types';

export const SAMPLES: Record<Language, string> = {
  de: `Thomas Müller ist seit 2019 Leiter der Produktentwicklung bei der Siemens AG in Berlin. Er verantwortet ein Team von 15 Ingenieuren. Die Ergebnisse des letzten Quartals waren phänomenal — die Umsatzsteigerung von 23 Prozent ist außergewöhnlich.

Ich bin fest überzeugt, dass wir diese Leistung halten können. Ich habe gestern in Hamburg eine Präsentation vor der Anna Weber GmbH gehalten. Ich glaube, wir brauchen deshalb daher eine neue Strategie.`,

  en: `John Smith has been leading the engineering department at Acme Corp in London since 2018. He manages a team of 15 engineers. The results from last quarter were absolutely phenomenal — revenue increased by 23 percent, which is quite extraordinary.

I believe we can sustain this performance. I presented yesterday in New York before the board. I am convinced that our strategy is outstanding and the competition's approach is catastrophic.`,
};

export const STR_DESC: Record<Strength, { label: string; detail: string }> = {
  0: { label: 'Syntax normalisation', detail: 'Collapses whitespace and punctuation clusters. Minimal surface changes.' },
  1: { label: '+ Entity & number generalisation', detail: 'Cities → [CITY], organisations → [ORG], names → [PERSON]; integers → some/several/many; dates/years → timeAgo token.' },
  2: { label: '+ Context dampening', detail: 'Reduces repeated first-person pronouns (>2× per 200 chars) → one/man. Collapses redundant discourse pairs (therefore thus → therefore).' },
  3: { label: '+ Lexical neutralisation', detail: 'Replaces high-intensity evaluatives: phenomenal → good, catastrophic → bad, extraordinary → notable.' },
};

export const METRIC_LABELS: Record<string, string> = {
  sentenceCount:             'Sentences',
  avgSentenceLengthTokens:   'Avg sentence length',
  stdevSentenceLengthTokens: 'σ sentence length',
  punctuationRate:           'Punctuation rate',
  typeTokenRatio:            'TTR',
  hapaxRate:                 'Hapax rate',
  stopwordRate:              'Stopword rate',
  rareWordRate:              'Rare word rate',
  basicNgramUniqueness:      'N-gram uniqueness',
};
