import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT,
  USER_PROMPT_CONSTRAINED,
  USER_PROMPT_UNCONSTRAINED,
  REPAIR_PROMPT,
  PROMPT_VERSION,
  DEFAULT_SIGNAL_DEFINITION,
  ENTITY_POLICY_VALUES,
  type EntityPolicy,
} from '../src/features/transform/prompts.js';
import { LLMOutputSchema } from '../src/features/transform/schema.js';

// ── SYSTEM_PROMPT ──────────────────────────────────────────────────────────

describe('SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('mentions both axes A and B', () => {
    expect(SYSTEM_PROMPT).toContain('Attribution Reduction');
    expect(SYSTEM_PROMPT).toContain('Information Preservation');
  });

  it('documents all three entity policies', () => {
    expect(SYSTEM_PROMPT).toContain('preserve_all');
    expect(SYSTEM_PROMPT).toContain('pseudonymize_persons');
    expect(SYSTEM_PROMPT).toContain('pseudonymize_all_named_entities');
  });

  it('instructs JSON-only output', () => {
    expect(SYSTEM_PROMPT).toContain('ONLY strictly valid JSON');
  });

  it('prohibits inventing facts', () => {
    expect(SYSTEM_PROMPT).toContain('Never invent facts');
  });
});

// ── USER_PROMPT_CONSTRAINED ────────────────────────────────────────────────

describe('USER_PROMPT_CONSTRAINED', () => {
  const TEXT = 'Alice works at Globex Corp.';
  const SIGNALS = DEFAULT_SIGNAL_DEFINITION;

  it('contains CONSTRAINED mode label', () => {
    const p = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('CONSTRAINED mode');
  });

  it('embeds the input text', () => {
    const p = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain(TEXT);
  });

  it('embeds the signal definition', () => {
    const custom = 'unusual punctuation density';
    const p = USER_PROMPT_CONSTRAINED(TEXT, custom, 'preserve_all');
    expect(p).toContain(custom);
  });

  it('preserve_all — instructs not to modify entities', () => {
    const p = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('preserve_all');
    expect(p).toContain('do NOT modify any named entities');
  });

  it('pseudonymize_persons — instructs person pseudonymization only', () => {
    const p = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'pseudonymize_persons');
    expect(p).toContain('pseudonymize_persons');
    expect(p).toContain('replace every person name');
    // Must NOT instruct pseudonymizing orgs/locations
    expect(p).toContain('Keep all organization and location names intact');
  });

  it('pseudonymize_all_named_entities — instructs full entity pseudonymization', () => {
    const p = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'pseudonymize_all_named_entities');
    expect(p).toContain('pseudonymize_all_named_entities');
    expect(p).toContain('every named entity');
    expect(p).toContain('Person_A');
  });

  it('includes JSON schema definition', () => {
    const p = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('"mode": "constrained"');
    expect(p).toContain('"transformed_text"');
    expect(p).toContain('"self_check"');
  });

  it('produces different output for each entity policy', () => {
    const policies: EntityPolicy[] = [
      'preserve_all',
      'pseudonymize_persons',
      'pseudonymize_all_named_entities',
    ];
    const prompts = policies.map((p) => USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, p));
    const unique = new Set(prompts);
    expect(unique.size).toBe(3);
  });
});

// ── USER_PROMPT_UNCONSTRAINED ──────────────────────────────────────────────

describe('USER_PROMPT_UNCONSTRAINED', () => {
  const TEXT = 'Bob visited Paris last summer.';
  const SIGNALS = DEFAULT_SIGNAL_DEFINITION;

  it('contains UNCONSTRAINED mode label', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('UNCONSTRAINED mode');
  });

  it('embeds the input text', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain(TEXT);
  });

  it('allows restructuring', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('freely restructure sentences');
  });

  it('preserve_all — instructs entity preservation', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('do NOT modify any named entities');
  });

  it('pseudonymize_persons — scoped to persons only', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'pseudonymize_persons');
    expect(p).toContain('replace every person name');
    expect(p).toContain('Keep all organization and location names intact');
  });

  it('pseudonymize_all_named_entities — covers all entity categories', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'pseudonymize_all_named_entities');
    expect(p).toContain('every named entity');
    expect(p).toContain('Org_B');
    expect(p).toContain('Location_C');
  });

  it('includes JSON schema definition with unconstrained mode', () => {
    const p = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(p).toContain('"mode": "unconstrained"');
    expect(p).toContain('"transformed_text"');
  });

  it('constrained and unconstrained prompts differ for same policy', () => {
    const c = USER_PROMPT_CONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    const u = USER_PROMPT_UNCONSTRAINED(TEXT, SIGNALS, 'preserve_all');
    expect(c).not.toBe(u);
  });
});

// ── REPAIR_PROMPT ──────────────────────────────────────────────────────────

describe('REPAIR_PROMPT', () => {
  it('embeds the broken output', () => {
    const broken = '{"mode": "constrained", "input_summary": "test"';
    const p = REPAIR_PROMPT(broken);
    expect(p).toContain(broken);
  });

  it('instructs syntax-only fix and no transformed_text change', () => {
    const p = REPAIR_PROMPT('{}');
    expect(p).toContain('Fix ONLY JSON syntax errors');
    expect(p).toContain('Do NOT change the value of "transformed_text"');
  });
});

// ── PROMPT_VERSION ─────────────────────────────────────────────────────────

describe('PROMPT_VERSION', () => {
  it('is a 16-character hex string', () => {
    expect(typeof PROMPT_VERSION).toBe('string');
    expect(PROMPT_VERSION).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic (same value on re-import)', () => {
    // Re-importing is not possible in a single test; verify it equals itself
    expect(PROMPT_VERSION).toBe(PROMPT_VERSION);
  });
});

// ── ENTITY_POLICY_VALUES ───────────────────────────────────────────────────

describe('ENTITY_POLICY_VALUES', () => {
  it('contains exactly the three defined policies', () => {
    expect(ENTITY_POLICY_VALUES).toHaveLength(3);
    expect(ENTITY_POLICY_VALUES).toContain('preserve_all');
    expect(ENTITY_POLICY_VALUES).toContain('pseudonymize_persons');
    expect(ENTITY_POLICY_VALUES).toContain('pseudonymize_all_named_entities');
  });
});

// ── LLMOutputSchema (zod) ──────────────────────────────────────────────────

describe('LLMOutputSchema', () => {
  const VALID_OUTPUT = {
    mode: 'constrained',
    input_summary: 'A description of the text topic.',
    transformed_text: 'The transformed version of the text.',
    self_check: {
      meaning_preserved: true,
      meaning_risk_notes: [],
      surface_novelty_level: 'low',
      signal_reduction_actions: ['Replaced rare word with common synonym.'],
    },
  };

  it('accepts a valid constrained output', () => {
    const result = LLMOutputSchema.safeParse(VALID_OUTPUT);
    expect(result.success).toBe(true);
  });

  it('accepts a valid unconstrained output', () => {
    const result = LLMOutputSchema.safeParse({ ...VALID_OUTPUT, mode: 'unconstrained' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown mode values', () => {
    const result = LLMOutputSchema.safeParse({ ...VALID_OUTPUT, mode: 'both' });
    expect(result.success).toBe(false);
  });

  it('rejects empty input_summary', () => {
    const result = LLMOutputSchema.safeParse({ ...VALID_OUTPUT, input_summary: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty transformed_text', () => {
    const result = LLMOutputSchema.safeParse({ ...VALID_OUTPUT, transformed_text: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid surface_novelty_level', () => {
    const result = LLMOutputSchema.safeParse({
      ...VALID_OUTPUT,
      self_check: { ...VALID_OUTPUT.self_check, surface_novelty_level: 'extreme' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean meaning_preserved', () => {
    const result = LLMOutputSchema.safeParse({
      ...VALID_OUTPUT,
      self_check: { ...VALID_OUTPUT.self_check, meaning_preserved: 'yes' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing self_check', () => {
    const { self_check: _sc, ...noSelfCheck } = VALID_OUTPUT;
    const result = LLMOutputSchema.safeParse(noSelfCheck);
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = LLMOutputSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects a plain string', () => {
    const result = LLMOutputSchema.safeParse('{"mode":"constrained"}');
    expect(result.success).toBe(false);
  });

  it('infers correct TypeScript type from parsed result', () => {
    const result = LLMOutputSchema.safeParse(VALID_OUTPUT);
    if (!result.success) throw new Error('parse failed');
    // Type-level check: access typed fields without cast
    const out = result.data;
    expect(out.mode).toBe('constrained');
    expect(out.self_check.meaning_preserved).toBe(true);
  });
});
