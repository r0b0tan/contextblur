# THREAT_MODEL.md – ContextBlur

## 1. Purpose

This document defines the threat model relevant to ContextBlur.

ContextBlur aims to reduce measurable stylistic and contextual distinctiveness in text.

It does not guarantee anonymity.
It does not defend against all re-identification strategies.
It is designed to reduce probabilistic authorship attribution risk under defined assumptions.

---

## 2. Protected Asset

Primary asset:

- The authorship identity behind a single published text.

Secondary assets:

- Linkability between multiple pseudonymous texts.
- Linguistic fingerprint signals embedded in text.

Out of scope:

- Legal identity exposure through non-textual metadata.
- Platform-level tracking.
- Network-layer identification (IP, timing, cookies).
- Insider knowledge.

---

## 3. Adversary Model

### 3.1 Capabilities

The adversary:

- Has access to large language models (local or cloud).
- Can perform embedding-based similarity search.
- Can aggregate public texts attributed to candidate authors.
- Can run authorship classification pipelines.
- Can analyze discourse structure and semantic patterns.
- Can perform cross-platform correlation.

The adversary may:

- Possess multiple texts from the same author.
- Use iterative prompting strategies to refine attribution.

---

### 3.2 Knowledge Assumptions

The adversary may know:

- Public writing samples of potential authors.
- Public platform context.
- Typical stylometric signals.

The adversary does not initially know:

- Private data not present in the text.
- Internal transformation logic of ContextBlur (though it may be public).
- Hidden system state (none exists by design).

---

## 4. Attack Surface

### 4.1 Textual Signals

- Rare lexical patterns
- Hapax legomena
- Unusual collocations
- Sentence length variance
- Punctuation habits
- Function word frequency
- Syntactic depth
- Contextual progression patterns
- Narrative structure

### 4.2 Contextual Coupling

- Cross-sentence coherence
- Temporal/causal chains
- Topic persistence
- Recurrent semantic frames

### 4.3 Multi-Document Aggregation

If multiple texts exist:
- Signal accumulation increases attribution probability.
- Topic clustering may reveal identity.
- Stylometric variance becomes more stable.

---

## 5. Adversary Goals

Primary goal:

- Maximize P(Author | Text)

Secondary goals:

- Link multiple pseudonymous texts.
- Infer demographic or professional attributes.
- Identify unique semantic combinations.

Success criteria for adversary:

- Attribution accuracy significantly above random baseline.
- High confidence ranking of candidate authors.
- Cross-text clustering of same-author documents.

---

## 6. Defense Objectives (ContextBlur)

ContextBlur attempts to:

1. Reduce rare lexical signals.
2. Reduce syntactic variance.
3. Generalize explicit identifiers.
4. Dampen contextual coupling.
5. Converge text distribution toward a high-frequency population norm.

Formal objective:

Reduce proxy signals correlated with authorship attribution:

- hapaxRate ↓
- rareWordRate ↓
- sentenceLengthStd ↓
- distribution divergence ↓

Goal is probabilistic reduction, not elimination.

---

## 7. Explicit Non-Goals

ContextBlur does NOT:

- Guarantee anonymity.
- Defeat a fully resourced adversary with large proprietary corpora.
- Protect against metadata correlation.
- Protect against timing analysis.
- Protect against cross-document forensic stylometry at scale.
- Implement differential privacy.

---

## 8. Assumptions

- Input texts are relatively short.
- Text is processed independently per request.
- No cross-request state is stored.
- No embeddings are persisted.
- No analytics are retained.
- No user accounts exist.

---

## 9. Risk That Remains

Even after transformation:

- Topic choice may remain identifying.
- Unique knowledge may remain identifying.
- Semantic structure may still correlate with prior texts.
- Multiple transformed texts from the same author may remain linkable.
- External contextual signals remain outside system control.

Residual risk is unavoidable.

---

## 10. Evaluation Strategy

Security claims must be evaluated by:

- Baseline authorship classifier before transformation.
- Same classifier after transformation.
- Measure reduction in attribution accuracy.
- Measure reduction in stylometric variance.

If attribution accuracy does not meaningfully decrease,
the transformation is insufficient.

---

## 11. Ethical Boundary

ContextBlur is intended for:

- Research
- Privacy experimentation
- Stylometric signal reduction

It must not be positioned as:

- A tool for evading lawful investigation
- A guaranteed anonymization system
- A method to conceal illegal activity

---

## 12. Conclusion

ContextBlur operates under a probabilistic threat model.

It reduces measurable authorship signals in individual texts.
It does not eliminate identity.
It shifts statistical attribution difficulty but cannot remove it entirely.

Privacy is treated as signal management, not secrecy.