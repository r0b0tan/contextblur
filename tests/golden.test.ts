// Golden fixture tests — metrics delta snapshots.
// Snapshots are generated on first run and stored in tests/__snapshots__/.
// Run `vitest run --update-snapshots` to regenerate after intentional changes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runPipeline } from '../src/core/pipeline.js';
import type { TransformRequest } from '../src/core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8').trim();
}

const DE_TEXT1 = fixture('de_text1.txt');
const EN_TEXT1 = fixture('en_text1.txt');
const DE_TEXT2 = fixture('de_text2.txt');

// ── DE_TEXT1 — personal narrative (strength 2) ────────────────────────────
describe('golden — de_text1 strength 2', () => {
  it('metrics delta matches snapshot', async () => {
    const req: TransformRequest = {
      text: DE_TEXT1,
      language: 'de',
      profile: 'neutralize_v1',
      strength: 2,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.delta).toMatchSnapshot();
  });

  it('uniquenessReductionScore matches snapshot', async () => {
    const req: TransformRequest = {
      text: DE_TEXT1,
      language: 'de',
      profile: 'neutralize_v1',
      strength: 2,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.uniquenessReductionScore).toMatchSnapshot();
  });

  it('trace.applied matches snapshot', async () => {
    const req: TransformRequest = {
      text: DE_TEXT1,
      language: 'de',
      profile: 'neutralize_v1',
      strength: 2,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.trace.applied).toMatchSnapshot();
  });
});

// ── EN_TEXT1 — personal narrative (strength 2) ────────────────────────────
describe('golden — en_text1 strength 2', () => {
  it('metrics delta matches snapshot', async () => {
    const req: TransformRequest = {
      text: EN_TEXT1,
      language: 'en',
      profile: 'neutralize_v1',
      strength: 2,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.delta).toMatchSnapshot();
  });

  it('uniquenessReductionScore matches snapshot', async () => {
    const req: TransformRequest = {
      text: EN_TEXT1,
      language: 'en',
      profile: 'neutralize_v1',
      strength: 2,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.uniquenessReductionScore).toMatchSnapshot();
  });
});

// ── DE_TEXT2 — event report with evaluative words (strength 3) ─────────────
describe('golden — de_text2 strength 3', () => {
  it('metrics delta matches snapshot', async () => {
    const req: TransformRequest = {
      text: DE_TEXT2,
      language: 'de',
      profile: 'neutralize_v1',
      strength: 3,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.delta).toMatchSnapshot();
  });

  it('lexical_neutralization replaces base-form intensity words in de_text2', async () => {
    const req: TransformRequest = {
      text: DE_TEXT2,
      language: 'de',
      profile: 'neutralize_v1',
      strength: 3,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    // "phänomenal" and "schockierend" appear in base form → replaced.
    // "beeindruckend" → "beeindruckenden" (inflected accusative) and
    // "außergewöhnlich" → "außergewöhnliche" (inflected) are intentionally
    // NOT replaced: the module is conservative and only matches exact word boundaries.
    expect(r.transformedText).not.toContain('phänomenal');
    expect(r.transformedText).not.toContain('schockierend');
  });

  it('entity_generalization fires in de_text2', async () => {
    const req: TransformRequest = {
      text: DE_TEXT2,
      language: 'de',
      profile: 'neutralize_v1',
      strength: 3,
      llm: { enabled: false },
    };
    const r = await runPipeline(req);
    expect(r.transformedText).toContain('[CITY]');
    expect(r.transformedText).toContain('[ORG]');
  });
});
