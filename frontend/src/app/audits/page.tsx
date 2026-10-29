'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSearch,
  Play,
  RotateCw,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Globe,
  Sliders,
  ChevronRight,
  Shield,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import {
  getProjects,
  getAudits,
  triggerAudit,
  getDashboardSummary,
  getAuditIssues,
  DashboardSummaryData,
} from '../../lib/api';
import { Project, AuditJob, Issue } from '@sitescope/shared';
import styles from './page.module.css';

export default function TechnicalSeoAuditsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Audits history
  const [audits, setAudits] = useState<(AuditJob & { projects?: { name: string; domain: string } })[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(true);

  // SEO Metrics & Summary
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);

  // Issues breakdown
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Trigger Audit Dialog/Form State
  const [showRunAuditForm, setShowRunAuditForm] = useState(false);
  const [maxPages, setMaxPages] = useState<number>(50);
  const [crawlDepth, setCrawlDepth] = useState<number>(3);
  const [enableJs, setEnableJs] = useState<boolean>(false);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

  // Global Feedback
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // 1. Initial Load: Fetch Projects
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      const res = await getProjects();
      if (!isMounted) return;

      if (res.success && res.data?.items) {
        setProjects(res.data.items);
        if (res.data.items.length > 0) {
          setSelectedProjectId(res.data.items[0].id);
        } else {
          setIsLoadingAudits(false);
        }
      } else if (res.error) {
        setFeedback({
          type: 'error',
          message: res.error.message || 'Failed to load authorized projects.',
        });
        setIsLoadingAudits(false);
      }
    }

    loadProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Audits & Summary for Selected Project
  const loadProjectData = useCallback(async (projectId: string) => {
    setIsLoadingAudits(true);
    setFeedback(null);

    const [auditsRes, summaryRes] = await Promise.all([
      getAudits({ projectId, limit: 20 }),
      getDashboardSummary(projectId),
    ]);

    if (auditsRes.success && auditsRes.data?.items) {
      setAudits(auditsRes.data.items);

      // If the latest audit is completed, fetch its issue breakdown
      const latestCompleted = auditsRes.data.items.find(
        (a) => a.status === 'COMPLETED'
      );
      if (latestCompleted) {
        const issuesRes = await getAuditIssues(latestCompleted.id, { page: 1, limit: 50 });
        if (issuesRes.success && issuesRes.data?.items) {
          // Filter out issues that belong to SEO or TECHNICAL_HEALTH categories
          const seoIssues = issuesRes.data.items.filter(
            (i) => i.category === 'SEO' || i.category === 'TECHNICAL_HEALTH'
          );
          setIssues(seoIssues.length > 0 ? seoIssues : issuesRes.data.items);
        }
      } else {
        setIssues([]);
      }
    } else if (auditsRes.error) {
      setAudits([]);
      setFeedback({
        type: 'error',
        message: auditsRes.error.message || 'Could not load project audit history.',
      });
    }

    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data);
    }

    setIsLoadingAudits(false);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectData]);

  // 3. Poll for Active Audits (QUEUED, CRAWLING, ANALYZING)
  useEffect(() => {
    const hasActiveAudits = audits.some((a) =>
      ['QUEUED', 'CRAWLING', 'ANALYZING', 'VALIDATING', 'FINALIZING'].includes(a.status)
    );

    if (!hasActiveAudits || !selectedProjectId) return;

    const timer = setTimeout(() => {
      loadProjectData(selectedProjectId);
    }, 4000);

    return () => clearTimeout(timer);
  }, [audits, selectedProjectId, loadProjectData]);

  // Handle Trigger Audit
  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setFeedback({ type: 'error', message: 'Please select an authorized website project.' });
      return;
    }

    setIsSubmittingAudit(true);
    setFeedback(null);

    const selectedProj = projects.find((p) => p.id === selectedProjectId);
    const domainToCheck = selectedProj?.domain || '';

    // Frontend SSRF sanity check
    if (
      domainToCheck.includes('localhost') ||
      domainToCheck.includes('127.0.0.1') ||
      domainToCheck.includes('169.254.')
    ) {
      setFeedback({
        type: 'error',
        message: 'Disallowed destination: Localhost and cloud metadata addresses cannot be audited.',
      });
      setIsSubmittingAudit(false);
      return;
    }

    const res = await triggerAudit({
      projectId: selectedProjectId,
      maxPages,
      crawlDepth,
      enableJs,
    });

    if (res.success && res.data) {
      setFeedback({
        type: 'success',
        message: `Audit successfully enqueued (Job ID: ${res.data.id}). Crawling in progress.`,
      });
      setShowRunAuditForm(false);
      // Refresh audit list immediately
      loadProjectData(selectedProjectId);
    } else {
      setFeedback({
        type: 'error',
        message: res.error?.message || 'Failed to start audit job.',
      });
    }

    setIsSubmittingAudit(false);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Filtered audits based on status
  const filteredAudits = audits.filter((audit) => {
    if (statusFilter === 'ALL') return true;
    return audit.status === statusFilter;
  });

  // Filtered issues based on severity
  const filteredIssues = issues.filter((issue) => {
    if (issueFilter === 'ALL') return true;
    return issue.severity === issueFilter;
  });

  const latestAudit = audits[0];

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Technical SEO Audits</h1>
              <p className={styles.subtitle}>
                Identify technical SEO issues, monitor website health, and improve search engine discoverability.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => selectedProjectId && loadProjectData(selectedProjectId)}
                disabled={isLoadingAudits}
                title="Refresh audit data"
              >
                <RotateCw size={14} className={isLoadingAudits ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowRunAuditForm(!showRunAuditForm)}
                disabled={projects.length === 0}
              >
                <Play size={15} />
                <span>Run New Audit</span>
              </button>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`${styles.feedback} ${
                feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess
              }`}
            >
              {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Website and Project Selection */}
          {projects.length > 0 ? (
            <div className={styles.projectSelectorBar}>
              <div className={styles.selectorLeft}>
                <Globe size={18} style={{ color: 'var(--primary)' }} />
                <label htmlFor="project-select" className={styles.label} style={{ marginBottom: 0 }}>
                  Active Project:
                </label>
                <select
                  id="project-select"
                  className={styles.projectSelect}
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.domain})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject && (
                <div className={styles.projectMeta}>
                  <span className={styles.metaItem}>
                    <strong>Domain:</strong> {selectedProject.domain}
                  </span>
                  <span>•</span>
                  <span className={styles.metaItem}>
                    <strong>Latest Status:</strong>{' '}
                    {latestAudit ? (
                      <span className={`badge ${latestAudit.status === 'COMPLETED' ? 'badge-success' : latestAudit.status === 'FAILED' ? 'badge-critical' : 'badge-low'}`}>
                        {latestAudit.status}
                      </span>
                    ) : (
                      'No audits run'
                    )}
                  </span>
                  {latestAudit?.created_at && (
                    <>
                      <span>•</span>
                      <span className={styles.metaItem}>
                        <strong>Last Audited:</strong> {new Date(latestAudit.created_at).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : !isLoadingAudits ? (
            <div className={styles.section}>
              <div className={styles.emptyState}>
                <Globe size={40} style={{ color: 'var(--text-muted)' }} />
                <h3 className={styles.emptyStateTitle}>No Projects Registered</h3>
                <p className={styles.emptyStateText}>
                  You do not have any registered websites yet. Add a website to start running Technical SEO audits.
                </p>
                <Link href="/projects" className="btn btn-primary">
                  Register Your First Website
                </Link>
              </div>
            </div>
          ) : null}

          {/* Run New Audit Form Drawer/Card */}
          {showRunAuditForm && (
            <div className={styles.runAuditCard}>
              <div className={styles.runAuditTitle}>Run New Technical SEO Audit</div>
              <p className={styles.runAuditDesc}>
                Configure crawler parameters for <strong>{selectedProject?.domain}</strong>. Outbound requests are protected against SSRF and respect domain boundaries.
              </p>

              <form onSubmit={handleStartAudit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max Pages to Crawl</label>
                    <select
                      className={styles.select}
                      value={maxPages}
                      onChange={(e) => setMaxPages(Number(e.target.value))}
                    >
                      <option value={10}>10 Pages (Quick Audit)</option>
                      <option value={25}>25 Pages</option>
                      <option value={50}>50 Pages (Standard)</option>
                      <option value={100}>100 Pages</option>
                      <option value={250}>250 Pages (Deep Audit)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Crawl Depth Limit</label>
                    <select
                      className={styles.select}
                      value={crawlDepth}
                      onChange={(e) => setCrawlDepth(Number(e.target.value))}
                    >
                      <option value={1}>1 Level (Homepage only)</option>
                      <option value={2}>2 Levels</option>
                      <option value={3}>3 Levels (Standard)</option>
                      <option value={5}>5 Levels (Deep)</option>
                    </select>
                  </div>

                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="enableJs"
                      className={styles.checkbox}
                      checked={enableJs}
                      onChange={(e) => setEnableJs(e.target.checked)}
                    />
                    <label htmlFor="enableJs" className={styles.checkboxLabel}>
                      Enable Playwright Headless Browser (JS Rendering)
                    </label>
                  </div>
                </div>

                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowRunAuditForm(false)}
                    disabled={isSubmittingAudit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingAudit}
                  >
                    {isSubmittingAudit ? (
                      <>
                        <RotateCw size={14} className="spin" />
                        <span>Enqueueing Audit...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        <span>Start Audit Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SEO Summary Metrics */}
          {selectedProjectId && (
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Technical SEO Score</span>
                <span
                  className={styles.kpiValue}
                  style={{
                    color:
                      (summary?.categoryScores?.seo || 0) >= 80
                        ? 'var(--success)'
                        : (summary?.categoryScores?.seo || 0) >= 50
                        ? 'var(--medium)'
                        : 'var(--critical)',
                  }}
                >
                  {summary?.categoryScores?.seo ? `${summary.categoryScores.seo}/100` : '—'}
                </span>
                <span className={styles.kpiFooter}>Overall site health: {summary?.overallScore || 0}/100</span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Pages Crawled</span>
                <span className={styles.kpiValue}>
                  {latestAudit?.pages_crawled ?? summary?.kpi?.totalPagesCrawled ?? 0}
                </span>
                <span className={styles.kpiFooter}>Limit: {latestAudit?.max_pages ?? 50} pages</span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Critical SEO Issues</span>
                <span className={styles.kpiValue} style={{ color: 'var(--critical)' }}>
                  {summary?.kpi?.criticalIssuesCount ?? 0}
                </span>
                <span className={styles.kpiFooter}>Requires immediate fix</span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Warnings & Medium</span>
                <span className={styles.kpiValue} style={{ color: 'var(--medium)' }}>
                  {(summary?.kpi?.highIssuesCount ?? 0) + (summary?.kpi?.mediumIssuesCount ?? 0)}
                </span>
                <span className={styles.kpiFooter}>High & medium severity</span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Daily Audits Remaining</span>
                <span className={styles.kpiValue} style={{ color: 'var(--primary)' }}>
                  {summary?.kpi?.dailyAuditsRemaining ?? 3}
                </span>
                <span className={styles.kpiFooter}>Out of {summary?.kpi?.dailyAuditsLimit ?? 3} daily limit</span>
              </div>
            </div>
          )}

          {/* Audit History Table */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <FileSearch size={18} />
                  <span>Audit History</span>
                </h2>
                <p className={styles.sectionDesc}>
                  Chronological list of website crawls and SEO diagnostic audits.
                </p>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className={styles.select}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CRAWLING">Crawling</option>
                  <option value="QUEUED">Queued</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>

            {isLoadingAudits ? (
              <div style={{ textAlign: 'center', padding: '36px' }}>
                <RotateCw size={24} className="spin" style={{ color: 'var(--primary)' }} />
                <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Loading audits...
                </p>
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className={styles.emptyState}>
                <FileSearch size={32} style={{ color: 'var(--text-muted)' }} />
                <h4 className={styles.emptyStateTitle}>No Audits Found</h4>
                <p className={styles.emptyStateText}>
                  {statusFilter !== 'ALL'
                    ? `No audits with status "${statusFilter}".`
                    : 'No audits have been executed for this website yet. Click "Run New Audit" above to launch a crawl.'}
                </p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Website Domain</th>
                      <th className={styles.th}>Audit Date</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Health Score</th>
                      <th className={styles.th}>Pages Crawled</th>
                      <th className={styles.th}>Config</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudits.map((a) => {
                      const isDone = a.status === 'COMPLETED';
                      const isRunning = ['QUEUED', 'CRAWLING', 'ANALYZING', 'VALIDATING'].includes(a.status);
                      const isFailed = a.status === 'FAILED';

                      return (
                        <tr key={a.id} className={styles.tr}>
                          <td className={styles.td}>
                            <strong>{a.projects?.domain || selectedProject?.domain || 'Website'}</strong>
                          </td>
                          <td className={styles.td}>
                            {a.created_at ? new Date(a.created_at).toLocaleString() : 'Just now'}
                          </td>
                          <td className={styles.td}>
                            {isDone && (
                              <span className="badge badge-success">
                                <CheckCircle size={12} /> Completed
                              </span>
                            )}
                            {isRunning && (
                              <span className="badge badge-low">
                                <Clock size={12} className="spin" /> {a.status}
                              </span>
                            )}
                            {isFailed && (
                              <span className="badge badge-critical">
                                <AlertTriangle size={12} /> Failed
                              </span>
                            )}
                          </td>
                          <td className={styles.td}>
                            {a.overall_score !== null && a.overall_score !== undefined ? (
                              <strong
                                style={{
                                  color:
                                    a.overall_score >= 80
                                      ? 'var(--success)'
                                      : a.overall_score >= 50
                                      ? 'var(--medium)'
                                      : 'var(--critical)',
                                }}
                              >
                                {a.overall_score}/100
                              </strong>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className={styles.td}>
                            {a.pages_crawled || 0} / {a.max_pages || 50}
                          </td>
                          <td className={styles.td}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Depth: {a.config?.crawlDepth ?? 3} | JS: {a.config?.enableJs ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className={styles.td} style={{ textAlign: 'right' }}>
                            <Link
                              href={`/audits/${a.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>View Details</span>
                              <ExternalLink size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Technical SEO Issue Breakdown */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <AlertTriangle size={18} />
                  <span>Technical SEO Issue Breakdown</span>
                </h2>
                <p className={styles.sectionDesc}>
                  Real-time issues detected by the crawler and SEO scoring rules engine on the latest crawl.
                </p>
              </div>

              {/* Severity filter chips */}
              <div className={styles.issueFilterBar}>
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                  <button
                    key={sev}
                    className={`${styles.filterChip} ${issueFilter === sev ? styles.filterChipActive : ''}`}
                    onClick={() => setIssueFilter(sev)}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className={styles.emptyState}>
                <CheckCircle size={36} style={{ color: 'var(--success)' }} />
                <h4 className={styles.emptyStateTitle}>
                  {issueFilter !== 'ALL'
                    ? `No ${issueFilter} SEO issues detected`
                    : 'No Technical SEO issues found'}
                </h4>
                <p className={styles.emptyStateText}>
                  {audits.length === 0
                    ? 'Run your first audit to evaluate technical SEO factors like title tags, meta descriptions, canonical URLs, robots directives, and broken links.'
                    : 'All evaluated SEO checks passed or no issues match the current filter.'}
                </p>
              </div>
            ) : (
              <div className={styles.issueList}>
                {filteredIssues.map((issue) => (
                  <div key={issue.id} className={styles.issueCard}>
                    <div className={styles.issueTopRow}>
                      <div className={styles.issueTitle}>
                        <span
                          className={`badge ${
                            issue.severity === 'CRITICAL'
                              ? 'badge-critical'
                              : issue.severity === 'HIGH'
                              ? 'badge-high'
                              : issue.severity === 'MEDIUM'
                              ? 'badge-medium'
                              : 'badge-low'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span>{issue.title}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Score Impact: <strong>{issue.scoreImpact || -5} pts</strong>
                        </span>
                        {latestAudit && (
                          <Link
                            href={`/audits/${latestAudit.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            Inspect Affected URLs
                            <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>

                    <p className={styles.issueExplanation}>{issue.explanation}</p>

                    {issue.recommendation && (
                      <div className={styles.issueRecommendation}>
                        <strong>Recommendation:</strong> {issue.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
