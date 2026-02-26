import type { Transform, Language } from '../types.js';

// Conservative context dampening:
// 1. Reduce repeated 1st-person pronouns: suppress >2 occurrences within a 200-char window.
// 2. Remove adjacent redundant discourse marker pairs (e.g. "deshalb daher").
//
// No semantic inversion. Conservative: prefers false negatives over false positives.

const PRONOUNS_DE = ['ich', 'mich', 'mir', 'mein', 'meine', 'meinen', 'meiner', 'meinem'];
const PRONOUNS_EN = ['me', 'my', 'myself', 'mine'];

const DISCOURSE_PAIRS_DE: [RegExp, string][] = [
  [/\bdeshalb\s+daher\b/gi, 'deshalb'],
  [/\bdaher\s+deshalb\b/gi, 'daher'],
  [/\bdann\s+anschließend\b/gi, 'dann'],
  [/\banschließend\s+dann\b/gi, 'anschließend'],
  [/\balso\s+deshalb\b/gi, 'deshalb'],
  [/\bdeshalb\s+also\b/gi, 'deshalb'],
];

const DISCOURSE_PAIRS_EN: [RegExp, string][] = [
  [/\btherefore\s+thus\b/gi, 'therefore'],
  [/\bthus\s+therefore\b/gi, 'thus'],
  [/\bthen\s+afterwards\b/gi, 'then'],
  [/\bafterwards\s+then\b/gi, 'afterwards'],
  [/\bso\s+therefore\b/gi, 'therefore'],
  [/\btherefore\s+so\b/gi, 'therefore'],
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WINDOW = 200; // chars
const MAX_OCCURRENCES = 2;

function dampPronouns(text: string, pronouns: string[], replacement: string): string {
  let result = text;
  for (const pronoun of pronouns) {
    let lastIdx = -WINDOW - 1;
    let count = 0;
    result = result.replace(
      new RegExp(`\\b${escapeRegex(pronoun)}\\b`, 'g'),
      (match, offset: number) => {
        if (offset - lastIdx > WINDOW) count = 0;
        count++;
        lastIdx = offset;
        return count > MAX_OCCURRENCES ? replacement : match;
      },
    );
  }
  return result;
}

function dampDiscourse(
  text: string,
  pairs: [RegExp, string][],
): string {
  let result = text;
  for (const [pattern, repl] of pairs) result = result.replace(pattern, repl);
  return result;
}

export const contextDampening: Transform = {
  name: 'context_dampening',

  apply(text: string, language: Language): string {
    const pronouns = language === 'de' ? PRONOUNS_DE : PRONOUNS_EN;
    const replacement = language === 'de' ? 'man' : 'one';
    const pairs = language === 'de' ? DISCOURSE_PAIRS_DE : DISCOURSE_PAIRS_EN;

    let result = dampPronouns(text, pronouns, replacement);
    result = dampDiscourse(result, pairs);
    return result;
  },
};
