import { buildServer } from './api/server.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = buildServer();

server.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
  process.stdout.write(`ContextBlur listening at ${address}\n`);
});
