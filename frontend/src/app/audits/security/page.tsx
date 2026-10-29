'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Play,
  RotateCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Lock,
  Globe,
  ExternalLink,
  Info,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Navbar } from '../../../components/common/Navbar';
import { Footer } from '../../../components/common/Footer';
import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import {
  getProjects,
  getAudits,
  triggerAudit,
  getDashboardSummary,
  getAuditIssues,
  DashboardSummaryData,
} from '../../../lib/api';
import { Project, AuditJob, Issue } from '@sitescope/shared';
import styles from './page.module.css';

export default function SecurityAuditsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Audits & Summary
  const [audits, setAudits] = useState<(AuditJob & { projects?: { name: string; domain: string } })[]>([]);
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [securityIssues, setSecurityIssues] = useState<Issue[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
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

  // 2. Fetch Security Data for Selected Project
  const loadSecurityData = useCallback(async (projectId: string) => {
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
        // Fetch Security issues specifically
        const issuesRes = await getAuditIssues(latestCompleted.id, {
          category: 'SECURITY',
          page: 1,
          limit: 50,
        });

        if (issuesRes.success && issuesRes.data?.items) {
          setSecurityIssues(issuesRes.data.items);
        } else {
          setSecurityIssues([]);
        }
      } else {
        setSecurityIssues([]);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadSecurityData(selectedProjectId);
    }
  }, [selectedProjectId, loadSecurityData]);

  // Handle Trigger Security Audit
  const handleTriggerAudit = async () => {
    if (!selectedProjectId) return;
    setIsTriggering(true);
    setFeedback(null);

    const res = await triggerAudit({
      projectId: selectedProjectId,
      maxPages: 50,
      crawlDepth: 3,
      enableJs: false,
    });

    if (res.success && res.data) {
      setFeedback({
        type: 'success',
        message: `Security audit queued (Job ID: ${res.data.id}). Evaluating security posture...`,
      });
      loadSecurityData(selectedProjectId);
    } else {
      setFeedback({
        type: 'error',
        message: res.error?.message || 'Failed to initiate security audit.',
      });
    }

    setIsTriggering(false);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const secScore = summary?.categoryScores?.security ?? 100;
  const isHealthy = secScore >= 80;
  const isMedium = secScore >= 50 && secScore < 80;

  // Filter issues by severity
  const filteredIssues = securityIssues.filter((i) => {
    if (severityFilter === 'ALL') return true;
    return i.severity === severityFilter;
  });

  const criticalCount = securityIssues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = securityIssues.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = securityIssues.filter((i) => i.severity === 'MEDIUM').length;

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Website Security Audits</h1>
              <p className={styles.subtitle}>
                Identify security misconfigurations, missing protective headers, and protocol weaknesses.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => selectedProjectId && loadSecurityData(selectedProjectId)}
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
                <ShieldCheck size={14} />
                <span>{isTriggering ? 'Running...' : 'Run Security Audit'}</span>
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
                    <Lock size={14} style={{ color: selectedProject.normalized_url?.startsWith('https') ? 'var(--success)' : 'var(--critical)' }} />
                    <span>{selectedProject.normalized_url?.startsWith('https') ? 'TLS/HTTPS Target' : 'Unencrypted HTTP Target'}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Security Scope & Limitation Notice */}
          <div className={styles.scopeAlert}>
            <strong>Passive Inspection Scope:</strong> SiteScope verifies observable web surface hygiene, including
            HTTPS protocol enforcement, HTTP response security headers, and content exposure. It does not perform
            destructive penetration tests or internal infrastructure exploitation.
          </div>

          {/* Overall Security Rating Hero Banner */}
          <div className={styles.heroBanner}>
            <div className={styles.scoreCircle}>
              <span
                className={styles.scoreNumber}
                style={{
                  color: isHealthy ? 'var(--success)' : isMedium ? 'var(--medium)' : 'var(--critical)',
                }}
              >
                {secScore}/100
              </span>
              <span className={styles.scoreLabel}>Security Rating</span>
            </div>

            <div className={styles.bannerDetails}>
              <div className={styles.bannerTitle}>
                {secScore >= 90
                  ? 'Strong Security Hygiene'
                  : secScore >= 70
                  ? 'Moderate Security — Protective Measures Needed'
                  : 'High Risk — Security Deficiencies Detected'}
              </div>
              <p className={styles.bannerText}>
                Evaluated against OWASP web hygiene recommendations. A higher rating reflects enforced HTTPS
                encryption, absence of mixed content, and proactive response header security.
              </p>
            </div>
          </div>

          {/* Severity Cards Grid */}
          <div className={styles.severityGrid}>
            <div className={styles.severityCard}>
              <span className={styles.severityLabel} style={{ color: 'var(--critical)' }}>
                Critical Vulnerabilities
              </span>
              <div className={styles.severityCount}>{criticalCount}</div>
              <span className={styles.severityDesc}>Immediate exploit exposure</span>
            </div>

            <div className={styles.severityCard}>
              <span className={styles.severityLabel} style={{ color: 'var(--high, #f97316)' }}>
                High Severity Flaws
              </span>
              <div className={styles.severityCount}>{highCount}</div>
              <span className={styles.severityDesc}>Protocol & transport weaknesses</span>
            </div>

            <div className={styles.severityCard}>
              <span className={styles.severityLabel} style={{ color: 'var(--medium)' }}>
                Medium Warnings
              </span>
              <div className={styles.severityCount}>{mediumCount}</div>
              <span className={styles.severityDesc}>Protective header omissions</span>
            </div>

            <div className={styles.severityCard}>
              <span className={styles.severityLabel} style={{ color: 'var(--primary)' }}>
                Total Security Checks
              </span>
              <div className={styles.severityCount}>8 Checks</div>
              <span className={styles.severityDesc}>Automated rule coverage</span>
            </div>
          </div>

          {/* Security Findings & Remediation Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <ShieldAlert size={18} />
                  <span>Security Vulnerabilities & Findings</span>
                </h2>
                <p className={styles.sectionDesc}>
                  Issues identified during website crawling with actionable remediation guidance.
                </p>
              </div>

              {/* Severity filter chips */}
              <div className={styles.filterBar}>
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                  <button
                    key={sev}
                    className={`${styles.filterChip} ${severityFilter === sev ? styles.filterChipActive : ''}`}
                    onClick={() => setSeverityFilter(sev)}
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
                  {severityFilter !== 'ALL'
                    ? `No ${severityFilter} security vulnerabilities identified`
                    : 'No Security Vulnerabilities Detected'}
                </h4>
                <p className={styles.emptyStateText}>
                  {audits.length === 0
                    ? 'Run a security audit to inspect website encryption, response headers, and transport protocol security.'
                    : 'No security issues match your current filter. Your audited pages satisfy active security checks.'}
                </p>
              </div>
            ) : (
              <div className={styles.findingsList}>
                {filteredIssues.map((issue) => (
                  <div key={issue.id} className={styles.findingCard}>
                    <div className={styles.findingHeader}>
                      <div className={styles.findingTitle}>
                        <span
                          className={`badge ${
                            issue.severity === 'CRITICAL'
                              ? 'badge-critical'
                              : issue.severity === 'HIGH'
                              ? 'badge-high'
                              : 'badge-medium'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span>{issue.title}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Score Impact: <strong>{issue.scoreImpact || -5} pts</strong>
                        </span>
                        {audits[0] && (
                          <Link
                            href={`/audits/${audits[0].id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            Inspect Affected URLs
                            <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>

                    <p className={styles.findingDesc}>{issue.explanation}</p>

                    {issue.recommendation && (
                      <div className={styles.remediationBox}>
                        <strong>Remediation Guidance:</strong> {issue.recommendation}
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
