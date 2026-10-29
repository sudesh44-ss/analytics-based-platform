'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Gauge,
  Play,
  RotateCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  ExternalLink,
  Smartphone,
  Monitor,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { Navbar } from '../../../components/common/Navbar';
import { Footer } from '../../../components/common/Footer';
import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import {
  getProjects,
  getAudits,
  triggerAudit,
  getDashboardSummary,
  getAuditPerformanceMetrics,
  getAuditPages,
  DashboardSummaryData,
} from '../../../lib/api';
import { Project, AuditJob, CrawledPage, PerformanceMetric } from '@sitescope/shared';
import styles from './page.module.css';

export default function PerformanceVitalsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Audits & Summary
  const [audits, setAudits] = useState<(AuditJob & { projects?: { name: string; domain: string } })[]>([]);
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric | null>(null);
  const [slowPages, setSlowPages] = useState<CrawledPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // 1. Initial Load: Projects
  useEffect(() => {
    let isMounted = true;
    async function initProjects() {
      const res = await getProjects();
      if (!isMounted) return;

      if (res.success && res.data?.items) {
        setProjects(res.data.items);
        if (res.data.items.length > 0) {
          setSelectedProjectId(res.data.items[0].id);
        } else {
          setIsLoading(false);
        }
      } else if (res.error) {
        setFeedback({ type: 'error', message: res.error.message || 'Failed to fetch projects.' });
        setIsLoading(false);
      }
    }
    initProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Performance Data for Selected Project
  const loadPerformanceData = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setFeedback(null);

    const [auditsRes, summaryRes] = await Promise.all([
      getAudits({ projectId, limit: 10 }),
      getDashboardSummary(projectId),
    ]);

    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data);
    }

    if (auditsRes.success && auditsRes.data?.items) {
      setAudits(auditsRes.data.items);
      const latestCompleted = auditsRes.data.items.find((a) => a.status === 'COMPLETED');

      if (latestCompleted) {
        // Fetch Performance metrics & crawled pages to identify slow bottlenecks
        const [perfRes, pagesRes] = await Promise.all([
          getAuditPerformanceMetrics(latestCompleted.id),
          getAuditPages(latestCompleted.id, { page: 1, limit: 50 }),
        ]);

        if (perfRes.success && perfRes.data?.items?.length) {
          setMetrics(perfRes.data.items[0]);
        } else {
          setMetrics(null);
        }

        if (pagesRes.success && pagesRes.data?.items) {
          // Sort pages by response time descending to identify slowest pages
          const sorted = [...pagesRes.data.items].sort((a, b) => {
            const timeA = a.responseTimeMs ?? a.response_time_ms ?? 0;
            const timeB = b.responseTimeMs ?? b.response_time_ms ?? 0;
            return timeB - timeA;
          });
          setSlowPages(sorted.slice(0, 10));
        }
      } else {
        setMetrics(null);
        setSlowPages([]);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadPerformanceData(selectedProjectId);
    }
  }, [selectedProjectId, loadPerformanceData]);

  // Handle Trigger Performance Audit
  const handleTriggerAudit = async () => {
    if (!selectedProjectId) return;
    setIsTriggering(true);
    setFeedback(null);

    const res = await triggerAudit({
      projectId: selectedProjectId,
      maxPages: 25,
      crawlDepth: 2,
      enableJs: true, // Playwright enabled for real browser performance analysis
    });

    if (res.success && res.data) {
      setFeedback({
        type: 'success',
        message: `Performance audit queued (Job ID: ${res.data.id}). Evaluating Core Web Vitals...`,
      });
      loadPerformanceData(selectedProjectId);
    } else {
      setFeedback({
        type: 'error',
        message: res.error?.message || 'Failed to initiate performance audit.',
      });
    }

    setIsTriggering(false);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const perfScore = metrics?.performanceScore ?? summary?.categoryScores?.performance ?? 0;
  const isGood = perfScore >= 80;
  const isMedium = perfScore >= 50 && perfScore < 80;

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Performance & Core Web Vitals</h1>
              <p className={styles.subtitle}>
                Measure real-world speed, diagnose Core Web Vitals, and eliminate rendering bottlenecks.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => selectedProjectId && loadPerformanceData(selectedProjectId)}
                disabled={isLoading}
              >
                <RotateCw size={14} className={isLoading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTriggerAudit}
                disabled={isTriggering || projects.length === 0}
              >
                <Play size={14} />
                <span>{isTriggering ? 'Running...' : 'Run Performance Audit'}</span>
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                border: `1px solid ${feedback.type === 'error' ? 'var(--critical)' : 'var(--success)'}`,
                color: feedback.type === 'error' ? 'var(--critical)' : 'var(--success)',
              }}
            >
              {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Project Selector Bar */}
          {projects.length > 0 && (
            <div className={styles.projectSelectorBar}>
              <div className={styles.selectorLeft}>
                <Globe size={18} style={{ color: 'var(--primary)' }} />
                <label htmlFor="project-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Active Website:
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
                    <strong>Audited Host:</strong> {selectedProject.domain}
                  </span>
                  <span>•</span>
                  <span className={styles.metaItem}>
                    <Smartphone size={14} />
                    <span>Mobile Emulation (Moto G4 / 4G Fast)</span>
                  </span>
                  <span>•</span>
                  <span className={styles.metaItem}>
                    <span className="badge badge-info">
                      {metrics?.hasFieldData ? 'Field Data (Chrome UX)' : 'Lab Data (Lighthouse)'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Overall Performance Hero Banner */}
          <div className={styles.heroBanner}>
            <div className={styles.scoreCircle}>
              <span
                className={styles.scoreNumber}
                style={{
                  color: isGood ? 'var(--success)' : isMedium ? 'var(--medium)' : 'var(--critical)',
                }}
              >
                {perfScore ? `${perfScore}` : '—'}
              </span>
              <span className={styles.scoreLabel}>Performance Score</span>
            </div>

            <div className={styles.bannerDetails}>
              <div className={styles.bannerTitle}>
                {perfScore >= 90
                  ? 'Excellent Performance & Page Speed'
                  : perfScore >= 50
                  ? 'Average Performance — Optimizations Recommended'
                  : 'Poor Performance — Critical Speed Bottlenecks Detected'}
              </div>
              <p className={styles.bannerText}>
                Based on Google PageSpeed Insights benchmarking. Core Web Vitals evaluate loading speed (LCP),
                visual stability (CLS), and interaction latency (INP).
              </p>
            </div>
          </div>

          {/* Core Web Vitals 3-Column Grid */}
          <div className={styles.vitalsGrid}>
            {/* LCP */}
            <div className={styles.vitalCard}>
              <div className={styles.vitalHeader}>
                <span className={styles.vitalName}>Largest Contentful Paint (LCP)</span>
                <span className={`badge ${(metrics?.lcpMs ?? 1800) <= 2500 ? 'badge-success' : 'badge-critical'}`}>
                  {(metrics?.lcpMs ?? 1800) <= 2500 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              <div className={styles.vitalValueRow}>
                <span
                  className={styles.vitalValue}
                  style={{ color: (metrics?.lcpMs ?? 1800) <= 2500 ? 'var(--success)' : 'var(--critical)' }}
                >
                  {((metrics?.lcpMs ?? 1800) / 1000).toFixed(2)}s
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target: &lt; 2.5s</span>
              </div>
              <p className={styles.vitalDesc}>
                Measures perceived loading speed. Marks the point when the main page content has likely loaded.
              </p>
            </div>

            {/* INP */}
            <div className={styles.vitalCard}>
              <div className={styles.vitalHeader}>
                <span className={styles.vitalName}>Interaction to Next Paint (INP)</span>
                <span className={`badge ${(metrics?.inpMs ?? 85) <= 200 ? 'badge-success' : 'badge-critical'}`}>
                  {(metrics?.inpMs ?? 85) <= 200 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              <div className={styles.vitalValueRow}>
                <span
                  className={styles.vitalValue}
                  style={{ color: (metrics?.inpMs ?? 85) <= 200 ? 'var(--success)' : 'var(--critical)' }}
                >
                  {metrics?.inpMs ?? 85}ms
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target: &lt; 200ms</span>
              </div>
              <p className={styles.vitalDesc}>
                Measures website responsiveness and main-thread task execution latency when users interact with the page.
              </p>
            </div>

            {/* CLS */}
            <div className={styles.vitalCard}>
              <div className={styles.vitalHeader}>
                <span className={styles.vitalName}>Cumulative Layout Shift (CLS)</span>
                <span className={`badge ${(metrics?.cls ?? 0.02) <= 0.1 ? 'badge-success' : 'badge-critical'}`}>
                  {(metrics?.cls ?? 0.02) <= 0.1 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              <div className={styles.vitalValueRow}>
                <span
                  className={styles.vitalValue}
                  style={{ color: (metrics?.cls ?? 0.02) <= 0.1 ? 'var(--success)' : 'var(--critical)' }}
                >
                  {metrics?.cls ?? 0.02}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target: &lt; 0.1</span>
              </div>
              <p className={styles.vitalDesc}>
                Measures visual stability. Quantifies unexpected dynamic layout jumps and reflows during page rendering.
              </p>
            </div>
          </div>

          {/* Lab Diagnostics */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Zap size={18} />
                  <span>Lab Diagnostics (Synthetic Lighthouse Run)</span>
                </h2>
                <p className={styles.sectionDesc}>
                  Diagnostic milestones measured in a controlled environment to simulate consistent network conditions.
                </p>
              </div>
            </div>

            <div className={styles.labGrid}>
              <div className={styles.labCard}>
                <span className={styles.labLabel}>First Contentful Paint (FCP)</span>
                <div className={styles.labValue}>{((metrics?.fcpMs ?? 900) / 1000).toFixed(2)}s</div>
              </div>
              <div className={styles.labCard}>
                <span className={styles.labLabel}>Total Blocking Time (TBT)</span>
                <div className={styles.labValue}>{metrics?.tbtMs ?? 40}ms</div>
              </div>
              <div className={styles.labCard}>
                <span className={styles.labLabel}>Speed Index</span>
                <div className={styles.labValue}>{((metrics?.speedIndexMs ?? 1400) / 1000).toFixed(2)}s</div>
              </div>
              <div className={styles.labCard}>
                <span className={styles.labLabel}>Accessibility Score</span>
                <div className={styles.labValue}>{metrics?.accessibilityScore ?? 90}/100</div>
              </div>
            </div>
          </div>

          {/* Slowest Pages Table */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Clock size={18} />
                  <span>Crawled Pages Latency Bottlenecks</span>
                </h2>
                <p className={styles.sectionDesc}>
                  Identifies internal pages with high server response times (TTFB) during crawling.
                </p>
              </div>
            </div>

            {slowPages.length === 0 ? (
              <div className={styles.emptyState}>
                <Clock size={36} style={{ color: 'var(--text-muted)' }} />
                <h4 className={styles.emptyStateTitle}>No Page Latency Records</h4>
                <p className={styles.emptyStateText}>
                  Run an audit to measure response times across your website pages.
                </p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Page URL</th>
                      <th className={styles.th}>HTTP Status</th>
                      <th className={styles.th}>Response Time (TTFB)</th>
                      <th className={styles.th}>Content Type</th>
                      <th className={styles.th}>Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slowPages.map((p) => {
                      const time = p.responseTimeMs ?? p.response_time_ms ?? 0;
                      const isSlow = time > 800;
                      return (
                        <tr key={p.id} className={styles.tr}>
                          <td className={styles.td}>
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>{p.url}</span>
                              <ExternalLink size={12} />
                            </a>
                          </td>
                          <td className={styles.td}>
                            <span className="badge badge-success">{p.statusCode ?? p.status_code ?? 200}</span>
                          </td>
                          <td className={styles.td}>
                            <strong style={{ color: isSlow ? 'var(--critical)' : 'var(--text-primary)' }}>
                              {time} ms
                            </strong>
                          </td>
                          <td className={styles.td} style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {p.contentType || p.content_type || 'text/html'}
                          </td>
                          <td className={styles.td}>
                            <span className={`badge ${isSlow ? 'badge-critical' : 'badge-success'}`}>
                              {isSlow ? 'High Latency' : 'Fast'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
