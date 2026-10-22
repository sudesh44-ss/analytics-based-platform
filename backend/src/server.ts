import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app.js';

const app = buildApp();
const port = parseInt(process.env.PORT || '4000', 10);
const host = '0.0.0.0';

async function start() {
  try {
    await app.listen({ port, host });
    app.log.info(`SiteScope Fastify API running on http://${host}:${port}/api/v1`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
