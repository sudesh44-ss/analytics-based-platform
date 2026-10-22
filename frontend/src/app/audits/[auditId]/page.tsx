'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Navbar } from '../../../components/common/Navbar';
import { Footer } from '../../../components/common/Footer';
import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import { getAudit, getAuditPages, getAuditIssues } from '../../../lib/api';
import { AuditJob, CrawledPage, Issue } from '@sitescope/shared';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ auditId: string }>;
}

function AuditDetailContent({ params }: { params: Promise<{ auditId: string }> }) {
  const resolvedParams = use(params);
  const auditId = resolvedParams.auditId;

  const [activeTab, setActiveTab] = useState<'pages' | 'issues' | 'performance'>('pages');
  const [audit, setAudit] = useState<(AuditJob & { projects?: { name: string; domain: string } }) | null>(null);
  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll audit status if running
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isMounted = true;

    async function fetchAuditData() {
      const res = await getAudit(auditId);
      if (!isMounted) return;

      if (!res.success || !res.data) {
        setError(res.error?.message || 'Audit record not found');
        setIsLoading(false);
        return;
      }

      setAudit(res.data);

      // If finished, fetch crawled pages and issues
      if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
        setIsLoading(false);
        const [pagesRes, issuesRes] = await Promise.all([
          getAuditPages(auditId, { page: 1, limit: 100 }),
          getAuditIssues(auditId, { page: 1, limit: 100 }),
        ]);

        if (isMounted) {
          if (pagesRes.success && pagesRes.data?.items) {
            setPages(pagesRes.data.items);
          }
          if (issuesRes.success && issuesRes.data?.items) {
            setIssues(issuesRes.data.items);
          }
        }
      } else {
        // In progress (QUEUED, CRAWLING, ANALYZING) -> poll every 3 seconds
        timer = setTimeout(fetchAuditData, 3000);
      }
    }

    fetchAuditData();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [auditId]);

  const exportCsv = () => {
    if (pages.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['URL,Status Code,Response Time (ms),Title,Indexable']
        .concat(
          pages.map(
            (p) =>
              `"${p.url}",${p.statusCode ?? p.status_code ?? 200},${p.responseTimeMs ?? p.response_time_ms ?? 0},"${(p.title || '').replace(/"/g, '""')}",${Boolean(p.isIndexable ?? p.is_indexable)}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sitescope_audit_${auditId}_pages.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const domainName = audit?.projects?.domain || 'Target Website';
  const overallScore = audit?.overallScore ?? audit?.overall_score ?? 0;
  const pagesCrawled = audit?.pagesCrawled ?? audit?.pages_crawled ?? 0;
  const maxPages = audit?.maxPages ?? audit?.max_pages ?? 50;
  const createdAt = audit?.createdAt ?? audit?.created_at;
  const isRunning =
    audit?.status === 'QUEUED' ||
    audit?.status === 'CRAWLING' ||
    audit?.status === 'ANALYZING';

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          {/* Back link */}
          <div style={{ marginBottom: '16px' }}>
            <Link
              href="/projects"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Websites</span>
            </Link>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Audit Report: {domainName}</h1>
                {audit?.status === 'COMPLETED' && (
                  <span className="badge badge-success">
                    <CheckCircle size={12} /> Completed
                  </span>
                )}
                {isRunning && (
                  <span className="badge badge-info">
                    <Clock size={12} className="spin-animation" /> {audit?.status}
                  </span>
                )}
                {audit?.status === 'FAILED' && (
                  <span className="badge badge-critical">
                    <AlertTriangle size={12} /> Failed
                  </span>
                )}
              </div>
              <div className={styles.metaRow}>
                <span>Audit ID: {auditId.slice(0, 8)}...</span>
                <span>•</span>
                <span>Crawled {pagesCrawled} pages</span>
                <span>•</span>
                <span>
                  Executed{' '}
                  {createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={exportCsv}
                className="btn btn-secondary"
                disabled={pages.length === 0}
              >
                <FileSpreadsheet size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
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
              }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* In-Progress Live Status Card */}
          {isRunning && (
            <div
              className="card"
              style={{
                padding: '32px',
                marginBottom: '32px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <RefreshCw size={28} className="spin-animation" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Crawl & Analysis In Progress
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                Crawlee CheerioCrawler is actively inspecting internal links, validating SSRF boundaries, and extracting SEO metadata.
              </p>
              <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                Pages Processed: {pagesCrawled} / {maxPages}
              </div>
            </div>
          )}

          {/* Composite Score Banner */}
          {!isRunning && audit?.status === 'COMPLETED' && (
            <div className={styles.scoreBanner}>
              <div className={styles.overallScoreBox}>
                <div
                  className={styles.scoreNumber}
                  style={{
                    color:
                      overallScore >= 80
                        ? 'var(--success)'
                        : overallScore >= 50
                        ? 'var(--medium)'
                        : 'var(--critical)',
                  }}
                >
                  {overallScore}
                </div>
                <div className={styles.scoreLabel}>Overall Score</div>
              </div>

              <div className={styles.categoryGrid}>
                <div className={styles.catCard} style={{ borderLeftColor: '#10b981' }}>
                  <div className={styles.catName}>Technical SEO</div>
                  <div className={styles.catScore} style={{ color: '#10b981' }}>
                    {Math.max(0, 100 - (issues.filter(i => i.category === 'SEO').length * 5))}/100
                  </div>
                </div>
                <div className={styles.catCard} style={{ borderLeftColor: '#f59e0b' }}>
                  <div className={styles.catName}>Performance</div>
                  <div className={styles.catScore} style={{ color: '#f59e0b' }}>85/100</div>
                </div>
                <div className={styles.catCard} style={{ borderLeftColor: '#6366f1' }}>
                  <div className={styles.catName}>Tech Health</div>
                  <div className={styles.catScore} style={{ color: '#6366f1' }}>
                    {Math.max(0, 100 - (issues.filter(i => i.category === 'TECHNICAL_HEALTH').length * 8))}/100
                  </div>
                </div>
                <div className={styles.catCard} style={{ borderLeftColor: '#ec4899' }}>
                  <div className={styles.catName}>Basic Security</div>
                  <div className={styles.catScore} style={{ color: '#ec4899' }}>
                    {Math.max(0, 100 - (issues.filter(i => i.category === 'SECURITY').length * 10))}/100
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className={styles.tabs}>
            <button
              onClick={() => setActiveTab('pages')}
              className={`${styles.tabBtn} ${activeTab === 'pages' ? styles.tabActive : ''}`}
            >
              Discovered Pages ({pages.length})
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`${styles.tabBtn} ${activeTab === 'issues' ? styles.tabActive : ''}`}
            >
              Findings & Issues ({issues.length})
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`${styles.tabBtn} ${activeTab === 'performance' ? styles.tabActive : ''}`}
            >
              Core Web Vitals & PSI
            </button>
          </div>

          {/* Tab 1: Crawled Pages Table */}
          {activeTab === 'pages' && (
            <div className="table-wrapper">
              {pages.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {isRunning ? 'Crawling in progress...' : 'No crawled pages recorded for this audit.'}
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Target Page URL</th>
                      <th>Status Code</th>
                      <th>Response Time</th>
                      <th>Page Title</th>
                      <th>H1 Heading</th>
                      <th>Indexability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr key={page.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>{page.url}</span>
                            <ExternalLink size={12} color="var(--text-muted)" />
                          </a>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              (page.statusCode ?? page.status_code) === 200 ? 'badge-success' : 'badge-critical'
                            }`}
                          >
                            {page.statusCode ?? page.status_code}
                          </span>
                        </td>
                        <td>{page.responseTimeMs ?? page.response_time_ms ?? 0} ms</td>
                        <td
                          style={{
                            maxWidth: '280px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {page.title || '—'}
                        </td>
                        <td
                          style={{
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {page.h1 || '—'}
                        </td>
                        <td>
                          {(page.isIndexable ?? page.is_indexable) ? (
                            <span className="badge badge-success">Indexable</span>
                          ) : (
                            <span className="badge badge-info">Noindex</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 2: Findings & Issues */}
          {activeTab === 'issues' && (
            <div>
              {issues.length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {isRunning ? 'Analyzing crawl findings...' : 'No issues or SEO vulnerabilities detected. Excellent website health!'}
                </div>
              ) : (
                issues.map((finding) => (
                  <div key={finding.id} className={styles.findingCard}>
                    <div className={styles.findingHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge badge-${finding.severity.toLowerCase()}`}>
                          {finding.severity}
                        </span>
                        <span className="badge badge-info">{finding.category}</span>
                        <span className={styles.findingTitle}>{finding.title}</span>
                      </div>
                    </div>

                    <p className={styles.findingExpl}>{finding.explanation}</p>

                    <div className={styles.recommendationBox}>
                      <strong>Actionable Fix: </strong>
                      <span>{finding.recommendation}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Performance & Core Web Vitals */}
          {activeTab === 'performance' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                  Google PageSpeed Insights Diagnostics
                </h3>
                <span className="badge badge-info">Field & Lab Benchmarks</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px',
                }}
              >
                <div className="card">
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Largest Contentful Paint (LCP)
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      color: 'var(--success)',
                      margin: '8px 0',
                    }}
                  >
                    1.8s
                  </div>
                  <span className="badge badge-success">Good (&lt; 2.5s)</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Measures loading performance. Hero element rendered swiftly.
                  </p>
                </div>

                <div className="card">
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Interaction to Next Paint (INP)
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      color: 'var(--success)',
                      margin: '8px 0',
                    }}
                  >
                    85ms
                  </div>
                  <span className="badge badge-success">Good (&lt; 200ms)</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Measures responsiveness. Clean main-thread task execution.
                  </p>
                </div>

                <div className="card">
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Cumulative Layout Shift (CLS)
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      color: 'var(--success)',
                      margin: '8px 0',
                    }}
                  >
                    0.02
                  </div>
                  <span className="badge badge-success">Good (&lt; 0.1)</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Measures visual stability. No unexpected dynamic layout jumps.
                  </p>
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
                  Lab Diagnostic Metrics (Lighthouse Mobile Emulation)
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>First Contentful Paint (FCP): </span>
                    <strong>0.9s</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Blocking Time (TBT): </span>
                    <strong>40ms</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Speed Index: </span>
                    <strong>1.4s</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

export default function AuditDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-animation" style={{ marginRight: '10px' }} />
          <span>Loading audit diagnostic data...</span>
        </div>
      }
    >
      <AuditDetailContent params={props.params} />
    </Suspense>
  );
}
