import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../services/supabase.js';

const DashboardSummaryQuery = z.object({
  projectId: z.string().uuid(),
});

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Overview Dashboard Summary
  app.get('/dashboard/summary', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { projectId } = DashboardSummaryQuery.parse(req.query);
    const supabase = getSupabaseAdmin();

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' },
      });
    }

    // Fetch latest completed audit summary
    const { data: latestSummary } = await supabase
      .from('audit_summaries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch usage ledger for daily quota remaining
    const { data: usage } = await supabase
      .from('usage_ledger')
      .select('*')
      .eq('user_id', userId)
      .eq('period_date', new Date().toISOString().split('T')[0])
      .maybeSingle();

    const dailyLimit = usage?.max_daily_audits || 3;
    const dailyUsed = usage?.current_audits_count || 0;

    return {
      success: true,
      data: {
        projectId,
        domain: project.domain,
        overallScore: latestSummary?.overall_score ?? 0,
        latestAuditCompletedAt: latestSummary?.created_at ?? null,
        kpi: {
          totalPagesCrawled: latestSummary?.total_pages_crawled ?? 0,
          totalIssuesCount: latestSummary?.total_issues_count ?? 0,
          criticalIssuesCount: latestSummary?.critical_issues_count ?? 0,
          highIssuesCount: latestSummary?.high_issues_count ?? 0,
          mediumIssuesCount: latestSummary?.medium_issues_count ?? 0,
          lowIssuesCount: latestSummary?.low_issues_count ?? 0,
          dailyAuditsRemaining: Math.max(0, dailyLimit - dailyUsed),
          dailyAuditsLimit: dailyLimit,
        },
        categoryScores: {
          seo: latestSummary?.seo_score ?? 0,
          performance: latestSummary?.performance_score ?? 0,
          technicalHealth: latestSummary?.technical_health_score ?? 0,
          security: latestSummary?.security_score ?? 0,
        },
        issuesBySeverity: [
          { severity: 'CRITICAL', count: latestSummary?.critical_issues_count ?? 0 },
          { severity: 'HIGH', count: latestSummary?.high_issues_count ?? 0 },
          { severity: 'MEDIUM', count: latestSummary?.medium_issues_count ?? 0 },
          { severity: 'LOW', count: latestSummary?.low_issues_count ?? 0 },
          { severity: 'INFO', count: latestSummary?.info_issues_count ?? 0 },
        ],
      },
    };
  });

  // Historical Audit Trends
  app.get('/dashboard/audit-trends', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { projectId } = DashboardSummaryQuery.parse(req.query);
    const supabase = getSupabaseAdmin();

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' },
      });
    }

    const { data: summaries, error } = await supabase
      .from('audit_summaries')
      .select('audit_job_id, overall_score, seo_score, performance_score, technical_health_score, security_score, total_pages_crawled, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(30);

    if (error) throw error;

    return {
      success: true,
      data: {
        projectId,
        trends: summaries || [],
      },
    };
  });
}
