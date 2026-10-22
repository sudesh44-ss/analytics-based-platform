'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Plus,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import { getProjects, createProject, triggerAudit } from '../../lib/api';
import { Project } from '@sitescope/shared';
import styles from './page.module.css';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [runningAuditIds, setRunningAuditIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Load projects from Fastify API
  const loadProjects = async () => {
    setIsLoading(true);
    const res = await getProjects();
    if (res.success && res.data?.items) {
      setProjects(res.data.items);
    } else if (res.error) {
      setFeedback({
        type: 'error',
        message: res.error.message || 'Failed to load projects from server.',
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Submit new project to backend API with SSRF check
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const raw = domainInput.trim().toLowerCase();
    if (!raw) {
      setFeedback({ type: 'error', message: 'Please enter a valid website domain or URL.' });
      return;
    }

    // Client-side quick pre-flight check
    if (
      raw.includes('localhost') ||
      raw.includes('127.0.0.1') ||
      raw.includes('169.254.') ||
      raw.includes('10.') ||
      raw.includes('192.168.')
    ) {
      setFeedback({
        type: 'error',
        message: 'Security Notice: Localhost, private networks, and internal cloud metadata addresses cannot be audited.',
      });
      return;
    }

    setIsSubmitting(true);

    const res = await createProject({
      name: projectName || raw,
      domain: raw,
    });

    if (res.success && res.data) {
      setProjects([res.data, ...projects]);
      setProjectName('');
      setDomainInput('');
      setFeedback({
        type: 'success',
        message: `Website "${res.data.domain}" registered successfully.`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error?.message || 'Failed to register website destination.',
      });
    }

    setIsSubmitting(false);
  };

  // Trigger real audit execution through BullMQ worker
  const handleRunAudit = async (projectId: string) => {
    setRunningAuditIds((prev) => new Set(prev).add(projectId));
    setFeedback(null);

    const res = await triggerAudit({
      projectId,
      maxPages: 50,
      crawlDepth: 3,
    });

    if (res.success && res.data) {
      const auditJob = res.data;
      setFeedback({
        type: 'success',
        message: `Audit job queued successfully. Navigating to live report...`,
      });
      // Redirect to the live audit report
      setTimeout(() => {
        router.push(`/audits/${auditJob.id}`);
      }, 1000);
    } else {
      setFeedback({
        type: 'error',
        message: res.error?.message || 'Failed to queue audit job. Daily quota may be exceeded.',
      });
      setRunningAuditIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Websites & Projects</h1>
              <p className={styles.subtitle}>
                Manage monitored domains, configure audit frequency, and view health benchmarks.
              </p>
            </div>
            <button
              onClick={loadProjects}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Add New Website Card */}
          <div className={styles.addProjectCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Add Website for Automated Auditing</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Enter any authorized website URL you own or manage. Public URLs are crawled with full SSRF isolation.
            </p>

            <form onSubmit={handleAddProject} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. My SaaS Company"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Website Domain or URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://example.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Validating...' : 'Add Website'}
              </button>
            </form>

            {feedback && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: feedback.type === 'error' ? 'var(--critical-light)' : 'var(--success-light)',
                  color: feedback.type === 'error' ? 'var(--critical)' : 'var(--success)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${feedback.type === 'error' ? 'var(--critical-border)' : 'var(--success-border)'}`,
                }}
              >
                {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={18} className="spin-animation" style={{ marginRight: '8px' }} />
              <span>Fetching registered websites...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && projects.length === 0 && (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <Globe size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No Websites Registered</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Use the form above to add a website and launch your first comprehensive audit.
              </p>
            </div>
          )}

          {/* Project List */}
          {!isLoading && projects.length > 0 && (
            <div className={styles.projectGrid}>
              {projects.map((project) => {
                const isRunning = runningAuditIds.has(project.id);

                return (
                  <div key={project.id} className={styles.projectCard}>
                    <div className={styles.projectHeader}>
                      <div>
                        <div className={styles.domainName}>{project.domain}</div>
                        <div className={styles.projectUrl}>{project.name}</div>
                      </div>
                      {project.isVerified ? (
                        <span className="badge badge-success">
                          <Shield size={12} /> Verified
                        </span>
                      ) : (
                        <span className="badge badge-info">Unverified</span>
                      )}
                    </div>

                    <div className={styles.scoreRow}>
                      <div>
                        <div className={styles.scoreLabel}>Target Origin</div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginTop: '2px',
                          }}
                        >
                          {project.normalized_url || project.normalizedUrl || project.domain}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={styles.scoreLabel}>Registered</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {project.created_at || project.createdAt
                            ? new Date(project.created_at || project.createdAt!).toLocaleDateString()
                            : 'Recently'}
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.auditMeta}>
                        {isRunning ? (
                          <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} className="spin-animation" /> Queueing crawl...
                          </span>
                        ) : (
                          <span>Free Quota: 3 audits/day</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleRunAudit(project.id)}
                          className="btn btn-secondary btn-sm"
                          disabled={isRunning}
                        >
                          <Play size={14} />
                          <span>{isRunning ? 'Queueing...' : 'Run Audit'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
