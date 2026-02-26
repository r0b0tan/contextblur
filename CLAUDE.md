# CLAUDE.md – ContextBlur Engineering Contract

## 1. Architecture Authority

All structural decisions must comply with ARCHITECTURE.md.

If a proposed change conflicts with ARCHITECTURE.md:
- do not silently modify architecture
- explicitly state the conflict
- propose a documented architectural amendment

No architectural drift is allowed without explicit justification.

## 1.1 Project Identity

ContextBlur is an experimental text transformation engine.

Goal:
Reduce measurable stylistic and semantic distinctiveness.
Not: guarantee anonymity.
Not: market privacy claims.
Not: overpromise.

This is a PoC focused on signal transformation + measurable deltas.

---

## 1.2 Architecture & Threat Model Authority

This project is governed by two authoritative documents:

- ARCHITECTURE.md — defines structural boundaries and system design.
- THREAT_MODEL.md — defines adversary assumptions, scope, and non-goals.

When generating or modifying code:

1. You MUST comply with ARCHITECTURE.md.
2. You MUST respect the constraints and assumptions defined in THREAT_MODEL.md.
3. You MUST NOT introduce functionality that contradicts either document.
4. If a requested change conflicts with them:
   - explicitly state the conflict,
   - do not silently modify architecture,
   - propose an amendment to the relevant document.

Architectural drift is not allowed.
Threat model expansion is not allowed without explicit revision.

---

## 2. Core Principles

1. Deterministic first.
2. LLM optional, isolated, replaceable.
3. No hidden state.
4. No persistence of input texts.
5. No logging of raw text.
6. Every transformation must be measurable.
7. No architectural overreach.

---

## 3. Architecture Constraints

### Allowed layers

- API (thin)
- Pipeline orchestrator
- Deterministic transforms
- LLM adapter
- Metrics engine
- Scoring module

### Forbidden

- Databases
- Telemetry
- Analytics
- Hidden side effects
- Global mutable state
- Cross-request caching of texts

---

## 4. LLM Rules

LLM is a transformation module, not a reasoning authority.

LLM must:
- Output strict JSON only
- Never add facts
- Never invent names
- Never introduce new entities
- Preserve semantic core
- Obey strength parameter

If LLM fails:
- Fallback to deterministic output
- Never throw raw LLM output to client

---

## 5. Transformation Philosophy

Transformations must:

- Reduce rare lexical signals
- Reduce extreme syntactic variance
- Generalize explicit identifiers
- Dampen context coupling
- Avoid synthetic “LLM tone”

Avoid:

- Artificial noise injection
- Random stylistic distortion
- Template repetition
- Over-normalization

---

## 6. Metrics Discipline

All changes must be measurable via:

- hapaxRate
- rareWordRate
- sentenceLengthStd
- typeTokenRatio
- punctuationRate

No subjective evaluation logic.

Scoring must be deterministic and explainable.

---

## 7. Strength Levels

Strength 0:
Minimal syntax normalization only.

Strength 1:
+ entity + number generalization.

Strength 2:
+ context dampening.

Strength 3:
+ stronger lexical neutralization (conservative).

Strength must never introduce semantic drift.

---

## 8. Code Quality Rules

- No TODO placeholders.
- No magic numbers without constants.
- TypeScript strict mode.
- All transforms pure functions.
- Pipeline fully testable without LLM.
- LLM adapter mockable.

---

## 9. Scope Guard

This is not:

- A full anonymizer.
- A legal compliance system.
- A privacy guarantee engine.
- A production SaaS.

This is a research-grade experimental transformation engine.

---

## 10. Communication Style

When modifying this codebase:

- Be precise.
- Be technical.
- Avoid marketing language.
- Avoid generic advice.
- Provide diff-style or file-level outputs.