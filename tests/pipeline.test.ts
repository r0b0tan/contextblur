import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/core/pipeline.js';
import type { LLMClient as OllamaClient, TransformRequest } from '../src/core/types.js';

const DE_REQUEST: TransformRequest = {
  text: 'Ich heiße Thomas Müller und ich wohne in Berlin. Ich arbeite bei TechCorp GmbH seit 2018. Ich verdiene gut.',
  language: 'de',
  profile: 'neutralize_v1',
  strength: 1,
  llm: { enabled: false },
};

const EN_REQUEST: TransformRequest = {
  text: 'My name is John Smith and I live in London. I work at Acme Corp. I earn a competitive salary.',
  language: 'en',
  profile: 'neutralize_v1',
  strength: 1,
  llm: { enabled: false },
};

// ── Response shape ─────────────────────────────────────────────────────────
describe('runPipeline — response shape', () => {
  it('returns all required fields', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r).toHaveProperty('originalText');
    expect(r).toHaveProperty('transformedText');
    expect(r).toHaveProperty('metricsBefore');
    expect(r).toHaveProperty('metricsAfter');
    expect(r).toHaveProperty('delta');
    expect(r).toHaveProperty('uniquenessReductionScore');
    expect(r).toHaveProperty('sui');
    expect(r).toHaveProperty('ssi');
    expect(r).toHaveProperty('annotatedSpans');
    expect(r).toHaveProperty('riskAnnotations');
    expect(r).toHaveProperty('trace');
    expect(r.trace).toHaveProperty('applied');
    expect(Array.isArray(r.trace.applied)).toBe(true);
    expect(r).toHaveProperty('llmStatus');
  });

  it('llmStatus is "skipped" when llm.enabled is false', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.llmStatus).toBe('skipped');
  });

  it('originalText is unchanged', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.originalText).toBe(DE_REQUEST.text);
  });

  it('uniquenessReductionScore is in [0, 100]', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.uniquenessReductionScore).toBeGreaterThanOrEqual(0);
    expect(r.uniquenessReductionScore).toBeLessThanOrEqual(100);
  });
});

// ── Strength levels ────────────────────────────────────────────────────────
describe('runPipeline — strength selection', () => {
  it('strength 0: only syntax_normalization applied', async () => {
    const r = await runPipeline({ ...DE_REQUEST, strength: 0 });
    expect(r.trace.applied).toEqual(['syntax_normalization']);
  });

  it('strength 1: syntax + entity + numbers applied', async () => {
    const r = await runPipeline({ ...DE_REQUEST, strength: 1 });
    expect(r.trace.applied).toContain('syntax_normalization');
    expect(r.trace.applied).toContain('entity_generalization');
    expect(r.trace.applied).toContain('numbers_bucketing');
    expect(r.trace.applied).not.toContain('context_dampening');
  });

  it('strength 2: adds context_dampening', async () => {
    const r = await runPipeline({ ...DE_REQUEST, strength: 2 });
    expect(r.trace.applied).toContain('context_dampening');
    expect(r.trace.applied).not.toContain('lexical_neutralization');
  });

  it('strength 3: adds lexical_neutralization', async () => {
    const r = await runPipeline({ ...DE_REQUEST, strength: 3 });
    expect(r.trace.applied).toContain('lexical_neutralization');
  });

  it('higher strength trace is a superset of lower strength trace', async () => {
    const r1 = await runPipeline({ ...DE_REQUEST, strength: 1 });
    const r3 = await runPipeline({ ...DE_REQUEST, strength: 3 });
    for (const step of r1.trace.applied) {
      expect(r3.trace.applied).toContain(step);
    }
  });
});

// ── Deterministic transforms ───────────────────────────────────────────────
describe('runPipeline — entity_generalization', () => {
  it('replaces known city in DE text', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.transformedText).toContain('[CITY]');
    expect(r.transformedText).not.toContain('Berlin');
  });

  it('replaces org with GmbH suffix', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.transformedText).toContain('[ORG]');
    expect(r.transformedText).not.toContain('TechCorp GmbH');
  });

  it('replaces full person name', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.transformedText).toContain('[PERSON]');
    expect(r.transformedText).not.toContain('Thomas Müller');
  });

  it('replaces city in EN text', async () => {
    const r = await runPipeline(EN_REQUEST);
    expect(r.transformedText).toContain('[CITY]');
  });
});

describe('runPipeline — numbers_bucketing', () => {
  it('buckets a year into timeAgo token (DE)', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.transformedText).toContain('vor einiger Zeit');
  });

  it('buckets small numbers', async () => {
    const r = await runPipeline({
      ...DE_REQUEST,
      text: 'Ich habe 2 Kinder und 8 Kollegen.',
      strength: 1,
    });
    expect(r.transformedText).toContain('einige');
    expect(r.transformedText).toContain('mehrere');
  });

  it('buckets large numbers to "viele"', async () => {
    const r = await runPipeline({
      ...DE_REQUEST,
      text: 'Das Event hatte 127 Besucher.',
      strength: 1,
    });
    expect(r.transformedText).toContain('viele');
  });
});

describe('runPipeline — syntax_normalization', () => {
  it('collapses multiple spaces', async () => {
    const r = await runPipeline({
      ...DE_REQUEST,
      text: 'Hallo   Welt.  Wie geht es?',
      strength: 0,
    });
    expect(r.transformedText).not.toMatch(/\s{2,}/);
  });
});

describe('runPipeline — lexical_neutralization (strength 3)', () => {
  it('replaces "phänomenal" with "gut" in DE', async () => {
    const r = await runPipeline({
      ...DE_REQUEST,
      text: 'Das Ergebnis war phänomenal.',
      strength: 3,
    });
    expect(r.transformedText).not.toContain('phänomenal');
    expect(r.transformedText).toContain('gut');
  });

  it('replaces "catastrophic" with "bad" in EN', async () => {
    const r = await runPipeline({
      ...EN_REQUEST,
      text: 'The outcome was catastrophic.',
      strength: 3,
    });
    expect(r.transformedText).not.toContain('catastrophic');
    expect(r.transformedText).toContain('bad');
  });
});

// ── Error handling ─────────────────────────────────────────────────────────
describe('runPipeline — validation', () => {
  it('throws on empty text', async () => {
    await expect(runPipeline({ ...DE_REQUEST, text: '' })).rejects.toThrow();
  });

  it('throws on whitespace-only text', async () => {
    await expect(runPipeline({ ...DE_REQUEST, text: '   ' })).rejects.toThrow();
  });
});

// ── LLM integration ────────────────────────────────────────────────────────
describe('runPipeline — LLM success path', () => {
  it('uses LLM output when JSON is well-formed', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(
        JSON.stringify({ transformedText: 'Eine Person arbeitete an einem Ort.' }),
      ),
      embed: vi.fn(),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true, model: 'llama3.2' } },
      mockClient,
    );

    expect(r.trace.applied).toContain('llm_transform');
    expect(r.trace.applied).not.toContain('llm_failed_fallback');
    expect(r.transformedText).toBe('Eine Person arbeitete an einem Ort.');
    expect(r.llmStatus).toBe('used');
  });

  it('passes the deterministic output as LLM input (not original text)', async () => {
    let capturedPrompt = '';
    const mockClient: OllamaClient = {
      generate: vi.fn().mockImplementation(async (prompt: string) => {
        capturedPrompt = prompt;
        return JSON.stringify({ transformedText: 'ok' });
      }),
      embed: vi.fn(),
    };

    await runPipeline(
      { ...DE_REQUEST, strength: 1, llm: { enabled: true } },
      mockClient,
    );

    // After strength-1 transforms, Berlin and TechCorp GmbH are already replaced
    expect(capturedPrompt).not.toContain('Berlin');
    expect(capturedPrompt).not.toContain('TechCorp GmbH');
  });
});

describe('runPipeline — LLM fallback paths', () => {
  it('falls back on malformed JSON', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue('this is not json at all'),
      embed: vi.fn(),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true } },
      mockClient,
    );

    expect(r.trace.applied).toContain('llm_failed_fallback');
    expect(r.trace.applied).not.toContain('llm_transform');
    expect(r.transformedText).toBeTruthy();
    expect(r.llmStatus).toBe('failed_fallback');
  });

  it('falls back when JSON lacks transformedText field', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({ text: 'oops' })),
      embed: vi.fn(),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true } },
      mockClient,
    );

    expect(r.trace.applied).toContain('llm_failed_fallback');
  });

  it('falls back when transformedText is not a string', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({ transformedText: 42 })),
      embed: vi.fn(),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true } },
      mockClient,
    );

    expect(r.trace.applied).toContain('llm_failed_fallback');
  });

  it('falls back when LLM throws a network error', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockRejectedValue(new Error('Connection refused')),
      embed: vi.fn(),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true } },
      mockClient,
    );

    expect(r.trace.applied).toContain('llm_failed_fallback');
  });

  it('does not call LLM when llm.enabled is false', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn(),
      embed: vi.fn(),
    };

    await runPipeline({ ...DE_REQUEST, llm: { enabled: false } }, mockClient);
    expect(mockClient.generate).not.toHaveBeenCalled();
  });
});

// ── parseLLMOutput — direct extraction fallback ────────────────────────────
// Tests the directExtractTransformedText path triggered when JSON.parse fails.
describe('runPipeline — LLM JSON repair fallback', () => {
  it('recovers from unescaped double quotes inside transformedText', async () => {
    // Simulates a model that outputs literal " instead of \" inside the JSON value.
    // JSON.parse fails; directExtractTransformedText should succeed.
    const badJson = '{"transformedText": "Er sagte "Hallo" zu ihr."}';
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(badJson),
      embed: vi.fn(),
    };
    const r = await runPipeline({ ...DE_REQUEST, llm: { enabled: true } }, mockClient);
    expect(r.llmStatus).toBe('used');
    expect(r.transformedText).toBe('Er sagte "Hallo" zu ihr.');
  });

  it('recovers from multiple unescaped quotes in value', async () => {
    const badJson = '{"transformedText": "Eine "sehr" gute "Idee"."}';
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(badJson),
      embed: vi.fn(),
    };
    const r = await runPipeline({ ...DE_REQUEST, llm: { enabled: true } }, mockClient);
    expect(r.llmStatus).toBe('used');
    expect(r.transformedText).toBe('Eine "sehr" gute "Idee".');
  });

  it('still succeeds on well-formed JSON (no fallback needed)', async () => {
    const goodJson = '{"transformedText": "Er sagte \\"Hallo\\" zu ihr."}';
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(goodJson),
      embed: vi.fn(),
    };
    const r = await runPipeline({ ...DE_REQUEST, llm: { enabled: true } }, mockClient);
    expect(r.llmStatus).toBe('used');
    expect(r.transformedText).toBe('Er sagte "Hallo" zu ihr.');
  });

  it('falls back to deterministic when no JSON object found at all', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue('Kein JSON hier.'),
      embed: vi.fn(),
    };
    const r = await runPipeline({ ...DE_REQUEST, llm: { enabled: true } }, mockClient);
    expect(r.llmStatus).toBe('failed_fallback');
  });

  it('recovers from JSON wrapped in markdown code fence', async () => {
    const fenced = '```json\n{"transformedText": "Eine Person arbeitete."}\n```';
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(fenced),
      embed: vi.fn(),
    };
    const r = await runPipeline({ ...DE_REQUEST, llm: { enabled: true } }, mockClient);
    expect(r.llmStatus).toBe('used');
    expect(r.transformedText).toBe('Eine Person arbeitete.');
  });

  it('handles transformedText containing } character', async () => {
    const json = '{"transformedText": "Ergebnis: {ok}"}';
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(json),
      embed: vi.fn(),
    };
    const r = await runPipeline({ ...DE_REQUEST, llm: { enabled: true } }, mockClient);
    expect(r.llmStatus).toBe('used');
    expect(r.transformedText).toBe('Ergebnis: {ok}');
  });
});

// ── SUI / SSI indices ──────────────────────────────────────────────────────
describe('runPipeline — sui and ssi', () => {
  it('sui has formulaVersion, weights, valueBefore, valueAfter, delta', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.sui.formulaVersion).toBe('sui-v1.0');
    expect(typeof r.sui.valueBefore).toBe('number');
    expect(typeof r.sui.valueAfter).toBe('number');
    expect(typeof r.sui.delta).toBe('number');
    expect(Object.keys(r.sui.weights).length).toBeGreaterThan(0);
  });

  it('ssi has formulaVersion, weights, valueBefore, valueAfter, delta', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.ssi.formulaVersion).toBe('ssi-v1.0');
    expect(typeof r.ssi.valueBefore).toBe('number');
    expect(typeof r.ssi.valueAfter).toBe('number');
    expect(typeof r.ssi.delta).toBe('number');
  });

  it('sui.valueBefore and valueAfter are in [0, 100]', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.sui.valueBefore).toBeGreaterThanOrEqual(0);
    expect(r.sui.valueBefore).toBeLessThanOrEqual(100);
    expect(r.sui.valueAfter).toBeGreaterThanOrEqual(0);
    expect(r.sui.valueAfter).toBeLessThanOrEqual(100);
  });

  it('sui.delta equals valueBefore minus valueAfter', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(r.sui.delta).toBeCloseTo(r.sui.valueBefore - r.sui.valueAfter, 3);
  });

  it('strength 3 produces greater or equal sui reduction than strength 0', async () => {
    const r0 = await runPipeline({ ...DE_REQUEST, strength: 0 });
    const r3 = await runPipeline({ ...DE_REQUEST, strength: 3 });
    expect(r3.sui.delta).toBeGreaterThanOrEqual(r0.sui.delta);
  });
});

// ── annotatedSpans ─────────────────────────────────────────────────────────
describe('runPipeline — annotatedSpans', () => {
  it('strength 0 produces no annotated spans for plain text', async () => {
    const r = await runPipeline({ ...DE_REQUEST, text: 'Hallo Welt.', strength: 0 });
    expect(r.annotatedSpans).toEqual([]);
  });

  it('strength 1 with known city produces at least one semantic span', async () => {
    const r = await runPipeline(DE_REQUEST);
    const semanticSpans = r.annotatedSpans.filter((s) => s.signalType === 'semantic');
    expect(semanticSpans.length).toBeGreaterThan(0);
  });

  it('each span has required fields', async () => {
    const r = await runPipeline(DE_REQUEST);
    for (const span of r.annotatedSpans) {
      expect(typeof span.start).toBe('number');
      expect(typeof span.end).toBe('number');
      expect(span.end).toBeGreaterThan(span.start);
      expect(typeof span.originalFragment).toBe('string');
      expect(typeof span.replacedWith).toBe('string');
      expect(typeof span.transform).toBe('string');
      expect(['lexical', 'structural', 'semantic', 'contextual']).toContain(span.signalType);
    }
  });

  it('span offsets reference correct text in transformedText', async () => {
    const r = await runPipeline(DE_REQUEST);
    for (const span of r.annotatedSpans) {
      const slice = r.transformedText.slice(span.start, span.end);
      expect(slice).toBe(span.replacedWith);
    }
  });

  it('entity spans reference [CITY], [ORG], or [PERSON] tokens', async () => {
    const r = await runPipeline(DE_REQUEST);
    const entitySpans = r.annotatedSpans.filter((s) => s.transform === 'entity_generalization');
    for (const span of entitySpans) {
      expect(['[CITY]', '[ORG]', '[PERSON]']).toContain(span.replacedWith);
    }
  });

  it('lexical_neutralization spans appear only at strength 3', async () => {
    const r2 = await runPipeline({ ...DE_REQUEST, text: 'Das war phänomenal.', strength: 2 });
    const r3 = await runPipeline({ ...DE_REQUEST, text: 'Das war phänomenal.', strength: 3 });
    expect(r2.annotatedSpans.filter((s) => s.transform === 'lexical_neutralization')).toHaveLength(0);
    expect(r3.annotatedSpans.filter((s) => s.transform === 'lexical_neutralization').length).toBeGreaterThan(0);
  });
});

// ── riskAnnotations ────────────────────────────────────────────────────────
describe('runPipeline — riskAnnotations', () => {
  it('returns an array', async () => {
    const r = await runPipeline(DE_REQUEST);
    expect(Array.isArray(r.riskAnnotations)).toBe(true);
  });

  it('each risk span has start, end, feature, riskLevel', async () => {
    const r = await runPipeline(DE_REQUEST);
    for (const span of r.riskAnnotations) {
      expect(typeof span.start).toBe('number');
      expect(typeof span.end).toBe('number');
      expect(span.end).toBeGreaterThan(span.start);
      expect(['hapax', 'rare_word']).toContain(span.feature);
      expect(['high', 'medium']).toContain(span.riskLevel);
    }
  });

  it('risk span offsets reference correct text in originalText', async () => {
    const r = await runPipeline(DE_REQUEST);
    for (const span of r.riskAnnotations) {
      const slice = r.originalText.slice(span.start, span.end);
      expect(slice.length).toBeGreaterThan(0);
    }
  });

  it('riskAnnotations are computed on originalText not transformedText', async () => {
    // After strength-1 transformation, "Berlin" is replaced by [CITY].
    // riskAnnotations must still contain the span for "Berlin" in originalText.
    const r = await runPipeline(DE_REQUEST);
    const berlinIdx = r.originalText.indexOf('Berlin');
    expect(berlinIdx).toBeGreaterThanOrEqual(0);
    // Some risk span must reference a position within originalText
    expect(r.riskAnnotations.some((s) => s.start >= 0 && s.end <= r.originalText.length)).toBe(true);
  });
});

describe('runPipeline — semanticSimilarity', () => {
  it('includes semanticSimilarity in [−1,1] when embeddingModel is set', async () => {
    // Mock embed returns identical vectors → cosine = 1.0
    const vec = [0.5, 0.3, 0.8, 0.1, 0.6];
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({ transformedText: 'ok' })),
      embed: vi.fn().mockResolvedValue(vec),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true, model: 'llama3.2', embeddingModel: 'nomic-embed-text' } },
      mockClient,
    );

    expect(r).toHaveProperty('semanticSimilarity');
    expect(r.semanticSimilarity).toBeGreaterThanOrEqual(-1);
    expect(r.semanticSimilarity).toBeLessThanOrEqual(1);
    expect(mockClient.embed).toHaveBeenCalledTimes(2);
  });

  it('omits semanticSimilarity when embeddingModel is not set', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({ transformedText: 'ok' })),
      embed: vi.fn(),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true, model: 'llama3.2' } },
      mockClient,
    );

    expect(r.semanticSimilarity).toBeUndefined();
    expect(mockClient.embed).not.toHaveBeenCalled();
  });

  it('omits semanticSimilarity (silently) when embed throws', async () => {
    const mockClient: OllamaClient = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({ transformedText: 'ok' })),
      embed: vi.fn().mockRejectedValue(new Error('model not loaded')),
    };

    const r = await runPipeline(
      { ...DE_REQUEST, llm: { enabled: true, embeddingModel: 'nomic-embed-text' } },
      mockClient,
    );

    expect(r.semanticSimilarity).toBeUndefined();
  });
});
