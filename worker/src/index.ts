import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { evaluateSeoRules } from './processors/seo-rules.js';
import { computeAuditScores } from './processors/scoring.js';

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

    // 1. Mark status CRAWLING in PostgreSQL
    await supabase
      .from('audit_jobs')
      .update({
        status: 'CRAWLING',
        started_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // 2. Perform page audit & evaluation
    // (In production, Crawlee CheerioCrawler traverses the web graph up to config.maxPages)
    const mockCrawledPages = [
      {
        url: targetUrl,
        statusCode: 200,
        title: 'Home Page',
        metaDescription: 'Welcome to our platform website.',
        h1: 'Welcome to SiteScope',
        canonicalUrl: targetUrl,
        robotsMeta: 'index, follow',
        links: [{ targetUrl: `${targetUrl}/about`, statusCode: 200 }],
      },
      {
        url: `${targetUrl}/about`,
        statusCode: 200,
        title: '', // Missing title trigger
        metaDescription: '',
        h1: '',
        canonicalUrl: null,
        robotsMeta: null,
        links: [],
      },
    ];

    // 3. Persist crawled pages
    for (const page of mockCrawledPages) {
      await supabase.from('crawled_pages').insert({
        audit_job_id: jobId,
        project_id: projectId,
        url: page.url,
        normalized_url: page.url,
        status_code: page.statusCode,
        response_time_ms: 120,
        title: page.title,
        meta_description: page.metaDescription,
        h1: page.h1,
        canonical_url: page.canonicalUrl,
        robots_meta: page.robotsMeta,
        is_indexable: true,
      });
    }

    // 4. Update status ANALYZING
    await supabase
      .from('audit_jobs')
      .update({ status: 'ANALYZING', pages_crawled: mockCrawledPages.length })
      .eq('id', jobId);

    // 5. Run Rule Engine & Scoring
    const findings = evaluateSeoRules(mockCrawledPages);
    const findingInputs = findings.map((f) => ({
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      occurrencesCount: f.affectedUrls.length,
    }));

    const scores = computeAuditScores(findingInputs, 85); // 85 PSI benchmark

    // 6. Persist Findings into PostgreSQL
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

    // 7. Persist Audit Summary
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
      total_pages_crawled: mockCrawledPages.length,
      total_issues_count: findings.length,
      critical_issues_count: criticalCount,
      high_issues_count: highCount,
      medium_issues_count: mediumCount,
      low_issues_count: lowCount,
      info_issues_count: infoCount,
    });

    // 8. Mark Job COMPLETED
    await supabase
      .from('audit_jobs')
      .update({
        status: 'COMPLETED',
        overall_score: scores.overallScore,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Worker] Successfully completed audit ${jobId} with score ${scores.overallScore}`);
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
