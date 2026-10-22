import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { setupRawBodyParser } from './plugins/raw-body.js';
import { setupErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { auditRoutes } from './routes/audits.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { billingRoutes } from './routes/billing.js';
import { webhookRoutes } from './routes/webhooks.js';

export function buildApp(): FastifyInstance {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = Fastify({
    logger: {
      level: isProduction ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token'],
    },
    trustProxy: true,
  });

  // CORS setup
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  app.register(cors, {
    origin: [frontendOrigin, 'http://localhost:3000', 'https://sitescope.io'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'],
  });

  // Raw body parser for webhook signatures
  setupRawBodyParser(app);

  // Centralized Error Handling
  setupErrorHandler(app);

  // Register API Routes under /api/v1 prefix
  app.register(
    async (v1) => {
      v1.register(healthRoutes);
      v1.register(projectRoutes);
      v1.register(auditRoutes);
      v1.register(dashboardRoutes);
      v1.register(billingRoutes);
      v1.register(webhookRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
