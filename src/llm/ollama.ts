import { fetch } from 'undici';
import type { LLMClient } from '../core/types.js';

const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

// Per ARCHITECTURE.md §3.4: timeout + retry + abort; JSON-only output contract.
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

interface GenerateBody {
  model: string;
  prompt: string;
  stream: boolean;
  options?: { temperature: number };
}

interface GenerateResponse {
  response: string;
}

interface EmbedResponse {
  embedding: number[];
}

async function attempt(
  url: string,
  body: GenerateBody,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}`);
  }

  const data = (await res.json()) as GenerateResponse;
  return data.response;
}

async function generateWithRetry(
  baseUrl: string,
  body: GenerateBody,
  retriesLeft: number,
  attempt_n = 1,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const url = `${baseUrl}/api/generate`;

  process.stderr.write(`[LLM] attempt ${attempt_n}/${MAX_RETRIES + 1} → ${url} (model: ${body.model})\n`);

  try {
    const result = await attempt(url, body, controller.signal);
    process.stderr.write(`[LLM] attempt ${attempt_n} succeeded\n`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[LLM] attempt ${attempt_n} failed: ${msg}\n`);
    if (retriesLeft > 0) {
      return generateWithRetry(baseUrl, body, retriesLeft - 1, attempt_n + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function createOllamaClient(baseUrl = DEFAULT_BASE_URL): LLMClient {
  return {
    async generate(prompt: string, model: string): Promise<string> {
      return generateWithRetry(
        baseUrl,
        { model, prompt, stream: false, options: { temperature: 0 } },
        MAX_RETRIES,
      );
    },

    async embed(text: string, model: string): Promise<number[]> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Ollama embed HTTP ${res.status}`);
        }
        const data = (await res.json()) as EmbedResponse;
        return data.embedding;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
