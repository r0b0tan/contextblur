// CLI entry point for the authorship attribution eval.
//
// Usage:
//   npm run eval -- corpus.jsonl [strength=2]      # single eval
//   npm run eval -- corpus.jsonl --curve           # all strength levels 0–3
//
// Input format (JSONL — one JSON object per line):
//   { "authorId": "author_a", "text": "...", "language": "de" }
//
// Output: JSON result to stdout + summary table to stdout.
//
// Minimum corpus: 2 samples from ≥2 authors.
// Recommended: ≥10 texts per author, same language, same domain bucket.
// scoreCorrelation is unreliable for n < 20 samples.

import { readFileSync } from 'fs';
import { runEval, runStrengthCurve } from './eval_runner.js';
import type { AuthoredText } from './types.js';
import type { Strength } from '../core/types.js';

const args = process.argv.slice(2);
const hasCurve = args.includes('--curve');
const positional = args.filter((a) => !a.startsWith('--'));
const [corpusPath, strengthArg] = positional;

if (!corpusPath) {
  process.stderr.write(
    [
      'Usage:',
      '  eval <corpus.jsonl> [strength=2]   single eval at one strength level',
      '  eval <corpus.jsonl> --curve        run all strength levels 0–3',
      '',
      'corpus.jsonl: one JSON object per line: { authorId, text, language }',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

let corpus: AuthoredText[];
try {
  corpus = readFileSync(corpusPath, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as AuthoredText);
} catch (err) {
  process.stderr.write(`Failed to read corpus: ${(err as Error).message}\n`);
  process.exit(1);
}

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}

if (hasCurve) {
  runStrengthCurve(corpus)
    .then((result) => {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n\n');
      process.stdout.write(
        `${result.sampleCount} samples / ${result.authorCount} authors\n`,
      );
      process.stdout.write(
        `Baseline accuracy (before transform): ${result.baselineAccuracy}\n\n`,
      );

      // Table
      process.stdout.write(
        [
          pad('Strength', 10),
          pad('Acc After', 12),
          pad('Δ Attribution', 15),
          pad('r (discrete)', 14),
          'r (continuous)',
        ].join('') + '\n',
      );
      process.stdout.write('─'.repeat(64) + '\n');
      for (const e of result.entries) {
        const arrow = e.attributionDelta < 0 ? '↓' : e.attributionDelta > 0 ? '↑' : '=';
        process.stdout.write(
          [
            pad(e.strength, 10),
            pad(e.accuracyAfter, 12),
            pad(`${arrow}${Math.abs(e.attributionDelta)}`, 15),
            pad(e.scoreCorrelation, 14),
            e.scoreCorrelationContinuous,
          ].join('') + '\n',
        );
      }
    })
    .catch((err: Error) => {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    });
} else {
  const strengthRaw = parseInt(strengthArg ?? '2', 10);
  if (![0, 1, 2, 3].includes(strengthRaw)) {
    process.stderr.write('strength must be 0, 1, 2, or 3\n');
    process.exit(1);
  }
  const strength = strengthRaw as Strength;

  runEval(corpus, { strength })
    .then((result) => {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n\n');

      const arrow =
        result.attributionDelta < 0 ? '↓' : result.attributionDelta > 0 ? '↑' : '=';
      const abs = Math.abs(result.attributionDelta);
      process.stdout.write(
        `${result.sampleCount} samples / ${result.authorCount} authors / strength ${result.strength}\n`,
      );
      process.stdout.write(
        `Attribution accuracy: ${result.accuracyBefore} → ${result.accuracyAfter}  ${arrow}${abs}\n`,
      );
      const reliable = result.scoreCorrelationReliable ? '' : '  ⚠ n<20, unreliable';
      process.stdout.write(`Score correlation (discrete):    ${result.scoreCorrelation}${reliable}\n`);
      process.stdout.write(`Score correlation (continuous):  ${result.scoreCorrelationContinuous}${reliable}\n`);
    })
    .catch((err: Error) => {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    });
}
