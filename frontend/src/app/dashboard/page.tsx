'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, CheckCircle2, Globe, AlertTriangle } from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import { ScoreTrendChart } from '../../components/charts/ScoreTrendChart';
import { SeverityBarChart } from '../../components/charts/SeverityBarChart';
import { IssueLifecyclePieChart } from '../../components/charts/IssueLifecyclePieChart';
import { RecentAuditsTable, AuditRow } from '../../components/tables/RecentAuditsTable';
import {
  getProjects,
  getDashboardSummary,
  getDashboardTrends,
  DashboardSummaryData,
  TrendItem,
} from '../../lib/api';
import { Project } from '@sitescope/shared';
import styles from './page.module.css';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initial load: Fetch Projects
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setApiError(null);

      const projRes = await getProjects();
      if (!isMounted) return;

      if (!projRes.success) {
        setApiError(projRes.error?.message || 'Failed to connect to SiteScope API');
        setIsLoading(false);
        return;
      }

      const items = projRes.data?.items || [];
      setProjects(items);

      if (items.length > 0) {
        setSelectedProjectId(items[0].id);
      } else {
        setIsLoading(false);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Summary & Trends when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    let isMounted = true;

    async function loadProjectMetrics() {
      setIsLoading(true);
      setApiError(null);

      const [sumRes, trendRes] = await Promise.all([
        getDashboardSummary(selectedProjectId!),
        getDashboardTrends(selectedProjectId!),
      ]);

      if (!isMounted) return;

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      } else if (sumRes.error) {
        setApiError(sumRes.error.message);
      }

      if (trendRes.success && trendRes.data?.trends) {
        setTrends(trendRes.data.trends);
      }

      setIsLoading(false);
    }

    loadProjectMetrics();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  // Transform trend records for LineChart component
  const chartTrendData = trends.map((t) => ({
    date: new Date(t.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    overall: t.overall_score,
    seo: t.seo_score,
    performance: t.performance_score,
    health: t.technical_health_score,
    security: t.security_score,
  }));

  // Build Recent Audits table rows
  const recentAuditRows: AuditRow[] = trends.map((t) => ({
    id: t.audit_job_id,
    domain: summary?.domain || 'Website',
    status: 'COMPLETED',
    overallScore: t.overall_score,
    issuesCount: summary?.kpi.totalIssuesCount || 0,
    completedAt: t.created_at,
  }));

  const issueDistribution = {
    open: summary?.kpi.totalIssuesCount || 0,
    fixed: 0,
    ignored: 0,
    reopened: 0,
  };

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Auditor Overview</h1>
              <p className={styles.subtitle}>
                Monitored website performance, technical SEO diagnostics, and health scores.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {projects.length > 1 && (
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.domain})
                    </option>
                  ))}
                </select>
              )}
              <Link href="/projects" className="btn btn-secondary">
                <RefreshCw size={16} />
                <span>Run New Audit</span>
              </Link>
              <Link href="/projects" className="btn btn-primary">
                <Plus size={16} />
                <span>Add Website</span>
              </Link>
            </div>
          </div>

          {/* Error Banner */}
          {apiError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 18px',
                marginBottom: '24px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--critical-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--critical)',
                fontSize: '14px',
              }}
            >
              <AlertTriangle size={18} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 0', alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                <RefreshCw size={18} className="spin-animation" />
                <span>Loading monitored website diagnostics...</span>
              </div>
            </div>
          )}

          {/* Empty State: No websites monitored yet */}
          {!isLoading && projects.length === 0 && (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Globe size={24} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                No Websites Registered Yet
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                Add your first website to execute technical SEO audits, inspect Core Web Vitals, and track health score trends.
              </p>
              <Link href="/projects" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Add Your First Website</span>
              </Link>
            </div>
          )}

          {/* Active Dashboard View */}
          {!isLoading && projects.length > 0 && (
            <>
              {/* 5 KPI Metric Cards */}
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Overall Health Score</div>
                  <div className={styles.kpiValue}>
                    <span>{summary?.overallScore ?? 0}</span>
                    <span className={styles.kpiDelta}>/ 100</span>
                  </div>
                  <div className={styles.kpiSub}>Based on 4 weighted audit modules</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Monitored Websites</div>
                  <div className={styles.kpiValue}>
                    {projects.length}
                  </div>
                  <div className={styles.kpiSub}>Active monitored domains</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Open Findings</div>
                  <div
                    className={styles.kpiValue}
                    style={{
                      color: (summary?.kpi.totalIssuesCount ?? 0) > 0 ? 'var(--high)' : 'var(--success)',
                    }}
                  >
                    {summary?.kpi.totalIssuesCount ?? 0}
                  </div>
                  <div className={styles.kpiSub}>
                    {summary?.kpi.criticalIssuesCount ?? 0} Critical · {summary?.kpi.highIssuesCount ?? 0} High priority
                  </div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Pages Crawled</div>
                  <div className={styles.kpiValue}>
                    {summary?.kpi.totalPagesCrawled ?? 0}
                  </div>
                  <div className={styles.kpiSub}>Latest crawl audit count</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Daily Audit Quota</div>
                  <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>
                    {summary?.kpi.dailyAuditsRemaining ?? 3} / {summary?.kpi.dailyAuditsLimit ?? 3}
                  </div>
                  <div className={styles.kpiSub}>Resets midnight UTC</div>
                </div>
              </div>

              {/* Category Score Cards */}
              <div className={styles.categoryGrid}>
                <div className={styles.categoryCard}>
                  <div className={styles.categoryName}>Technical SEO (35%)</div>
                  <div className={styles.categoryScore} style={{ color: '#10b981' }}>
                    {summary?.categoryScores.seo ?? 0}/100
                  </div>
                </div>
                <div className={styles.categoryCard}>
                  <div className={styles.categoryName}>Performance (25%)</div>
                  <div className={styles.categoryScore} style={{ color: '#f59e0b' }}>
                    {summary?.categoryScores.performance ?? 0}/100
                  </div>
                </div>
                <div className={styles.categoryCard}>
                  <div className={styles.categoryName}>Tech Health (25%)</div>
                  <div className={styles.categoryScore} style={{ color: '#6366f1' }}>
                    {summary?.categoryScores.technicalHealth ?? 0}/100
                  </div>
                </div>
                <div className={styles.categoryCard}>
                  <div className={styles.categoryName}>Security Config (15%)</div>
                  <div className={styles.categoryScore} style={{ color: '#ec4899' }}>
                    {summary?.categoryScores.security ?? 0}/100
                  </div>
                </div>
              </div>

              {/* Interactive Charts */}
              <div className={styles.chartGrid}>
                <div className="card">
                  <div className={styles.cardTitle}>
                    <span>Audit Health Score Trends</span>
                    <span className="badge badge-info">Latest Executions</span>
                  </div>
                  <ScoreTrendChart data={chartTrendData} />
                </div>

                <div className="card">
                  <div className={styles.cardTitle}>
                    <span>Findings by Severity</span>
                    <span className="badge badge-high">
                      {(summary?.kpi.criticalIssuesCount ?? 0) + (summary?.kpi.highIssuesCount ?? 0)} High+
                    </span>
                  </div>
                  <SeverityBarChart data={summary?.issuesBySeverity || []} />
                </div>
              </div>

              {/* Issue Lifecycle & Recent Audits */}
              <div className={styles.chartGrid} style={{ gridTemplateColumns: '1fr 2fr' }}>
                <div className="card">
                  <div className={styles.cardTitle}>
                    <span>Resolution Lifecycle</span>
                    <CheckCircle2 size={16} color="var(--success)" />
                  </div>
                  <IssueLifecyclePieChart distribution={issueDistribution} />
                </div>

                <div className="card">
                  <div className={styles.cardTitle}>
                    <span>Recent Audit Executions</span>
                    <Link href="/projects" style={{ fontSize: '13px', color: 'var(--primary)' }}>
                      View All Audits &rarr;
                    </Link>
                  </div>
                  <RecentAuditsTable data={recentAuditRows} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
