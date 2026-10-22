'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import styles from './page.module.css';

interface ProjectItem {
  id: string;
  name: string;
  domain: string;
  normalizedUrl: string;
  isVerified: boolean;
  score: number;
  lastAudit: string;
  status: 'IDLE' | 'CRAWLING' | 'COMPLETED';
}

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'proj_1',
    name: 'Main Platform',
    domain: 'sitescope.io',
    normalizedUrl: 'https://sitescope.io',
    isVerified: true,
    score: 84,
    lastAudit: '2 hours ago',
    status: 'COMPLETED',
  },
  {
    id: 'proj_2',
    name: 'E-commerce Demo Store',
    domain: 'example-store.com',
    normalizedUrl: 'https://example-store.com',
    isVerified: true,
    score: 76,
    lastAudit: '1 day ago',
    status: 'COMPLETED',
  },
  {
    id: 'proj_3',
    name: 'Engineering Tech Blog',
    domain: 'tech-blog-demo.dev',
    normalizedUrl: 'https://tech-blog-demo.dev',
    isVerified: false,
    score: 91,
    lastAudit: '2 days ago',
    status: 'COMPLETED',
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [projectName, setProjectName] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Client-side pre-flight validation
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const raw = domainInput.trim().toLowerCase();
    if (!raw) {
      setFeedback({ type: 'error', message: 'Please enter a valid website domain or URL.' });
      return;
    }

    // Client-side quick SSRF check
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

    let normalized = raw;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    try {
      const parsed = new URL(normalized);
      const newProj: ProjectItem = {
        id: `proj_${Date.now()}`,
        name: projectName || parsed.hostname,
        domain: parsed.hostname,
        normalizedUrl: normalized,
        isVerified: false,
        score: 100,
        lastAudit: 'Never',
        status: 'IDLE',
      };

      setProjects([newProj, ...projects]);
      setProjectName('');
      setDomainInput('');
      setFeedback({ type: 'success', message: `Website "${parsed.hostname}" added successfully.` });
    } catch {
      setFeedback({ type: 'error', message: 'Invalid URL format. Please enter e.g. example.com' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunAudit = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'CRAWLING' as const } : p))
    );

    // Simulate crawl progression
    setTimeout(() => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'COMPLETED' as const, lastAudit: 'Just now', score: 86 } : p
        )
      );
    }, 4000);
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

          {/* Project List */}
          <div className={styles.projectGrid}>
            {projects.map((project) => (
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
                    <div className={styles.scoreLabel}>Health Score</div>
                    <div
                      className={styles.scoreValue}
                      style={{
                        color:
                          project.score >= 80
                            ? 'var(--success)'
                            : project.score >= 50
                            ? 'var(--medium)'
                            : 'var(--critical)',
                      }}
                    >
                      {project.score}/100
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={styles.scoreLabel}>Last Audit</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {project.lastAudit}
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.auditMeta}>
                    {project.status === 'CRAWLING' ? (
                      <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} className="animate-spin" /> Crawling pages...
                      </span>
                    ) : (
                      <span>Free Quota: 3 audits/day</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRunAudit(project.id)}
                      className="btn btn-secondary btn-sm"
                      disabled={project.status === 'CRAWLING'}
                    >
                      <Play size={14} />
                      <span>{project.status === 'CRAWLING' ? 'Running...' : 'Run Audit'}</span>
                    </button>
                    <Link href={`/audits/${project.id}`} className="btn btn-primary btn-sm">
                      <span>Report</span>
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
