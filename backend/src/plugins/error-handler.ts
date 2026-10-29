import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function setupErrorHandler(app: any) {
  app.setErrorHandler((error: FastifyError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    // Handle Zod Validation Errors
    if (error instanceof ZodError || error.name === 'ZodError') {
      const flattened = 'flatten' in error && typeof error.flatten === 'function' ? error.flatten().fieldErrors : undefined;
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request payload failed schema validation.',
          details: flattened,
        },
      });
    }

    // Handle Fastify Schema / Rate Limit Errors
    const statusCode = error.statusCode || 500;
    const errorCode = (error as any).code || 'INTERNAL_SERVER_ERROR';

    // Safe sanitized response in production
    const isProduction = process.env.NODE_ENV === 'production';
    const message = statusCode >= 500 && isProduction
      ? 'An unexpected internal error occurred. Please contact support.'
      : error.message;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    });
  });
}
