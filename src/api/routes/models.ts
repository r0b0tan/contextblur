import type { FastifyInstance } from 'fastify';
import { fetch } from 'undici';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const TIMEOUT_MS = 3_000;

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

export async function modelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/models', async (_req, reply) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        return reply.send({ models: [] });
      }
      const data = (await res.json()) as OllamaTagsResponse;
      const models = (data.models ?? []).map((m) => m.name);
      return reply.send({ models });
    } catch {
      return reply.send({ models: [] });
    } finally {
      clearTimeout(timer);
    }
  });
}
