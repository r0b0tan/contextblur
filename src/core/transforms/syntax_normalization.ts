import type { Transform, TransformResult } from '../types.js';

// Strength 0: minimal surface cleanup — punctuation, whitespace, sentence spacing.
// No semantic changes. No word replacements.
// Spans: only ellipsis normalization is tracked (the sole lexically-visible change).
// Whitespace/spacing adjustments are sub-token and not useful as heatmap targets.
export const syntaxNormalization: Transform = {
  name: 'syntax_normalization',

  apply(text: string): TransformResult {
    const spans: TransformResult['spans'] = [];

    let result = text
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/([.,;:!?])(?=[a-zA-ZäöüßÄÖÜ])/g, '$1 ')
      .replace(/\n{3,}/g, '\n\n');

    // Ellipsis collapse: the only replacement worth surfacing in the heatmap.
    result = result.replace(/\.{2,}/g, (match) => {
      spans.push({
        originalFragment: match,
        replacedWith: '.',
        transform: 'syntax_normalization',
        strength: 0,
      });
      return '.';
    });

    return { text: result.trim(), spans };
  },
};
