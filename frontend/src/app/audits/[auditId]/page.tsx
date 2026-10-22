'use client';

import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Gauge,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import { Navbar } from '../../../components/common/Navbar';
import { Footer } from '../../../components/common/Footer';
import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import styles from './page.module.css';

const SAMPLE_PAGES = [
  {
    url: 'https://sitescope.io',
    statusCode: 200,
    responseTimeMs: 142,
    title: 'SiteScope — Website Analytics & Technical SEO Auditor SaaS',
    h1: 'Audit. Understand. Improve.',
    canonical: 'https://sitescope.io',
    indexable: true,
  },
  {
    url: 'https://sitescope.io/features',
    statusCode: 200,
    responseTimeMs: 168,
    title: 'Platform Features & Capabilities — SiteScope',
    h1: 'Comprehensive Website Diagnostics',
    canonical: 'https://sitescope.io/features',
    indexable: true,
  },
  {
    url: 'https://sitescope.io/pricing',
    statusCode: 200,
    responseTimeMs: 110,
    title: 'Transparent SaaS Pricing & Plans — SiteScope',
    h1: 'Simple, Transparent Pricing',
    canonical: 'https://sitescope.io/pricing',
    indexable: true,
  },
  {
    url: 'https://sitescope.io/docs/quickstart',
    statusCode: 200,
    responseTimeMs: 195,
    title: 'Quickstart Documentation — SiteScope Guide',
    h1: 'Getting Started with Audits',
    canonical: 'https://sitescope.io/docs/quickstart',
    indexable: true,
  },
  {
    url: 'https://sitescope.io/legacy-page',
    statusCode: 404,
    responseTimeMs: 85,
    title: '404 Not Found',
    h1: 'Page Not Found',
    canonical: null,
    indexable: false,
  },
];

const SAMPLE_FINDINGS = [
  {
    id: 'f_1',
    ruleId: 'HEALTH_BROKEN_LINK',
    category: 'TECHNICAL_HEALTH',
    severity: 'HIGH',
    title: 'Broken Internal Link Detected (404 Not Found)',
    explanation: 'A link on your navigation directs users to https://sitescope.io/legacy-page which returns a 404 error.',
    recommendation: 'Update or remove the broken hyperlink reference to preserve link equity and user experience.',
    affectedUrls: ['https://sitescope.io/legacy-page'],
  },
  {
    id: 'f_2',
    ruleId: 'SEO_MISSING_META_DESCRIPTION',
    category: 'SEO',
    severity: 'MEDIUM',
    title: 'Missing Meta Description Tag',
    explanation: 'The page lacks a <meta name="description"> tag. Search engines may generate random snippets in search results.',
    recommendation: 'Add a concise, compelling meta description between 120 and 160 characters.',
    affectedUrls: ['https://sitescope.io/docs/quickstart'],
  },
  {
    id: 'f_3',
    ruleId: 'SEC_HSTS_MISSING',
    category: 'SECURITY',
    severity: 'LOW',
    title: 'Strict-Transport-Security (HSTS) Header Absent',
    explanation: 'The server does not transmit the Strict-Transport-Security HTTP response header.',
    recommendation: 'Configure your web server or CDN to send: Strict-Transport-Security: max-age=31536000; includeSubDomains.',
    affectedUrls: ['https://sitescope.io'],
  },
];

export default function AuditDetailPage() {
  const [activeTab, setActiveTab] = useState<'pages' | 'issues' | 'performance'>('pages');

  const exportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['URL,Status Code,Response Time (ms),Title,Indexable']
        .concat(
          SAMPLE_PAGES.map(
            (p) => `"${p.url}",${p.statusCode},${p.responseTimeMs},"${p.title}",${p.indexable}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sitescope_audit_pages.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          <div className={styles.header}>
            <div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Audit Report: sitescope.io</h1>
                <span className="badge badge-success">
                  <CheckCircle size={12} /> Completed
                </span>
              </div>
              <div className={styles.metaRow}>
                <span>Audit ID: aud_101</span>
                <span>•</span>
                <span>Crawled 482 pages</span>
                <span>•</span>
                <span>Executed Oct 22, 2026 at 07:30 UTC</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={exportCsv} className="btn btn-secondary">
                <FileSpreadsheet size={16} />
                <span>Export CSV</span>
              </button>
              <button className="btn btn-primary">
                <Download size={16} />
                <span>Download PDF Report</span>
              </button>
            </div>
          </div>

          {/* Composite Score Banner */}
          <div className={styles.scoreBanner}>
            <div className={styles.overallScoreBox}>
              <div className={styles.scoreNumber} style={{ color: 'var(--success)' }}>
                84
              </div>
              <div className={styles.scoreLabel}>Overall Score</div>
            </div>

            <div className={styles.categoryGrid}>
              <div className={styles.catCard} style={{ borderLeftColor: '#10b981' }}>
                <div className={styles.catName}>Technical SEO (35%)</div>
                <div className={styles.catScore} style={{ color: '#10b981' }}>92/100</div>
              </div>
              <div className={styles.catCard} style={{ borderLeftColor: '#f59e0b' }}>
                <div className={styles.catName}>Performance (25%)</div>
                <div className={styles.catScore} style={{ color: '#f59e0b' }}>78/100</div>
              </div>
              <div className={styles.catCard} style={{ borderLeftColor: '#6366f1' }}>
                <div className={styles.catName}>Tech Health (25%)</div>
                <div className={styles.catScore} style={{ color: '#6366f1' }}>88/100</div>
              </div>
              <div className={styles.catCard} style={{ borderLeftColor: '#ec4899' }}>
                <div className={styles.catName}>Basic Security (15%)</div>
                <div className={styles.catScore} style={{ color: '#ec4899' }}>95/100</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabs}>
            <button
              onClick={() => setActiveTab('pages')}
              className={`${styles.tabBtn} ${activeTab === 'pages' ? styles.tabActive : ''}`}
            >
              Discovered Pages ({SAMPLE_PAGES.length})
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`${styles.tabBtn} ${activeTab === 'issues' ? styles.tabActive : ''}`}
            >
              Findings & Issues ({SAMPLE_FINDINGS.length})
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
                  {SAMPLE_PAGES.map((page, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>{page.url}</span>
                          <ExternalLink size={12} color="var(--text-muted)" />
                        </a>
                      </td>
                      <td>
                        <span className={`badge ${page.statusCode === 200 ? 'badge-success' : 'badge-critical'}`}>
                          {page.statusCode}
                        </span>
                      </td>
                      <td>{page.responseTimeMs} ms</td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page.title}
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page.h1 || '—'}
                      </td>
                      <td>
                        {page.indexable ? (
                          <span className="badge badge-success">Indexable</span>
                        ) : (
                          <span className="badge badge-info">Noindex</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Findings & Issues */}
          {activeTab === 'issues' && (
            <div>
              {SAMPLE_FINDINGS.map((finding) => (
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

                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Affected URLs ({finding.affectedUrls.length}):
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                    {finding.affectedUrls.map((url, uidx) => (
                      <li key={uidx}>{url}</li>
                    ))}
                  </ul>

                  <div className={styles.recommendationBox}>
                    <strong>Actionable Fix: </strong>
                    <span>{finding.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Performance & Core Web Vitals */}
          {activeTab === 'performance' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Google PageSpeed Insights Diagnostics</h3>
                <span className="badge badge-info">Real-User CrUX Field Data (75th percentile)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="card">
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Largest Contentful Paint (LCP)</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)', margin: '8px 0' }}>
                    1.8s
                  </div>
                  <span className="badge badge-success">Good (&lt; 2.5s)</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Measures loading performance. Hero element rendered swiftly.
                  </p>
                </div>

                <div className="card">
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Interaction to Next Paint (INP)</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)', margin: '8px 0' }}>
                    85ms
                  </div>
                  <span className="badge badge-success">Good (&lt; 200ms)</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Measures responsiveness. Clean main-thread task execution.
                  </p>
                </div>

                <div className="card">
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cumulative Layout Shift (CLS)</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)', margin: '8px 0' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
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
