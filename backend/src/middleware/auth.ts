import { FastifyReply, FastifyRequest } from 'fastify';
import { getSupabaseAdmin } from '../services/supabase.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header.',
      },
    });
  }

  const token = authHeader.substring(7).trim();

  // Development bypass when running locally without a connected Supabase instance
  const isDev = process.env.NODE_ENV !== 'production';
  const isPlaceholder = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder');
  if (isDev && (token === 'dev-token' || isPlaceholder)) {
    (request as any).user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dev@sitescope.io',
    };
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session token has expired or is invalid.',
        },
      });
    }

    // Attach verified user to request object
    (request as any).user = {
      id: user.id,
      email: user.email,
    };
  } catch (err: any) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'AUTH_VERIFICATION_FAILED',
        message: 'Failed to verify authentication credentials.',
      },
    });
  }
}
