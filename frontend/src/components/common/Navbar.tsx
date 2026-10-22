'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import styles from './Navbar.module.css';

export function Navbar() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <div className={styles.logoIcon}>
            <Activity size={20} />
          </div>
          <span>SiteScope</span>
          <span className="badge badge-info" style={{ fontSize: '10px' }}>Beta</span>
        </Link>

        <nav className={styles.navLinks} aria-label="Main Navigation">
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link href="/projects" className={styles.navLink}>Projects</Link>
          <Link href="/features" className={styles.navLink}>Features</Link>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/docs" className={styles.navLink}>Docs</Link>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <Link href="/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
          <Link href="/projects" className="btn btn-primary btn-sm">
            Start Free Audit
          </Link>
        </div>
      </div>
    </header>
  );
}
