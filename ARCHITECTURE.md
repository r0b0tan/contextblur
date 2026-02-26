# ARCHITECTURE.md – ContextBlur

## 1. System Overview

ContextBlur is a stateless text transformation engine.

Purpose:
Reduce measurable stylistic and contextual distinctiveness in short texts.

It does **not** guarantee anonymity.
It does **not** persist input texts.
It does **not** build user profiles.

The system is designed as an experimental transformation pipeline with measurable pre/post metrics.

---

## 2. High-Level Data Flow

Request:

Input Text  
→ MetricsBefore  
→ Deterministic Transforms (based on strength)  
→ Optional LLM Transform  
→ MetricsAfter  
→ Delta + Score  
→ Response

Strict ordering:
MetricsBefore must always reflect original input.
LLM transform, if enabled, runs after deterministic transforms.
MetricsAfter always computed on final output.

---

## 3. Layered Architecture

### 3.1 API Layer
- Validates request schema
- No transformation logic
- No metric logic
- No persistence
- No logging of raw text

### 3.2 Pipeline (Orchestrator)
- Coordinates execution order
- Applies transforms based on strength
- Handles LLM fallback
- Computes metrics + score
- Returns structured response
- No HTTP dependencies

### 3.3 Deterministic Transform Modules
Pure functions:
- No I/O
- No global state
- No randomness
- No side effects

Initial modules:
- entity_generalization
- numbers_bucketing
- context_dampening
- syntax_normalization
- lexical_neutralization (conservative)

### 3.4 LLM Adapter
- Isolated module
- Replaceable
- JSON-only output contract
- Timeout + retry + abort
- If invalid output → fallback

LLM is optional enhancement, never required for valid pipeline execution.

### 3.5 Metrics Engine
Pure analysis functions:
- sentenceCount
- avgSentenceLength
- sentenceLengthStd
- punctuationRate
- typeTokenRatio
- hapaxRate
- stopwordRate
- rareWordRate
- basicNgramUniqueness

No external storage.
No model-based profiling required for MVP.

### 3.6 Scoring Module
Produces:
- delta metrics
- uniquenessReductionScore (0–100)

Score must be:
- deterministic
- transparent
- weight-based
- explainable

---

## 4. Transformation Philosophy

ContextBlur reduces identifiable signals by:

- Generalizing explicit identifiers
- Reducing rare lexical signals
- Moderating syntactic variance
- Dampening context coupling
- Avoiding artificial stylistic distortion

ContextBlur must NOT:

- Add new facts
- Invent names, places, or events
- Introduce semantic drift
- Inject random noise
- Create synthetic "LLM tone"

---

## 5. Strength Model

Strength 0:
Minimal syntax normalization.

Strength 1:
+ entity generalization
+ number/time bucketing

Strength 2:
+ context dampening

Strength 3:
+ conservative lexical neutralization

Strength must increase abstraction without fabricating content.

---

## 6. Deterministic vs LLM Boundary

Deterministic layer:
- Always produces valid output.
- Fully testable without LLM.

LLM layer:
- Optional.
- Must obey strict JSON contract.
- Never required for pipeline correctness.
- If failure → deterministic fallback.

---

## 7. Metrics Formalization (MVP)

Definitions:

TypeTokenRatio = uniqueTokens / totalTokens  
HapaxRate = tokensWithFreq1 / totalTokens  
SentenceLengthStd = standardDeviation(sentenceLengths)  
PunctuationRate = punctuationCount / totalTokens  
RareWordRate = rareTokens / totalTokens  

These are proxy indicators for stylistic distinctiveness.
They are not proofs of anonymity.

---

## 8. Non-Goals

ContextBlur is NOT:

- A legal anonymization framework
- A differential privacy system
- A forensic-proof de-identification engine
- A long-document anonymizer
- A SaaS privacy compliance tool

It is an experimental signal-reduction engine.

---

## 9. Privacy Assumptions

- No persistence of input text
- No cross-request correlation
- No embedding storage
- No analytics
- No telemetry
- No logging of full request bodies

All processing is transient and in-memory.

---

## 10. Extensibility Strategy

New functionality must follow existing boundaries:

- New transform → new pure module
- New profile → config only
- New model → new adapter
- New metric → metrics module only

Pipeline orchestration must remain unchanged.

---

## 11. Engineering Discipline

- Strict TypeScript
- Pure functions preferred
- Mockable LLM adapter
- Tests for metrics and pipeline
- Deterministic behavior across runs

Architecture stability is prioritized over feature expansion.