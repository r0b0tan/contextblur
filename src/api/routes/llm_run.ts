import type { FastifyInstance } from 'fastify';
import { executeLLMRun } from '../../features/transform/runner.js';
import type { Language } from '../../core/types.js';

const REQUEST_SCHEMA = {
  type: 'object',
  required: ['text', 'language', 'mode', 'baseUrl', 'model'],
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 100_000 },
    language: { type: 'string', enum: ['de', 'en'] },
    signalDefinition: { type: 'string', maxLength: 2_000 },
    mode: { type: 'string', enum: ['constrained', 'unconstrained', 'both'] },
    batchSize: { type: 'integer', minimum: 1, maximum: 20 },
    baseUrl: { type: 'string', minLength: 1, maxLength: 512 },
    model: { type: 'string', minLength: 1, maxLength: 128 },
    maxTokens: { type: 'integer', minimum: 256, maximum: 8192 },
    apiKey: { type: 'string', maxLength: 256 },
  },
} as const;

interface LLMRunBody {
  text: string;
  language: Language;
  signalDefinition?: string;
  mode: 'constrained' | 'unconstrained' | 'both';
  batchSize?: number;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  apiKey?: string;
}

export async function llmRunRoutes(app: FastifyInstance) {
  app.post<{ Body: LLMRunBody }>(
    '/llm-run',
    { schema: { body: REQUEST_SCHEMA } },
    async (request, reply) => {
      const {
        text,
        language,
        signalDefinition,
        mode,
        batchSize = 5,
        baseUrl,
        model,
        maxTokens,
        apiKey,
      } = request.body;

      const result = await executeLLMRun({
        text,
        language,
        signalDefinition,
        mode,
        batchSize,
        baseUrl,
        model,
        maxTokens: maxTokens ?? 2048,
        apiKey,
      });

      return reply.send(result);
    },
  );
}
