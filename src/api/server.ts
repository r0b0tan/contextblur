import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { transformRoutes } from './routes/transform.js';
import { modelsRoutes } from './routes/models.js';

export function buildServer() {
  // logger: false — no request logs that could contain input text (per ARCHITECTURE.md §9)
  const app = Fastify({ logger: false });

  // ── API routes (registered first — take priority over static handler) ──────
  app.register(transformRoutes);
  app.register(modelsRoutes);

  // ── Static frontend (Vite build output in public/) ────────────────────────
  app.register(fastifyStatic, {
    root: join(process.cwd(), 'public'),
    prefix: '/',
    wildcard: false,
  });

  // SPA fallback: unmatched GETs serve index.html (React router compatibility)
  app.setNotFoundHandler(async (_req, reply) => {
    return reply.sendFile('index.html');
  });

  app.setErrorHandler((error, _request, reply) => {
    // Do not echo request body in error responses
    reply.status(error.statusCode ?? 400).send({
      error: error.message,
      code: error.code ?? 'PIPELINE_ERROR',
    });
  });

  return app;
}
