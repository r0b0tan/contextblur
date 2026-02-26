import type { Transform, Language } from '../types.js';

// Strength 3: replace only high-intensity or rare evaluative words with neutral equivalents.
// Static list — no model, no external lookup.
// Replaces only when the mapping is unambiguous and meaning is preserved.
// Preserves capitalization of first letter.

const SYNONYMS_DE: Record<string, string> = {
  exzellent: 'gut',
  brillant: 'gut',
  grandios: 'gut',
  phänomenal: 'gut',
  außergewöhnlich: 'besonders',
  beeindruckend: 'gut',
  spektakulär: 'auffällig',
  hervorragend: 'gut',
  fabelhaft: 'gut',
  wunderbar: 'schön',
  fantastisch: 'gut',
  schockierend: 'überraschend',
  erschreckend: 'unangenehm',
  katastrophal: 'schlecht',
  verheerend: 'schlimm',
  schrecklich: 'schlecht',
  furchtbar: 'schlecht',
  miserabel: 'schlecht',
  entsetzlich: 'schlimm',
  grauenhaft: 'schlimm',
  absurd: 'ungewöhnlich',
  bizarr: 'ungewöhnlich',
  merkwürdig: 'ungewöhnlich',
};

const SYNONYMS_EN: Record<string, string> = {
  excellent: 'good',
  brilliant: 'good',
  spectacular: 'notable',
  phenomenal: 'good',
  extraordinary: 'notable',
  impressive: 'good',
  outstanding: 'good',
  fabulous: 'good',
  wonderful: 'nice',
  fantastic: 'good',
  shocking: 'surprising',
  horrifying: 'unpleasant',
  catastrophic: 'bad',
  devastating: 'serious',
  terrible: 'bad',
  dreadful: 'bad',
  miserable: 'bad',
  atrocious: 'bad',
  horrendous: 'bad',
  absurd: 'unusual',
  bizarre: 'unusual',
  peculiar: 'unusual',
  uncanny: 'unusual',
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function preserveCase(original: string, replacement: string): string {
  const isCapitalized =
    original[0] === original[0].toUpperCase() &&
    original[0] !== original[0].toLowerCase();
  return isCapitalized
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

export const lexicalNeutralization: Transform = {
  name: 'lexical_neutralization',

  apply(text: string, language: Language): string {
    const synonyms = language === 'de' ? SYNONYMS_DE : SYNONYMS_EN;
    let result = text;

    for (const [rare, neutral] of Object.entries(synonyms)) {
      result = result.replace(
        new RegExp(`\\b${escapeRegex(rare)}\\b`, 'gi'),
        (match) => preserveCase(match, neutral),
      );
    }

    return result;
  },
};
