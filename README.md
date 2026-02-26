# contextblur

Experimental text transformation engine for stylometric signal reduction.

ContextBlur transforms short texts to reduce measurable stylistic and contextual distinctiveness.  
It is a research-grade proof of concept.

This tool does **not** guarantee anonymity.  
See `THREAT_MODEL.md` for assumptions and scope.  
See `ARCHITECTURE.md` for system design constraints.

---

## Features

- Deterministic transformation pipeline
- Optional LLM-assisted rewrite (via Ollama)
- Pre/Post metric calculation
- Deterministic uniqueness reduction score
- No persistence, no text logging
- Full unit test coverage for metrics and pipeline

---

## API

### `POST /transform`

Request body:

```json
{
  "text": "string",
  "language": "de" | "en",
  "profile": "neutralize_v1",
  "strength": 0 | 1 | 2 | 3,
  "llm": {
    "enabled": true | false,
    "model": "optional-model-name"
  }
}
````

Response:

```json
{
  "originalText": "string",
  "transformedText": "string",
  "metricsBefore": { ... },
  "metricsAfter": { ... },
  "delta": { ... },
  "uniquenessReductionScore": 0,
  "scoreSource": "deterministic" | "llm",
  "trace": {
    "applied": ["moduleA", "moduleB"]
  }
}
```

---

## Setup

```bash
npm install
cp .env.example .env
```

---

## Start

```bash
npm run dev      # development (tsx hot reload)
npm run build    # compile to dist/
npm start        # run compiled output
npm test         # run vitest suite
```

Server runs by default on:

```
http://localhost:3000
```

---

## curl example

```bash
curl -s -X POST http://localhost:3000/transform \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ich heiße Thomas Müller und wohne in Berlin. Ich arbeite bei TechCorp GmbH seit 2018.",
    "language": "de",
    "profile": "neutralize_v1",
    "strength": 2,
    "llm": { "enabled": false }
  }' | jq .
```

---

## LLM Integration (Optional)

LLM-based transformation requires a local Ollama instance.

Default configuration:

```
OLLAMA_BASE_URL=http://localhost:11434
```

Enable in request:

```json
"llm": { "enabled": true }
```

Optional model override:

```json
"llm": { "enabled": true, "model": "llama3.2" }
```

If the LLM fails or returns invalid output, ContextBlur falls back to deterministic transformation.

---

## Metrics

Current proxy metrics include:

* sentenceCount
* avgSentenceLength
* sentenceLengthStd
* typeTokenRatio
* hapaxRate
* rareWordRate
* stopwordRate
* punctuationRate
* basicNgramUniqueness

The uniqueness reduction score is derived from weighted metric deltas.

---

## Non-Goals

* No identity guarantees
* No metadata protection
* No cross-document unlinkability
* No differential privacy implementation

This project focuses strictly on measurable stylometric signal modulation.

---

## License

Experimental research project. No warranty.
