import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateAuditSchema, PaginationQuerySchema } from '@sitescope/shared';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../services/supabase.js';
import { validateTargetUrl } from '../services/ssrf.js';
import { enqueueAuditJob } from '../services/queue.js';

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Trigger New Audit Job
  app.post('/audits', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const body = CreateAuditSchema.parse(req.body);
    const supabase = getSupabaseAdmin();

    // 1. Verify Project Ownership
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', body.projectId)
      .eq('user_id', userId)
      .single();

    if (projErr || !project) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' },
      });
    }

    // 2. SSRF Validation on Target URL
    const ssrfCheck = await validateTargetUrl(project.normalized_url);
    if (!ssrfCheck.isValid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SSRF_BLOCKED', message: ssrfCheck.error || 'Target URL cannot be crawled.' },
      });
    }

    // 3. Atomically Reserve Daily Audit Quota in PostgreSQL
    const { data: quotaReserved, error: quotaErr } = await supabase.rpc('reserve_audit_quota', {
      p_user_id: userId,
      p_max_daily_audits: 3, // Defaults to Free; Pro updated via subscription
    });

    if (quotaErr || !quotaReserved) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'DAILY_AUDIT_QUOTA_EXCEEDED',
          message: 'Daily audit quota reached for your current plan.',
        },
      });
    }

    // 4. Create Durable Audit Job Record in PostgreSQL
    const { data: auditJob, error: jobErr } = await supabase
      .from('audit_jobs')
      .insert({
        project_id: project.id,
        user_id: userId,
        status: 'QUEUED',
        config: {
          maxPages: body.maxPages,
          crawlDepth: body.crawlDepth,
          enableJs: body.enableJs,
          performanceUrls: body.performanceUrls || [project.normalized_url],
        },
        max_pages: body.maxPages,
        pages_crawled: 0,
      })
      .select()
      .single();

    if (jobErr) {
      // Revert quota on insertion failure
      await supabase.rpc('release_audit_quota', { p_user_id: userId });
      throw jobErr;
    }

    // 5. Enqueue to BullMQ
    try {
      await enqueueAuditJob(auditJob.id, {
        jobId: auditJob.id,
        projectId: project.id,
        userId,
        userEmail: (req as any).user?.email,
        targetUrl: project.normalized_url,
        config: auditJob.config,
      });
    } catch (queueErr) {
      req.log.error(queueErr, 'Failed to enqueue BullMQ job; stored in DB outbox');
      // Job remains in PostgreSQL and will be picked up by outbox sweeper
    }

    return reply.status(201).send({
      success: true,
      data: auditJob,
    });
  });

  // Get Single Audit Status
  app.get('/audits/:auditId', async (req: FastifyRequest<{ Params: { auditId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { auditId } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: audit, error } = await supabase
      .from('audit_jobs')
      .select('*, projects(name, domain)')
      .eq('id', auditId)
      .eq('user_id', userId)
      .single();

    if (error || !audit) {
      return reply.status(404).send({
        success: false,
        error: { code: 'AUDIT_NOT_FOUND', message: 'Audit job not found.' },
      });
    }

    return { success: true, data: audit };
  });

  // Get Crawled Pages for an Audit
  app.get('/audits/:auditId/pages', async (req: FastifyRequest<{ Params: { auditId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { auditId } = req.params;
    const query = PaginationQuerySchema.parse(req.query);
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: audit } = await supabase
      .from('audit_jobs')
      .select('id')
      .eq('id', auditId)
      .eq('user_id', userId)
      .single();

    if (!audit) {
      return reply.status(404).send({
        success: false,
        error: { code: 'AUDIT_NOT_FOUND', message: 'Audit not found.' },
      });
    }

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    let dbQuery = supabase
      .from('crawled_pages')
      .select('*', { count: 'exact' })
      .eq('audit_job_id', auditId);

    if (query.search) {
      dbQuery = dbQuery.ilike('url', `%${query.search}%`);
    }

    const { data: pages, count, error } = await dbQuery.range(from, to);
    if (error) throw error;

    return {
      success: true,
      data: {
        items: pages || [],
        pagination: {
          page: query.page,
          limit: query.limit,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      },
    };
  });

  // Get Findings / Issues for an Audit
  app.get('/audits/:auditId/issues', async (req: FastifyRequest<{ Params: { auditId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { auditId } = req.params;
    const query = PaginationQuerySchema.parse(req.query);
    const supabase = getSupabaseAdmin();

    const { data: audit } = await supabase
      .from('audit_jobs')
      .select('project_id')
      .eq('id', auditId)
      .eq('user_id', userId)
      .single();

    if (!audit) {
      return reply.status(404).send({
        success: false,
        error: { code: 'AUDIT_NOT_FOUND', message: 'Audit not found.' },
      });
    }

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    const { data: issues, count, error } = await supabase
      .from('issues')
      .select('*', { count: 'exact' })
      .eq('project_id', audit.project_id)
      .range(from, to)
      .order('score_impact', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: {
        items: issues || [],
        pagination: {
          page: query.page,
          limit: query.limit,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      },
    };
  });
}
