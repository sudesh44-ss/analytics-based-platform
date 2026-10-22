import { FastifyInstance } from 'fastify';

export function setupRawBodyParser(app: FastifyInstance) {
  // Retain raw Buffer on request for HMAC signature verification
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: any, body: Buffer, done: (err: Error | null, result?: any) => void) => {
      try {
        req.rawBody = body;
        const json = JSON.parse(body.toString('utf-8'));
        done(null, json);
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );
}
