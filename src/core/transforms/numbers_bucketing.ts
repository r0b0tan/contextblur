import type { Transform, Language } from '../types.js';

// Map cardinal numbers and temporal expressions to coarse buckets.
// Goal: remove precise counts that are rare/identifying signals.
// Jahreszahlen and date strings -> "vor einiger Zeit" / "some time ago".

const LABELS = {
  de: { some: 'einige', several: 'mehrere', many: 'viele', timeAgo: 'vor einiger Zeit' },
  en: { some: 'some', several: 'several', many: 'many', timeAgo: 'some time ago' },
} as const;

// ISO dates: YYYY-MM-DD
const DATE_ISO = /\b\d{4}-\d{2}-\d{2}\b/g;
// European dates: DD.MM.YYYY, DD/MM/YYYY, DD.MM.YY
const DATE_EU = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g;
// 4-digit years in range 1000–2099 (standalone, not already replaced)
const YEAR = /\b(?:1[0-9]{3}|20[0-9]{2})\b/g;
// Remaining standalone integers
const INTEGER = /\b(\d+)\b/g;

function bucket(n: number, labels: (typeof LABELS)['de' | 'en']): string {
  if (n <= 2) return labels.some;
  if (n <= 9) return labels.several;
  return labels.many;
}

export const numbersBucketing: Transform = {
  name: 'numbers_bucketing',

  apply(text: string, language: Language): string {
    const labels = LABELS[language];
    return text
      .replace(DATE_ISO, labels.timeAgo)
      .replace(DATE_EU, labels.timeAgo)
      .replace(YEAR, labels.timeAgo)
      .replace(INTEGER, (_, digits) => bucket(parseInt(digits, 10), labels));
  },
};
