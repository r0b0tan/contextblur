import { createHash } from 'crypto';

// ── Entity policy ─────────────────────────────────────────────────────────
export type EntityPolicy =
  | 'preserve_all'
  | 'pseudonymize_persons'
  | 'pseudonymize_all_named_entities';

export const ENTITY_POLICY_VALUES: EntityPolicy[] = [
  'preserve_all',
  'pseudonymize_persons',
  'pseudonymize_all_named_entities',
];

// ── Signal definition default ─────────────────────────────────────────────
export const DEFAULT_SIGNAL_DEFINITION =
  'hapax legomena (rare or unique words), unusual sentence-length variance, ' +
  'distinctive vocabulary patterns, and syntactic structures that could identify the author';

// ── System prompt (constant across all modes and policies) ────────────────
// Defines the engine role, A/B axes, and the entity policy contract.
// Entity policy details are provided per-request in the user message.
export const SYSTEM_PROMPT =
  'You are an evaluation-grade controlled text transformation engine embedded in a research tool.\n' +
  'Output ONLY strictly valid JSON. Never output any text outside the JSON object.\n' +
  'Never add commentary, explanation, or ask clarifying questions.\n' +
  'Never invent facts. Never introduce new named entities beyond pseudonyms required by entity policy.\n' +
  '\n' +
  'This system operates along two axes:\n' +
  '- A (Attribution Reduction): reduce stylometric and semantic distinctiveness signals ' +
  'that could identify the author.\n' +
  '- B (Information Preservation): preserve the core semantic content and factual ' +
  'accuracy of the text.\n' +
  '\n' +
  'Each user message specifies an entity_policy. You MUST follow it exactly:\n' +
  '- preserve_all: do NOT modify any named entities (persons, organizations, locations).\n' +
  '- pseudonymize_persons: replace person names with consistent pseudonyms; ' +
  'leave all other named entities intact.\n' +
  '- pseudonymize_all_named_entities: replace all named entities (persons, organizations, ' +
  'locations) with consistent pseudonyms.\n' +
  '\n' +
  'Pseudonyms must be internally consistent within the response (same entity → same pseudonym).\n' +
  'The entire response must be a single JSON object conforming to the schema in the user message.';

// ── Entity policy instruction snippet ─────────────────────────────────────
function entityPolicyInstruction(policy: EntityPolicy): string {
  switch (policy) {
    case 'preserve_all':
      return (
        'Entity policy (preserve_all): do NOT modify any named entities ' +
        '(persons, organizations, locations). Keep all names exactly as they appear in the source.'
      );
    case 'pseudonymize_persons':
      return (
        'Entity policy (pseudonymize_persons): replace every person name with a consistent ' +
        'pseudonym (e.g. "Person_A", "Person_B"). ' +
        'Keep all organization and location names intact.'
      );
    case 'pseudonymize_all_named_entities':
      return (
        'Entity policy (pseudonymize_all_named_entities): replace every named entity ' +
        '(person, organization, location) with a consistent pseudonym. ' +
        'Use distinct placeholder prefixes per category ' +
        '(e.g. "Person_A", "Org_B", "Location_C"). ' +
        'Same entity → same pseudonym throughout.'
      );
  }
}

// ── User prompt: CONSTRAINED mode ─────────────────────────────────────────
// Structural constraints: exact paragraph count, sentence count ±1 per paragraph,
// headings and lists preserved. Word-level substitutions only.
export function USER_PROMPT_CONSTRAINED(
  text: string,
  signalDefinition: string,
  entityPolicy: EntityPolicy,
): string {
  return (
    'Transform the following text in CONSTRAINED mode.\n\n' +
    'CONSTRAINED mode rules (all mandatory):\n' +
    '- Preserve the original paragraph count exactly.\n' +
    '- Preserve sentence count to ±1 per paragraph.\n' +
    '- Preserve all headings and list structures.\n' +
    '- Make only word-level (lexical) substitutions; do NOT merge, split, or reorder sentences.\n' +
    '- Replace rare, distinctive, or highly specific words with common, neutral alternatives.\n' +
    '- Normalise vocabulary to average-frequency forms.\n' +
    `- Target signals to reduce: ${signalDefinition}\n\n` +
    entityPolicyInstruction(entityPolicy) +
    '\n\n' +
    'Return ONLY a single valid JSON object with this exact schema ' +
    '(no text before or after the JSON):\n' +
    '{\n' +
    '  "mode": "constrained",\n' +
    '  "input_summary": "<one-sentence summary of the input topic>",\n' +
    '  "transformed_text": "<transformed text — word-level substitutions only>",\n' +
    '  "self_check": {\n' +
    '    "meaning_preserved": <true or false>,\n' +
    '    "meaning_risk_notes": ["<describe any meaning-change risk, or empty array>"],\n' +
    '    "surface_novelty_level": "<low or medium or high>",\n' +
    '    "signal_reduction_actions": ["<each specific substitution action taken>"]\n' +
    '  }\n' +
    '}\n\n' +
    'Input text:\n' +
    text
  );
}

// ── User prompt: UNCONSTRAINED mode ───────────────────────────────────────
// Free restructuring; meaning and information preservation remain hard requirements.
export function USER_PROMPT_UNCONSTRAINED(
  text: string,
  signalDefinition: string,
  entityPolicy: EntityPolicy,
): string {
  return (
    'Transform the following text in UNCONSTRAINED mode.\n\n' +
    'UNCONSTRAINED mode rules (all mandatory):\n' +
    '- You may freely restructure sentences: merge, split, reorder, or rephrase.\n' +
    '- You may paraphrase extensively while preserving the core semantic content.\n' +
    '- You may change tone, voice, and style significantly.\n' +
    '- Prioritise reducing all distinctive surface signals over style consistency.\n' +
    '- Replace rare and characteristic vocabulary with common, neutral alternatives.\n' +
    '- Meaning and information preservation remain hard requirements.\n' +
    `- Target signals to reduce: ${signalDefinition}\n\n` +
    entityPolicyInstruction(entityPolicy) +
    '\n\n' +
    'Return ONLY a single valid JSON object with this exact schema ' +
    '(no text before or after the JSON):\n' +
    '{\n' +
    '  "mode": "unconstrained",\n' +
    '  "input_summary": "<one-sentence summary of the input topic>",\n' +
    '  "transformed_text": "<transformed text with free structural changes>",\n' +
    '  "self_check": {\n' +
    '    "meaning_preserved": <true or false>,\n' +
    '    "meaning_risk_notes": ["<describe any meaning-change risk, or empty array>"],\n' +
    '    "surface_novelty_level": "<low or medium or high>",\n' +
    '    "signal_reduction_actions": ["<each specific action taken>"]\n' +
    '  }\n' +
    '}\n\n' +
    'Input text:\n' +
    text
  );
}

// ── Repair prompt ──────────────────────────────────────────────────────────
// Sent when initial output fails schema validation.
export function REPAIR_PROMPT(rawOutput: string): string {
  return (
    'The text below was supposed to be a valid JSON object matching this schema:\n' +
    '{\n' +
    '  "mode": "constrained" | "unconstrained",\n' +
    '  "input_summary": string,\n' +
    '  "transformed_text": string,\n' +
    '  "self_check": {\n' +
    '    "meaning_preserved": boolean,\n' +
    '    "meaning_risk_notes": string[],\n' +
    '    "surface_novelty_level": "low" | "medium" | "high",\n' +
    '    "signal_reduction_actions": string[]\n' +
    '  }\n' +
    '}\n\n' +
    'Fix ONLY JSON syntax errors (missing quotes, unclosed brackets, bad escaping, ' +
    'trailing commas). Do NOT change the value of "transformed_text" in any way. ' +
    'Do NOT add new fields. Return ONLY the corrected JSON object with no other text.\n\n' +
    'Broken output to fix:\n' +
    rawOutput
  );
}

// ── Prompt version (stable hash of template bodies) ───────────────────────
// Uses preserve_all as the canonical policy placeholder for version computation.
const TEMPLATE_CORPUS =
  SYSTEM_PROMPT +
  USER_PROMPT_CONSTRAINED(
    '__TEXT_PLACEHOLDER__',
    '__SIGNALS_PLACEHOLDER__',
    'preserve_all',
  ) +
  USER_PROMPT_UNCONSTRAINED(
    '__TEXT_PLACEHOLDER__',
    '__SIGNALS_PLACEHOLDER__',
    'preserve_all',
  );

export const PROMPT_VERSION = createHash('sha256')
  .update(TEMPLATE_CORPUS)
  .digest('hex')
  .slice(0, 16);
