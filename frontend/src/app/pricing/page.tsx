'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, HelpCircle } from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import styles from './page.module.css';

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <>
      <Navbar />
      <div className={`container ${styles.wrapper}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Simple, Transparent SaaS Pricing</h1>
          <p className={styles.subtitle}>
            Audit your websites, identify technical SEO regressions, monitor performance, and generate actionable client reports.
          </p>

          <div className={styles.billingInterval}>
            <button
              onClick={() => setInterval('monthly')}
              className={`${styles.intervalBtn} ${interval === 'monthly' ? styles.intervalActive : ''}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`${styles.intervalBtn} ${interval === 'yearly' ? styles.intervalActive : ''}`}
            >
              Yearly (Save ~17%)
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Free Plan */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>SiteScope Free</div>
            <div className={styles.planDesc}>
              Essential diagnostics for individual website owners and bloggers.
            </div>

            <div className={styles.priceBox}>
              <span className={styles.priceAmount}>₹0</span>
              <span className={styles.priceInterval}>forever free</span>
            </div>
            <div className={styles.taxNotice}>No credit card required. Free tier forever.</div>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span><strong>1 Website Project</strong></span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>Up to <strong>50 Pages</strong> per audit</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span><strong>3 Audits per Day</strong></span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>Technical SEO & Broken Link Checks</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>7-Day Audit History Retention</span>
              </div>
            </div>

            <Link href="/projects" className={`btn btn-secondary ${styles.ctaBtn}`}>
              Get Started Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
            <div className={styles.popularBadge}>RECOMMENDED FOR TEAMS</div>
            <div className={styles.planName}>SiteScope Pro</div>
            <div className={styles.planDesc}>
              Comprehensive automated diagnostics, scheduling, and analytics for agencies and SaaS teams.
            </div>

            <div className={styles.priceBox}>
              <span className={styles.priceAmount}>
                {interval === 'monthly' ? '₹799' : '₹7,999'}
              </span>
              <span className={styles.priceInterval}>
                {interval === 'monthly' ? '/ month' : '/ year'}
              </span>
            </div>
            <div className={styles.taxNotice}>
              Plus applicable GST (18%). Recurring subscription via Razorpay. Cancel anytime.
            </div>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span><strong>Up to 10 Website Projects</strong></span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>Up to <strong>1,000 Pages</strong> per audit</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span><strong>30 Audits per Day</strong> (3 concurrent)</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>Core Web Vitals & Google PSI Integration</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>Scheduled Audits (Daily, Weekly, Monthly)</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>White-label PDF & CSV Report Exports</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>Google Analytics 4 & Search Console Sync</span>
              </div>
              <div className={styles.featureItem}>
                <Check size={18} color="var(--success)" />
                <span>90-Day Audit History Retention</span>
              </div>
            </div>

            <Link href="/billing" className={`btn btn-primary ${styles.ctaBtn}`}>
              Upgrade to Pro Plan
            </Link>
          </div>
        </div>

        {/* Mandate & Cancellation Disclosure */}
        <div style={{ maxWidth: '800px', margin: '48px auto 0', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Transparent Subscription Terms & Mandate Disclosure</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Subscriptions are billed in advance on a recurring monthly or yearly cycle. You can cancel your subscription at any time from your Billing Dashboard. Upon cancellation, your Pro plan entitlements remain active until the end of your current paid billing period. If a recurring renewal fails, a 7-day grace period is granted before account downgrade to Free. For refund terms, refer to our <Link href="/refund-policy" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Refund & Cancellation Policy</Link>.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
