'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  FileSearch,
  Gauge,
  ShieldCheck,
  CreditCard,
  Settings,
  HelpCircle,
} from 'lucide-react';
import styles from './DashboardSidebar.module.css';

function SidebarContent() {
  const pathname = usePathname();

  const links = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Websites & Projects', href: '/projects', icon: Globe },
    { label: 'Technical SEO', href: '/audits', icon: FileSearch },
    { label: 'Performance & Vitals', href: '/audits/performance', icon: Gauge },
    { label: 'Security Audits', href: '/audits/security', icon: ShieldCheck },
    { label: 'Subscription & Quota', href: '/billing', icon: CreditCard },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionTitle}>Main Navigation</div>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Icon size={18} />
            <span>{link.label}</span>
          </Link>
        );
      })}

      <div className={styles.sectionTitle}>Settings & Help</div>
      <Link href="/billing" className={styles.navItem}>
        <Settings size={18} />
        <span>Plan & Billing</span>
      </Link>
      <Link href="/docs" className={styles.navItem}>
        <HelpCircle size={18} />
        <span>Documentation</span>
      </Link>

      <div className={styles.quotaCard}>
        <div className={styles.quotaTitle}>Daily Audit Quota</div>
        <div className={styles.quotaBar}>
          <div className={styles.quotaProgress} style={{ width: '33%' }} />
        </div>
        <div className={styles.quotaMeta}>
          <span>1 / 3 Audits Used</span>
          <span>Free Plan</span>
        </div>
        <Link
          href="/pricing"
          className="btn btn-primary btn-sm"
          style={{ width: '100%', marginTop: '10px' }}
        >
          Upgrade to Pro
        </Link>
      </div>
    </aside>
  );
}

export function DashboardSidebar() {
  return (
    <Suspense fallback={<aside className={styles.sidebar} />}>
      <SidebarContent />
    </Suspense>
  );
}
