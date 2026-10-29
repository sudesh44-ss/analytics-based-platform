'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Shield,
  Layers,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  FileText,
  Download,
  Calendar,
  Zap,
  Globe,
  Sliders,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import {
  getBillingSubscription,
  getBillingUsage,
  getBillingInvoices,
  getBillingPlans,
  createCheckout,
  UsageData,
  InvoiceItem,
} from '../../lib/api';
import styles from './page.module.css';

function BillingContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'plans' ? 'plans' : 'quotas';
  const [activeTab, setActiveTab] = useState<'quotas' | 'plans'>(initialTab);

  // Data states
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Sync tab with URL search parameter if changed externally
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'plans' || tab === 'quotas') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load backend billing data
  const loadBillingData = async () => {
    setIsLoading(true);
    setFeedback(null);

    const [subRes, usageRes, plansRes, invRes] = await Promise.all([
      getBillingSubscription(),
      getBillingUsage(),
      getBillingPlans(),
      getBillingInvoices(),
    ]);

    if (subRes.success && subRes.data) {
      setSubscription(subRes.data);
    }
    if (usageRes.success && usageRes.data) {
      setUsage(usageRes.data);
    }
    if (plansRes.success && plansRes.data?.items) {
      setPlans(plansRes.data.items);
    }
    if (invRes.success && invRes.data?.items) {
      setInvoices(invRes.data.items);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleStartCheckout = async (planId: 'PRO_MONTHLY' | 'PRO_YEARLY') => {
    setIsProcessingCheckout(true);
    setFeedback(null);

    const res = await createCheckout(planId);

    if (res.success && res.data) {
      setFeedback({
        type: 'success',
        message: `Razorpay checkout initialized. Subscription Order ID: ${res.data.subscriptionId}`,
      });
      // Refresh status after mock/gateway activation
      loadBillingData();
    } else {
      setFeedback({
        type: 'error',
        message: res.error?.message || 'Failed to initialize checkout gateway.',
      });
    }

    setIsProcessingCheckout(false);
  };

  const isPro = subscription?.entitlement_status === 'PRO_ACTIVE' || subscription?.entitlementStatus === 'PRO_ACTIVE';
  const isGracePeriod = subscription?.entitlement_status === 'GRACE_PERIOD';

  // Quota computations
  const auditsUsed = usage?.currentAuditsCount ?? 0;
  const maxAudits = usage?.maxDailyAudits ?? 3;
  const auditPercent = Math.min(100, Math.round((auditsUsed / maxAudits) * 100));

  const projectsCount = usage?.projectsCount ?? 1;
  const maxProjects = usage?.maxProjects ?? 1;
  const projectPercent = Math.min(100, Math.round((projectsCount / maxProjects) * 100));

  return (
    <>
      <Navbar />
      <div className={styles.layout}>
        <DashboardSidebar />
        <main className={styles.mainContent}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>
              {activeTab === 'quotas' ? 'Subscription & Resource Quotas' : 'Plan Selection & Billing'}
            </h1>
            <p className={styles.subtitle}>
              {activeTab === 'quotas'
                ? 'Monitor active crawl allowances, daily audit limits, and workspace usage.'
                : 'Commercial plans, GST-compliant invoicing, and payment method settings.'}
            </p>
          </div>

          {/* Feedback Alert */}
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
                fontSize: '13px',
              }}
            >
              {feedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Grace Period Warning */}
          {isGracePeriod && (
            <div
              style={{
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid var(--medium)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--medium)',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={20} />
              <div>
                <strong>Renewal Alert:</strong> Your payment renewal is past due. A 7-day grace period is active before features are downgraded.
              </div>
            </div>
          )}

          {/* Unified Sub-Navigation Tabs */}
          <div className={styles.tabNav}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'quotas' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('quotas')}
            >
              <Layers size={16} />
              <span>Subscription & Quotas</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'plans' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('plans')}
            >
              <CreditCard size={16} />
              <span>Plan & Billing</span>
            </button>
          </div>

          {/* TAB 1: SUBSCRIPTION & QUOTAS */}
          {activeTab === 'quotas' && (
            <div>
              {/* Current Active Plan Overview */}
              <div className={styles.entitlementCard}>
                <div>
                  <span className={`badge ${isPro ? 'badge-success' : 'badge-low'}`}>
                    {isPro ? 'Pro Subscription' : 'Free Tier Workspace'}
                  </span>
                  <div className={styles.entitlementTitle}>
                    {isPro ? 'SiteScope Professional' : 'SiteScope Community Tier'}
                  </div>
                  <div className={styles.entitlementMeta}>
                    {isPro
                      ? 'Unlimited access to advanced SEO audits, Core Web Vitals, and daily crawl batches.'
                      : 'Essential website health checks for personal projects and small sites.'}
                  </div>
                </div>

                {!isPro && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab('plans')}
                  >
                    <span>Upgrade Resource Limits</span>
                  </button>
                )}
              </div>

              {/* Resource Consumption Progress */}
              <div className={styles.quotaGrid}>
                {/* Daily Audits */}
                <div className={styles.quotaCard}>
                  <span className={styles.quotaLabel}>Daily Audits Allowance</span>
                  <div className={styles.quotaValue}>
                    {auditsUsed} / {maxAudits}
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${auditPercent}%`,
                        backgroundColor: auditPercent >= 100 ? 'var(--critical)' : 'var(--primary)',
                      }}
                    />
                  </div>
                  <div className={styles.quotaHint}>
                    {maxAudits - auditsUsed} audits remaining today. Resets at midnight UTC.
                  </div>
                </div>

                {/* Monitored Websites */}
                <div className={styles.quotaCard}>
                  <span className={styles.quotaLabel}>Monitored Websites</span>
                  <div className={styles.quotaValue}>
                    {projectsCount} / {maxProjects}
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${projectPercent}%`,
                        backgroundColor: projectPercent >= 100 ? 'var(--medium)' : 'var(--primary)',
                      }}
                    />
                  </div>
                  <div className={styles.quotaHint}>
                    Registered domains eligible for automated crawl jobs.
                  </div>
                </div>

                {/* Max Pages per Crawl */}
                <div className={styles.quotaCard}>
                  <span className={styles.quotaLabel}>Crawl Depth & Page Ceiling</span>
                  <div className={styles.quotaValue}>
                    {usage?.maxPagesPerAudit ?? 50} Pages
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: '100%' }} />
                  </div>
                  <div className={styles.quotaHint}>
                    Maximum HTML pages evaluated per individual crawl job.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAN & BILLING */}
          {activeTab === 'plans' && (
            <div>
              {/* Plan Pricing Grid */}
              <div className={styles.pricingGrid}>
                {/* Free Plan */}
                <div className={styles.pricingCard}>
                  <div className={styles.planName}>Free Community</div>
                  <div className={styles.planPrice}>
                    ₹0 <span className={styles.planInterval}>/ month</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Essential technical SEO diagnostic tools for indie developers.
                  </p>

                  <ul className={styles.planFeatureList}>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>3 Audits per Day</span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>50 Crawled Pages per Audit</span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>1 Registered Website</span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>Core SEO & Security Rules</span>
                    </li>
                  </ul>

                  <button
                    className="btn btn-secondary"
                    disabled={!isPro}
                    style={{ marginTop: 'auto' }}
                  >
                    {!isPro ? 'Current Plan' : 'Downgrade to Free'}
                  </button>
                </div>

                {/* Pro Monthly */}
                <div className={`${styles.pricingCard} ${styles.pricingCardHighlighted}`}>
                  <div className={styles.planTag}>Most Popular</div>
                  <div className={styles.planName}>SiteScope Pro (Monthly)</div>
                  <div className={styles.planPrice}>
                    ₹799 <span className={styles.planInterval}>/ month + 18% GST</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Full platform power for growth companies and digital agencies.
                  </p>

                  <ul className={styles.planFeatureList}>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span><strong>30 Audits per Day</strong></span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span><strong>1,000 Crawled Pages per Audit</strong></span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span><strong>10 Registered Websites</strong></span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>Google PageSpeed Insights Vitals</span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>Playwright Headless Browser Rendering</span>
                    </li>
                  </ul>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleStartCheckout('PRO_MONTHLY')}
                    disabled={isProcessingCheckout || isPro}
                    style={{ marginTop: 'auto' }}
                  >
                    {isPro ? 'Active Plan' : isProcessingCheckout ? 'Initializing...' : 'Upgrade with Razorpay'}
                  </button>
                </div>

                {/* Pro Yearly */}
                <div className={styles.pricingCard}>
                  <div className={styles.planName}>SiteScope Pro (Annual)</div>
                  <div className={styles.planPrice}>
                    ₹7,990 <span className={styles.planInterval}>/ year (2 Months Free)</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Annual commitment with maximum savings and priority crawler compute.
                  </p>

                  <ul className={styles.planFeatureList}>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>All Pro Monthly Capabilities</span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>Priority Queue Allocation</span>
                    </li>
                    <li className={styles.planFeatureItem}>
                      <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                      <span>1-Year Data Retention</span>
                    </li>
                  </ul>

                  <button
                    className="btn btn-secondary"
                    onClick={() => handleStartCheckout('PRO_YEARLY')}
                    disabled={isProcessingCheckout}
                    style={{ marginTop: 'auto' }}
                  >
                    {isProcessingCheckout ? 'Initializing...' : 'Switch to Annual Billing'}
                  </button>
                </div>
              </div>

              {/* Invoices & Billing History */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>GST Tax Invoices & Billing History</h3>

                {invoices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <FileText size={32} style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px' }}>No payment receipts or invoices generated yet.</p>
                  </div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Invoice #</th>
                          <th className={styles.th}>Date</th>
                          <th className={styles.th}>Amount</th>
                          <th className={styles.th}>GST (18%)</th>
                          <th className={styles.th}>Status</th>
                          <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className={styles.td}>
                              <strong>{inv.invoice_number}</strong>
                            </td>
                            <td className={styles.td}>
                              {new Date(inv.created_at).toLocaleDateString()}
                            </td>
                            <td className={styles.td}>
                              ₹{(inv.total_paise / 100).toFixed(2)}
                            </td>
                            <td className={styles.td}>
                              ₹{(inv.tax_paise / 100).toFixed(2)}
                            </td>
                            <td className={styles.td}>
                              <span className="badge badge-success">Paid</span>
                            </td>
                            <td className={styles.td} style={{ textAlign: 'right' }}>
                              {inv.pdf_url ? (
                                <a
                                  href={inv.pdf_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Download size={12} />
                                  <span>PDF</span>
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Generated</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading billing dashboard...</div>}>
      <BillingContent />
    </Suspense>
  );
}
