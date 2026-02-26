# contextblur

Experimental text transformation engine for stylometric signal reduction. Research-grade PoC.
Not a privacy guarantee. See THREAT_MODEL.md for scope.

## Setup

```bash
npm install
cp .env.example .env
```

## Start

```bash
npm run dev      # development, hot-reload via tsx
npm run build    # compile to dist/
npm start        # run compiled output
npm test         # run vitest suite
```

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

LLM transform requires Ollama at `OLLAMA_BASE_URL` (default `http://localhost:11434`).
Set `llm.enabled: true` and optionally `llm.model` (default: `llama3.2`).
