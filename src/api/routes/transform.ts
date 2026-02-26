import type { FastifyInstance } from 'fastify';
import type { TransformRequest, LLMClient } from '../../core/types.js';
import { runPipeline } from '../../core/pipeline.js';
import { createOllamaClient } from '../../llm/ollama.js';
import { createOpenAICompatibleClient } from '../../llm/openai_compatible.js';

const OLLAMA_DEFAULT_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OAI_DEFAULT_URL = 'http://localhost:1234';

const bodySchema = {
  type: 'object',
  required: ['text', 'language', 'profile', 'strength', 'llm'],
  additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 100_000 },
    language: { type: 'string', enum: ['de', 'en'] },
    profile: { type: 'string', enum: ['neutralize_v1'] },
    strength: { type: 'integer', enum: [0, 1, 2, 3] },
    llm: {
      type: 'object',
      required: ['enabled'],
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        provider: { type: 'string', enum: ['ollama', 'openai_compatible'] },
        baseUrl: { type: 'string', minLength: 1 },
        apiKey: { type: 'string', minLength: 1 },
        model: { type: 'string', minLength: 1 },
        embeddingModel: { type: 'string', minLength: 1 },
      },
    },
  },
} as const;

function buildClient(llm: TransformRequest['llm']): LLMClient | undefined {
  if (!llm.enabled) return undefined;
  const provider = llm.provider ?? 'ollama';
  if (provider === 'openai_compatible') {
    return createOpenAICompatibleClient(llm.baseUrl ?? OAI_DEFAULT_URL, llm.apiKey);
  }
  return createOllamaClient(llm.baseUrl ?? OLLAMA_DEFAULT_URL);
}

export async function transformRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: TransformRequest }>(
    '/transform',
    { schema: { body: bodySchema } },
    async (request, reply) => {
      const client = buildClient(request.body.llm);
      const result = await runPipeline(request.body, client);
      return reply.send(result);
    },
  );
}
