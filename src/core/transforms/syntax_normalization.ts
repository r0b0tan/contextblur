import type { Transform } from '../types.js';

// Strength 0: minimal surface cleanup — punctuation, whitespace, sentence spacing.
// No semantic changes. No word replacements.
export const syntaxNormalization: Transform = {
  name: 'syntax_normalization',

  apply(text: string): string {
    return text
      // Collapse multiple horizontal whitespace to single space
      .replace(/[ \t]+/g, ' ')
      // Remove space before punctuation
      .replace(/\s+([.,;:!?])/g, '$1')
      // Ensure single space after punctuation when followed by a letter
      .replace(/([.,;:!?])(?=[a-zA-ZäöüßÄÖÜ])/g, '$1 ')
      // Collapse 3+ newlines to two
      .replace(/\n{3,}/g, '\n\n')
      // Normalize ellipsis variants to single period
      .replace(/\.{2,}/g, '.')
      .trim();
  },
};
