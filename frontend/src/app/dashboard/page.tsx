import Link from 'next/link';
import { Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import { ScoreTrendChart } from '../../components/charts/ScoreTrendChart';
import { SeverityBarChart } from '../../components/charts/SeverityBarChart';
import { IssueLifecyclePieChart } from '../../components/charts/IssueLifecyclePieChart';
import { RecentAuditsTable } from '../../components/tables/RecentAuditsTable';
import styles from './page.module.css';

// Initial audit trend records
const TREND_DATA = [
  { date: 'Oct 01', overall: 74, seo: 80, performance: 65, health: 76, security: 88 },
  { date: 'Oct 08', overall: 77, seo: 84, performance: 68, health: 80, security: 90 },
  { date: 'Oct 15', overall: 81, seo: 88, performance: 72, health: 84, security: 92 },
  { date: 'Oct 22', overall: 84, seo: 92, performance: 78, health: 88, security: 95 },
];

const SEVERITY_DATA = [
  { severity: 'CRITICAL', count: 2 },
  { severity: 'HIGH', count: 7 },
  { severity: 'MEDIUM', count: 15 },
  { severity: 'LOW', count: 14 },
  { severity: 'INFO', count: 8 },
];

const ISSUE_DISTRIBUTION = {
  open: 24,
  fixed: 11,
  ignored: 3,
  reopened: 2,
};

const RECENT_AUDITS = [
  {
    id: 'aud_101',
    domain: 'sitescope.io',
    status: 'COMPLETED',
    overallScore: 84,
    issuesCount: 38,
    completedAt: '2026-10-22T07:30:00Z',
  },
  {
    id: 'aud_102',
    domain: 'example-store.com',
    status: 'COMPLETED',
    overallScore: 76,
    issuesCount: 52,
    completedAt: '2026-10-21T14:15:00Z',
  },
  {
    id: 'aud_103',
    domain: 'tech-blog-demo.dev',
    status: 'COMPLETED',
    overallScore: 91,
    issuesCount: 14,
    completedAt: '2026-10-20T09:45:00Z',
  },
];

export default function DashboardPage() {
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
            <div style={{ display: 'flex', gap: '12px' }}>
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

          {/* 5 KPI Metric Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Overall Health Score</div>
              <div className={styles.kpiValue}>
                <span>84</span>
                <span className={styles.kpiDelta}>+3.2%</span>
              </div>
              <div className={styles.kpiSub}>Based on 4 weighted audit modules</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Monitored Websites</div>
              <div className={styles.kpiValue}>3 / 10</div>
              <div className={styles.kpiSub}>Pro Plan: 7 slots remaining</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Open Findings</div>
              <div className={styles.kpiValue} style={{ color: 'var(--high)' }}>
                38
              </div>
              <div className={styles.kpiSub}>2 Critical · 7 High priority</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Pages Crawled</div>
              <div className={styles.kpiValue}>482</div>
              <div className={styles.kpiSub}>Within 1,000 page audit limit</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Daily Audit Quota</div>
              <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>
                27 / 30
              </div>
              <div className={styles.kpiSub}>Resets midnight UTC</div>
            </div>
          </div>

          {/* Category Score Cards */}
          <div className={styles.categoryGrid}>
            <div className={styles.categoryCard}>
              <div className={styles.categoryName}>Technical SEO (35%)</div>
              <div className={styles.categoryScore} style={{ color: '#10b981' }}>92/100</div>
            </div>
            <div className={styles.categoryCard}>
              <div className={styles.categoryName}>Performance (25%)</div>
              <div className={styles.categoryScore} style={{ color: '#f59e0b' }}>78/100</div>
            </div>
            <div className={styles.categoryCard}>
              <div className={styles.categoryName}>Tech Health (25%)</div>
              <div className={styles.categoryScore} style={{ color: '#6366f1' }}>88/100</div>
            </div>
            <div className={styles.categoryCard}>
              <div className={styles.categoryName}>Security Config (15%)</div>
              <div className={styles.categoryScore} style={{ color: '#ec4899' }}>95/100</div>
            </div>
          </div>

          {/* Interactive Charts */}
          <div className={styles.chartGrid}>
            <div className="card">
              <div className={styles.cardTitle}>
                <span>Audit Health Score Trends</span>
                <span className="badge badge-info">Last 30 Days</span>
              </div>
              <ScoreTrendChart data={TREND_DATA} />
            </div>

            <div className="card">
              <div className={styles.cardTitle}>
                <span>Findings by Severity</span>
                <span className="badge badge-high">9 High+</span>
              </div>
              <SeverityBarChart data={SEVERITY_DATA} />
            </div>
          </div>

          {/* Issue Lifecycle & Recent Audits */}
          <div className={styles.chartGrid} style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div className="card">
              <div className={styles.cardTitle}>
                <span>Resolution Lifecycle</span>
                <CheckCircle2 size={16} color="var(--success)" />
              </div>
              <IssueLifecyclePieChart distribution={ISSUE_DISTRIBUTION} />
            </div>

            <div className="card">
              <div className={styles.cardTitle}>
                <span>Recent Audit Executions</span>
                <Link href="/projects" style={{ fontSize: '13px', color: 'var(--primary)' }}>
                  View All Audits &rarr;
                </Link>
              </div>
              <RecentAuditsTable data={RECENT_AUDITS} />
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
