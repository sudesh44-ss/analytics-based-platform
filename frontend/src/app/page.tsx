import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Search,
  Zap,
  Lock,
  FileSpreadsheet,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroTag}>
              <Activity size={14} />
              <span>Next-Generation Website Analytics & Auditor</span>
            </div>

            <h1 className={styles.heroTitle}>
              Audit. Understand. <span className={styles.highlight}>Improve.</span>
            </h1>

            <p className={styles.heroDesc}>
              SiteScope continuously audits websites you own or manage. Uncover technical SEO regressions, monitor Core Web Vitals, identify broken link chains, and generate white-label diagnostic reports.
            </p>

            <div className={styles.heroCtas}>
              <Link href="/projects" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                <span>Run Your First Audit Free</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/pricing" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                <span>View SaaS Plans (From ₹799)</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="container">
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Search size={22} />
              </div>
              <h3 className={styles.featureTitle}>Deep Technical SEO Crawling</h3>
              <p className={styles.featureDesc}>
                Crawlee-powered crawler discovers internal links, inspects robots.txt compliance, flags missing meta descriptions, duplicate title tags, and conflicting canonical tags.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Zap size={22} />
              </div>
              <h3 className={styles.featureTitle}>Core Web Vitals & PSI</h3>
              <p className={styles.featureDesc}>
                Google PageSpeed Insights API integration provides both real-user Chrome UX Report (CrUX) field data (LCP, INP, CLS) and synthetic lab metrics with zero worker CPU overhead.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShieldCheck size={22} />
              </div>
              <h3 className={styles.featureTitle}>OWASP SSRF-Hardened</h3>
              <p className={styles.featureDesc}>
                5-layer defense rejects localhost, internal RFC 1918 subnets, and cloud metadata (169.254.169.254) with socket IP pinning to prevent DNS rebinding bypasses.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <BarChart3 size={22} />
              </div>
              <h3 className={styles.featureTitle}>GA4 & Search Console Sync</h3>
              <p className={styles.featureDesc}>
                Connect authorized Google Analytics 4 properties and Google Search Console to correlate crawl errors with organic clicks, impressions, and engagement drops.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <FileSpreadsheet size={22} />
              </div>
              <h3 className={styles.featureTitle}>White-Label PDF & CSV Exports</h3>
              <p className={styles.featureDesc}>
                Export actionable audit findings, crawled URL tables, and performance opportunity lists as branded PDF executive summaries or raw CSV spreadsheets for technical teams.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Lock size={22} />
              </div>
              <h3 className={styles.featureTitle}>Multi-Tenant Isolation</h3>
              <p className={styles.featureDesc}>
                Supabase PostgreSQL Row-Level Security (RLS) ensures absolute cross-tenant isolation. Your crawl records, tokens, and findings are accessible only to authorized accounts.
              </p>
            </div>
          </div>
        </section>

        {/* Public Audit Detection vs Authorized Analytics Comparison */}
        <section className={styles.comparisonSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>What SiteScope Audits</h2>
              <p className={styles.sectionSubtitle}>
                Clear boundaries between publicly observable web diagnostics and authorized private analytics.
              </p>
            </div>

            <div className={styles.compGrid}>
              <div className={styles.compCard}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--primary)' }}>
                  Public Website Audits Can Detect:
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', listStyle: 'none' }}>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span>Technical SEO tags (Titles, descriptions, headings, canonicals)</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span>Broken internal and external links (4xx and 5xx errors)</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span>Redirect chains, circular redirect loops, and latency</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span>Core Web Vitals lab and field measurements via Google PSI</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span>Public security headers (CSP, HSTS, X-Frame-Options)</span>
                  </li>
                </ul>
              </div>

              <div className={styles.compCard}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Requires Authorized Integration:
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', listStyle: 'none' }}>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--primary)" />
                    <span>Real-time audience traffic, bounce rate & sessions (Google Analytics 4)</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--primary)" />
                    <span>Search query impressions, organic clicks & CTR (Search Console)</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--primary)" />
                    <span>Server deployment metadata and runtime errors (Vercel Integration)</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="var(--primary)" />
                    <span>Scheduled recurring audits and automated Slack/Email alerts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
