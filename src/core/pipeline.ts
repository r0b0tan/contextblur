import type {
  TransformRequest,
  TransformResponse,
  LLMClient,
  Language,
  LLMStatus,
  SpanRecord,
  AnnotatedSpan,
  SignalType,
} from './types.js';
import { computeMetrics, computeDelta, computeSUI, computeSSI, computeRiskAnnotations } from '../metrics/index.js';
import {
  syntaxNormalization,
  entityGeneralization,
  numbersBucketing,
  contextDampening,
  lexicalNeutralization,
} from './transforms/index.js';

// ──────────────────────────────────────────────
// Score weights (must sum to 1.0)
//
// hapax and rare are correlated (hapax ⊆ rare by definition) so each is
// down-weighted from 0.35 to 0.25. The freed 0.20 goes to typeTokenRatio,
// which is a more orthogonal signal (measures overall lexical diversity,
// not just tail frequency). stdevSentenceLength captures syntactic variance.
// ──────────────────────────────────────────────
const HAPAX_WEIGHT = 0.25;
const RARE_WEIGHT = 0.25;
const TTR_WEIGHT = 0.20;
const STDEV_WEIGHT = 0.30;
// Sum: 0.25 + 0.25 + 0.20 + 0.30 = 1.00

// ──────────────────────────────────────────────
// Span resolution
//
// Transforms emit SpanRecord[] without absolute offsets (offsets shift as
// subsequent transforms modify the text). After the full transform chain
// completes, we scan finalText left-to-right matching each replacedWith token
// in record order. Because all transforms process left-to-right and records
// are appended in execution order, the sequential cursor produces correct
// assignments in the vast majority of cases. Edge case: common replacement
// words (e.g. "some", "many") that also appear as natural tokens may be
// misattributed; this is a known PoC limitation of Option A offset resolution.
// ──────────────────────────────────────────────

const SIGNAL_TYPE_MAP: Record<string, SignalType> = {
  syntax_normalization: 'structural',
  entity_generalization: 'semantic',
  numbers_bucketing: 'semantic',
  context_dampening: 'contextual',
  lexical_neutralization: 'lexical',
};

function resolveSpanOffsets(text: string, records: SpanRecord[]): AnnotatedSpan[] {
  const spans: AnnotatedSpan[] = [];
  let cursor = 0;

  for (const record of records) {
    const idx = text.indexOf(record.replacedWith, cursor);
    if (idx === -1) continue;
    spans.push({
      start: idx,
      end: idx + record.replacedWith.length,
      originalFragment: record.originalFragment,
      replacedWith: record.replacedWith,
      transform: record.transform,
      strength: record.strength,
      signalType: SIGNAL_TYPE_MAP[record.transform] ?? 'structural',
    });
    cursor = idx + record.replacedWith.length;
  }

  return spans;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function relativeReduction(before: number, after: number, fallback: number): number {
  return before > 0 ? clamp01((before - after) / before) : fallback;
}

function computeScore(
  before: ReturnType<typeof computeMetrics>,
  after: ReturnType<typeof computeMetrics>,
): number {
  const hapax = relativeReduction(before.hapaxRate, after.hapaxRate, 0);
  const rare = relativeReduction(before.rareWordRate, after.rareWordRate, 0);
  const ttr = relativeReduction(before.typeTokenRatio, after.typeTokenRatio, 0);
  const stdev = relativeReduction(
    before.stdevSentenceLengthTokens,
    after.stdevSentenceLengthTokens,
    0,
  );
  return (
    Math.round(
      (HAPAX_WEIGHT * hapax + RARE_WEIGHT * rare + TTR_WEIGHT * ttr + STDEV_WEIGHT * stdev) *
        10000,
    ) / 100
  );
}

// ──────────────────────────────────────────────
// Semantic similarity
// ──────────────────────────────────────────────

// Cosine similarity in [-1, 1], rounded to 4 decimal places.
// Returns 0 when either vector has zero norm (degenerate embedding).
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return normA > 0 && normB > 0
    ? Math.round((dot / (normA * normB)) * 10000) / 10000
    : 0;
}

// ──────────────────────────────────────────────
// LLM helpers
// ──────────────────────────────────────────────
function buildLLMPrompt(text: string, language: Language, strength: number): string {
  const langNote =
    language === 'de'
      ? 'Antworte auf Deutsch. Keine Erklärungen.'
      : 'Respond in English. No explanations.';

  // Three-tier instruction set — each level builds on the previous.
  // Strength 1: conservative, only obvious stylistic signals.
  // Strength 2: target uncommon vocabulary + normalize sentence lengths.
  // Strength 3: aggressive full lexical neutralization.
  const instructions =
    strength >= 3
      ? [
          '- Replace ALL unusual, rare, or infrequent words with common everyday equivalents.',
          '  Where multiple synonyms exist, always pick the most frequent/common one.',
          '- Normalize sentence lengths aggressively: split long sentences, expand short ones',
          '  so all sentences are closer to average length — without adding new information.',
          '- Reduce distinctive vocabulary: never use the same uncommon word twice;',
          '  prefer generic phrasing over specific or idiosyncratic expressions.',
          '- Replace emphatic constructions (sehr, wirklich, absolut, extremely, truly)',
          '  with neutral phrasing or omit them entirely where meaning is preserved.',
          '- Prefer high-frequency function words over rare content words wherever possible.',
        ]
      : strength >= 2
      ? [
          '- Replace ALL adjectives and adverbs that sound elevated, literary, or unusual',
          '  with simple, common everyday alternatives.',
          '  Examples: "phänomenal"→"gut", "außergewöhnlich"→"bemerkenswert",',
          '  "tremendous"→"large", "extraordinary"→"notable".',
          '- Replace rare or infrequent content words with their most common synonyms.',
          '  When in doubt, use the simpler, more generic word.',
          '- Normalize sentence lengths: aim for 10–18 words per sentence.',
          '  Split sentences that exceed 25 words; join or expand those under 6 words.',
          '  Do not add new facts — rephrase only.',
        ]
      : [
          '- Replace words or short phrases that carry strong stylistic signals',
          '  (intensifiers, rare vocabulary, idiosyncratic phrasing).',
          '- Keep sentence structure and length close to the original.',
        ];

  return [
    'You are a text editor reducing stylistic fingerprints. Rewrite the text below',
    'so it sounds natural and generic while minimizing distinctive language patterns.',
    '',
    'Rules:',
    ...instructions,
    '- Tokens in brackets like [PERSON], [CITY], [ORG] are placeholders.',
    '  Keep them exactly as-is — do NOT remove or rephrase them.',
    '- Do NOT add new information, facts, or entities.',
    '- Do NOT add commentary, meta-text, or explanations.',
    '- Preserve the original language.',
    `- ${langNote}`,
    '- Respond ONLY with valid JSON: {"transformedText":"..."}',
    '',
    'Text:',
    text,
  ].join('\n');
}

// Extract the first balanced JSON object from raw LLM output.
// Non-greedy regex fails when transformedText contains '}', so we scan
// brace depth manually to find the correct closing bracket.
function extractFirstJson(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return raw.slice(start, i + 1); }
  }
  return null;
}

function parseLLMOutput(raw: string): string | null {
  try {
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    // Models at temperature=0 often wrap JSON in code blocks.
    const stripped = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const source = stripped.length > 0 ? stripped : raw;

    const json = extractFirstJson(source);
    if (!json) {
      process.stderr.write(`[LLM] parse failed — no JSON object found. Raw (200): ${raw.slice(0, 200)}\n`);
      return null;
    }
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'transformedText' in parsed &&
      typeof (parsed as Record<string, unknown>).transformedText === 'string'
    ) {
      return (parsed as { transformedText: string }).transformedText;
    }
    process.stderr.write(`[LLM] parse failed — unexpected shape. Keys: ${Object.keys(parsed as object).join(', ')}\n`);
    return null;
  } catch (e) {
    process.stderr.write(`[LLM] JSON.parse error: ${e instanceof Error ? e.message : String(e)}\n`);
    return null;
  }
}

// ──────────────────────────────────────────────
// Pipeline entry point
// ──────────────────────────────────────────────
export async function runPipeline(
  request: TransformRequest,
  ollamaClient?: LLMClient,
): Promise<TransformResponse> {
  const { text, language, strength, llm } = request;

  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('text must be a non-empty string');
  }

  const applied: string[] = [];
  const allSpanRecords: SpanRecord[] = [];
  const metricsBefore = computeMetrics(text, language);

  // ── Deterministic transforms, cumulative by strength ──────────────────────
  const syntaxResult = syntaxNormalization.apply(text, language);
  let current = syntaxResult.text;
  allSpanRecords.push(...syntaxResult.spans);
  applied.push(syntaxNormalization.name);

  if (strength >= 1) {
    const entResult = entityGeneralization.apply(current, language);
    current = entResult.text;
    allSpanRecords.push(...entResult.spans);
    applied.push(entityGeneralization.name);

    const numResult = numbersBucketing.apply(current, language);
    current = numResult.text;
    allSpanRecords.push(...numResult.spans);
    applied.push(numbersBucketing.name);
  }

  if (strength >= 2) {
    const ctxResult = contextDampening.apply(current, language);
    current = ctxResult.text;
    allSpanRecords.push(...ctxResult.spans);
    applied.push(contextDampening.name);
  }

  if (strength >= 3) {
    const lexResult = lexicalNeutralization.apply(current, language);
    current = lexResult.text;
    allSpanRecords.push(...lexResult.spans);
    applied.push(lexicalNeutralization.name);
  }

  // ── Optional LLM transform ─────────────────────────────────────────────────
  let llmStatus: LLMStatus;

  if (!llm.enabled || !ollamaClient) {
    llmStatus = 'skipped';
  } else {
    const model = llm.model ?? 'llama3.2';
    const prompt = buildLLMPrompt(current, language, strength);
    try {
      const raw = await ollamaClient.generate(prompt, model);
      const parsed = parseLLMOutput(raw);
      if (parsed !== null) {
        current = parsed;
        applied.push('llm_transform');
        llmStatus = 'used';
      } else {
        applied.push('llm_failed_fallback');
        llmStatus = 'failed_fallback';
      }
    } catch (err) {
      process.stderr.write(`[LLM] request error: ${err instanceof Error ? err.message : String(err)}\n`);
      applied.push('llm_failed_fallback');
      llmStatus = 'failed_fallback';
    }
  }

  const metricsAfter = computeMetrics(current, language);
  const delta = computeDelta(metricsBefore, metricsAfter);
  const uniquenessReductionScore = computeScore(metricsBefore, metricsAfter);
  const sui = computeSUI(metricsBefore, metricsAfter);
  const ssi = computeSSI(metricsBefore, metricsAfter);
  const annotatedSpans = resolveSpanOffsets(current, allSpanRecords);
  const riskAnnotations = computeRiskAnnotations(text, language);

  // ── Optional semantic similarity via embeddings ────────────────────────────
  // Computed when llm.embeddingModel is set and an OllamaClient is available.
  // Values below 0.85 indicate semantic content was lost during transformation.
  let semanticSimilarity: number | undefined;
  if (llm.embeddingModel && ollamaClient) {
    try {
      const [embBefore, embAfter] = await Promise.all([
        ollamaClient.embed(text, llm.embeddingModel),
        ollamaClient.embed(current, llm.embeddingModel),
      ]);
      semanticSimilarity = cosineSimilarity(embBefore, embAfter);
    } catch {
      // Embedding failed (model not loaded, timeout, etc.) — field omitted.
    }
  }

  return {
    originalText: text,
    transformedText: current,
    metricsBefore,
    metricsAfter,
    delta,
    uniquenessReductionScore,
    sui,
    ssi,
    annotatedSpans,
    riskAnnotations,
    trace: { applied },
    llmStatus,
    ...(semanticSimilarity !== undefined && { semanticSimilarity }),
  };
}
