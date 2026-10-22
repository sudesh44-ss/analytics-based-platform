import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { evaluateSeoRules } from './processors/seo-rules.js';
import { computeAuditScores } from './processors/scoring.js';
import { crawlWebsite } from './crawlers/cheerio.js';
import { fetchPageSpeedMetrics } from './services/pagespeed.js';
import { sendAuditCompletedEmail } from './services/notifications.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new (IORedis as any)(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('[Worker] SiteScope Background Worker initializing...');

export const auditWorker = new Worker(
  'audit-queue',
  async (job: Job) => {
    const { jobId, projectId, userId, targetUrl, config } = job.data;
    console.log(`[Worker] Starting crawl job ${jobId} for target: ${targetUrl}`);

    try {
      // 1. Mark status CRAWLING in PostgreSQL
      await supabase
        .from('audit_jobs')
        .update({
          status: 'CRAWLING',
          started_at: new Date().toISOString(),
          heartbeat_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // 2. Perform real website crawling with SSRF protection & origin bounding
      const crawlResult = await crawlWebsite(
        targetUrl,
        {
          maxPages: config?.maxPages || 50,
          crawlDepth: config?.crawlDepth || 3,
          requestTimeoutMs: 15000,
          maxConcurrency: 3,
        },
        async (pagesCrawled) => {
          await supabase
            .from('audit_jobs')
            .update({
              pages_crawled: pagesCrawled,
              heartbeat_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }
      );

      const crawledPages = crawlResult.pages;

      // 3. Persist crawled pages
      for (const page of crawledPages) {
        await supabase.from('crawled_pages').insert({
          audit_job_id: jobId,
          project_id: projectId,
          url: page.url,
          normalized_url: page.normalizedUrl,
          status_code: page.statusCode,
          response_time_ms: page.responseTimeMs,
          content_type: page.contentType || null,
          content_length: page.contentLength || null,
          title: page.title,
          meta_description: page.metaDescription,
          h1: page.h1,
          canonical_url: page.canonicalUrl,
          robots_meta: page.robotsMeta,
          is_indexable: page.isIndexable,
          depth: page.depth,
        });
      }

      // 4. Update status ANALYZING
      await supabase
        .from('audit_jobs')
        .update({ status: 'ANALYZING', pages_crawled: crawledPages.length })
        .eq('id', jobId);

      // 5. Fetch PageSpeed Insights & Core Web Vitals
      const perfMetrics = await fetchPageSpeedMetrics(targetUrl, 'MOBILE');
      await supabase.from('performance_metrics').insert({
        audit_job_id: jobId,
        project_id: projectId,
        tested_url: targetUrl,
        device_mode: 'MOBILE',
        source: perfMetrics.source,
        performance_score: perfMetrics.performanceScore,
        accessibility_score: perfMetrics.accessibilityScore,
        best_practices_score: perfMetrics.bestPracticesScore,
        seo_score: perfMetrics.seoScore,
        fcp_ms: perfMetrics.fcpMs,
        lcp_ms: perfMetrics.lcpMs,
        cls: perfMetrics.cls,
        inp_ms: perfMetrics.inpMs,
        tbt_ms: perfMetrics.tbtMs,
        speed_index_ms: perfMetrics.speedIndexMs,
        has_field_data: perfMetrics.hasFieldData,
        opportunities: perfMetrics.opportunities || null,
      });

      // 6. Run Rule Engine & Composite Scoring
      const findings = evaluateSeoRules(crawledPages);
      const findingInputs = findings.map((f) => ({
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        occurrencesCount: f.affectedUrls.length,
      }));

      const scores = computeAuditScores(findingInputs, perfMetrics.performanceScore);

      // 7. Persist Findings into PostgreSQL
      for (const finding of findings) {
        await supabase
          .from('issues')
          .upsert(
            {
              project_id: projectId,
              rule_id: finding.ruleId,
              category: finding.category,
              severity: finding.severity,
              title: finding.title,
              explanation: finding.explanation,
              recommendation: finding.recommendation,
              score_impact: finding.scoreImpact,
              status: 'OPEN',
              first_audit_id: jobId,
              latest_audit_id: jobId,
              last_observed_at: new Date().toISOString(),
            },
            { onConflict: 'project_id, rule_id' }
          );
      }

      // 8. Persist Audit Summary
      const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
      const highCount = findings.filter((f) => f.severity === 'HIGH').length;
      const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
      const lowCount = findings.filter((f) => f.severity === 'LOW').length;
      const infoCount = findings.filter((f) => f.severity === 'INFO').length;

      await supabase.from('audit_summaries').insert({
        audit_job_id: jobId,
        project_id: projectId,
        overall_score: scores.overallScore,
        seo_score: scores.seoScore,
        performance_score: scores.performanceScore,
        technical_health_score: scores.technicalHealthScore,
        security_score: scores.securityScore,
        total_pages_crawled: crawledPages.length,
        total_issues_count: findings.length,
        critical_issues_count: criticalCount,
        high_issues_count: highCount,
        medium_issues_count: mediumCount,
        low_issues_count: lowCount,
        info_issues_count: infoCount,
      });

      // 9. Mark Job COMPLETED
      await supabase
        .from('audit_jobs')
        .update({
          status: 'COMPLETED',
          overall_score: scores.overallScore,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // 10. Dispatch Transactional Completion Email via Resend
      if (job.data.userEmail) {
        try {
          const domain = new URL(targetUrl).hostname;
          await sendAuditCompletedEmail({
            to: job.data.userEmail,
            domain,
            overallScore: scores.overallScore,
            totalPages: crawledPages.length,
            issuesCount: findings.length,
            auditId: jobId,
          });
        } catch {
          // Non-blocking notification dispatch
        }
      }

      console.log(`[Worker] Successfully completed audit ${jobId} with score ${scores.overallScore}`);
    } catch (err: any) {
      console.error(`[Worker] Audit job ${jobId} failed:`, err?.message || err);
      await supabase
        .from('audit_jobs')
        .update({
          status: 'FAILED',
          failure_reason: err?.message || 'Crawl job encountered an unexpected failure',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      throw err;
    }
  },
  {
    connection,
    concurrency: 3,
  }
);

// Graceful SIGTERM shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received. Closing queue worker gracefully...');
  await auditWorker.close();
  process.exit(0);
});
