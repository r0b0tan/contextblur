import { createHash } from 'crypto';

// ── Prompt version ──────────────────────────────────────────────────────────
// Computed from the static template corpus so any template change automatically
// produces a new version string for reproducibility tracking.

export const DEFAULT_SIGNAL_DEFINITION =
  'hapax legomena (rare or unique words), unusual sentence-length variance, ' +
  'distinctive vocabulary patterns, and syntactic structures that could identify the author';

// ── System prompt (constant across both modes) ────────────────────────────
export const SYSTEM_PROMPT =
  'You are a controlled text transformation engine. ' +
  'Your role is to transform input text to reduce stylometric and semantic ' +
  'distinctiveness signals while preserving the core semantic content. ' +
  'You must output ONLY strictly valid JSON conforming to the required schema. ' +
  'Do not add any commentary, explanation, or text outside the JSON object. ' +
  'Do not invent facts. ' +
  'Do not introduce new named entities. ' +
  'Do not ask clarifying questions. ' +
  'The entire response must be a single JSON object.';

// ── User prompt: CONSTRAINED mode ─────────────────────────────────────────
// Word-level substitutions only; sentence structure preserved.
export function USER_PROMPT_CONSTRAINED(
  text: string,
  signalDefinition: string,
): string {
  return (
    'Transform the following text in CONSTRAINED mode.\n\n' +
    'CONSTRAINED mode rules (all mandatory):\n' +
    '- Preserve the original sentence structure and paragraph organisation exactly.\n' +
    '- Do NOT merge, split, reorder, or restructure sentences.\n' +
    '- Make only word-level (lexical) substitutions.\n' +
    '- Replace rare, distinctive, or highly specific words with common, neutral alternatives.\n' +
    '- Normalise vocabulary to average-frequency forms.\n' +
    `- Target signals to reduce: ${signalDefinition}\n\n` +
    'Return ONLY a single valid JSON object with this exact schema ' +
    '(no text before or after the JSON):\n' +
    '{\n' +
    '  "mode": "constrained",\n' +
    '  "input_summary": "<one-sentence summary of the input topic>",\n' +
    '  "transformed_text": "<transformed text with word-level substitutions only>",\n' +
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
// Free restructuring, paraphrasing, sentence merging/splitting allowed.
export function USER_PROMPT_UNCONSTRAINED(
  text: string,
  signalDefinition: string,
): string {
  return (
    'Transform the following text in UNCONSTRAINED mode.\n\n' +
    'UNCONSTRAINED mode rules (all mandatory):\n' +
    '- You may freely restructure sentences: merge, split, reorder, or rephrase.\n' +
    '- You may paraphrase extensively while preserving the core semantic content.\n' +
    '- You may change tone, voice, and style significantly.\n' +
    '- Prioritise reducing all distinctive surface signals over style consistency.\n' +
    '- Replace rare and characteristic vocabulary with common, neutral alternatives.\n' +
    `- Target signals to reduce: ${signalDefinition}\n\n` +
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
const TEMPLATE_CORPUS =
  SYSTEM_PROMPT +
  USER_PROMPT_CONSTRAINED('__TEXT_PLACEHOLDER__', '__SIGNALS_PLACEHOLDER__') +
  USER_PROMPT_UNCONSTRAINED('__TEXT_PLACEHOLDER__', '__SIGNALS_PLACEHOLDER__');

export const PROMPT_VERSION = createHash('sha256')
  .update(TEMPLATE_CORPUS)
  .digest('hex')
  .slice(0, 16);
