import { FastifyReply, FastifyRequest } from 'fastify';
import { getSupabaseAdmin, isSupabaseConfigured } from '../services/supabase.js';

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

  // Development bypass strictly controlled: prohibited in production/staging environments
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  const isTest = process.env.NODE_ENV === 'test';
  const allowDevBypass =
    process.env.ALLOW_DEV_AUTH_BYPASS === 'true' ||
    (!isProduction && !isSupabaseConfigured());

  if (!isProduction && (isTest || allowDevBypass) && token === 'dev-token') {
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
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'AUTH_VERIFICATION_FAILED',
        message: 'Failed to verify authentication credentials.',
      },
    });
  }
}
