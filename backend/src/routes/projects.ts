import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateProjectSchema } from '@sitescope/shared';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../services/supabase.js';
import { validateTargetUrl } from '../services/ssrf.js';

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // List user projects
  app.get('/projects', async (req: FastifyRequest) => {
    const userId = (req as any).user.id;
    const supabase = getSupabaseAdmin();

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: {
        items: projects || [],
      },
    };
  });

  // Create new project with SSRF domain check
  app.post('/projects', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const body = CreateProjectSchema.parse(req.body);

    // SSRF Pre-flight check on domain/URL
    const validation = await validateTargetUrl(body.domain);
    if (!validation.isValid) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SSRF_INVALID_DESTINATION',
          message: validation.error || 'Disallowed website URL destination.',
        },
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: body.name,
        domain: validation.domain,
        normalized_url: validation.normalizedUrl,
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'PROJECT_ALREADY_EXISTS',
            message: 'A project for this domain is already registered to your account.',
          },
        });
      }
      throw error;
    }

    return reply.status(201).send({
      success: true,
      data: project,
    });
  });

  // Get single project
  app.get('/projects/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !project) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found or unauthorized.',
        },
      });
    }

    return {
      success: true,
      data: project,
    };
  });
}
