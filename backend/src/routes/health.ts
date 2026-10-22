import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return {
      success: true,
      data: {
        status: 'healthy',
        service: 'sitescope-api',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      },
    };
  });
}
