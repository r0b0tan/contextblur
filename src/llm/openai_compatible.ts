import { fetch } from 'undici';
import type { LLMClient } from '../core/types.js';

// Adapter for any OpenAI-compatible API:
// LM Studio (localhost:1234), llama.cpp server, Jan, OpenAI, Mistral API, etc.
// Uses /v1/chat/completions for generate and /v1/embeddings for embed.

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

interface EmbeddingsResponse {
  data: Array<{ embedding: number[] }>;
}

async function chatAttempt(
  url: string,
  model: string,
  prompt: string,
  apiKey: string | undefined,
  signal: AbortSignal,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      stream: false,
      response_format: { type: 'json_object' },
    }),
    signal,
  });

  if (!res.ok) throw new Error(`OpenAI-compatible HTTP ${res.status}`);
  const data = (await res.json()) as ChatResponse;
  return data.choices[0].message.content;
}

const RETRY_DELAY_MS = 2_000;

async function chatWithRetry(
  baseUrl: string,
  model: string,
  prompt: string,
  apiKey: string | undefined,
  retriesLeft: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await chatAttempt(`${baseUrl}/v1/chat/completions`, model, prompt, apiKey, controller.signal);
  } catch (err) {
    if (retriesLeft > 0) {
      // Back off before retrying — important for rate-limit (429) responses.
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return chatWithRetry(baseUrl, model, prompt, apiKey, retriesLeft - 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function createOpenAICompatibleClient(baseUrl: string, apiKey?: string): LLMClient {
  return {
    async generate(prompt: string, model: string): Promise<string> {
      return chatWithRetry(baseUrl, model, prompt, apiKey, MAX_RETRIES);
    },

    async embed(text: string, model: string): Promise<number[]> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const res = await fetch(`${baseUrl}/v1/embeddings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model, input: text }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`OpenAI-compatible embed HTTP ${res.status}`);
        const data = (await res.json()) as EmbeddingsResponse;
        return data.data[0].embedding;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
