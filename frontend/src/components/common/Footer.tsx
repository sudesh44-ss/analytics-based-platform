'use client';

import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <div className={styles.brandName}>SiteScope</div>
            <p className={styles.tagline}>
              Audit. Understand. Improve. Production-grade website analytics, technical SEO crawler, and performance diagnostics.
            </p>
            <p className={styles.disclaimer}>
              Notice: SiteScope provides public website audits and authorized technical analytics. It does not promise guaranteed search rankings, penetration testing, or unauthorized competitor tracking.
            </p>
          </div>

          <div>
            <div className={styles.colTitle}>Product</div>
            <div className={styles.linkList}>
              <Link href="/dashboard" className={styles.link}>Dashboard</Link>
              <Link href="/projects" className={styles.link}>Projects</Link>
              <Link href="/features" className={styles.link}>Features</Link>
              <Link href="/pricing" className={styles.link}>Pricing & Plans</Link>
              <Link href="/docs" className={styles.link}>Documentation</Link>
            </div>
          </div>

          <div>
            <div className={styles.colTitle}>Legal Policies</div>
            <div className={styles.linkList}>
              <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
              <Link href="/terms" className={styles.link}>Terms & Conditions</Link>
              <Link href="/acceptable-use" className={styles.link}>Acceptable Use Policy</Link>
              <Link href="/refund-policy" className={styles.link}>Refund & Cancellation</Link>
              <Link href="/contact" className={styles.link}>Contact Support</Link>
            </div>
          </div>

          <div>
            <div className={styles.colTitle}>Technology</div>
            <div className={styles.linkList}>
              <span className={styles.link}>Next.js 16 (App Router)</span>
              <span className={styles.link}>Fastify REST Engine</span>
              <span className={styles.link}>Crawlee & Playwright</span>
              <span className={styles.link}>Supabase PostgreSQL</span>
              <span className={styles.link}>Razorpay Subscriptions</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div>&copy; 2026 SiteScope SaaS. All rights reserved.</div>
          <div>Built for website owners, technical SEO specialists, and SaaS developers.</div>
        </div>
      </div>
    </footer>
  );
}
