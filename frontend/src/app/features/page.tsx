import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Search, Zap, Shield, FileSpreadsheet, BarChart2, Layers } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: Search,
      title: 'Technical SEO Auditor',
      desc: 'Deep crawl traversal inspecting title lengths, meta descriptions, canonical mismatches, missing heading hierarchy, and robots directives across every discovered URL.',
    },
    {
      icon: Zap,
      title: 'Performance & Core Web Vitals',
      desc: 'Google PageSpeed Insights API queries providing 75th-percentile real-world Chrome UX Report (CrUX) field data (LCP, INP, CLS) alongside synthetic Lighthouse lab tests.',
    },
    {
      icon: Shield,
      title: 'OWASP SSRF-Hardened Crawler',
      desc: 'Our Crawlee engine enforces strict RFC 3986 scheme allowlists, socket-level IP pinning, and redirect hop revalidation to prevent SSRF against internal infrastructure.',
    },
    {
      icon: BarChart2,
      title: 'Historical Trend Tracking',
      desc: 'Compare audit health scores across daily, weekly, or monthly intervals. Visualize whether recent code deployments improved or degraded technical health.',
    },
    {
      icon: FileSpreadsheet,
      title: 'White-Label Reports & CSV',
      desc: 'Generate executive summary PDF reports for clients and export raw CSV spreadsheets of all crawled pages, broken link chains, and remediation recommendations.',
    },
    {
      icon: Layers,
      title: 'Selective Browser Rendering',
      desc: 'Single Page Applications (SPAs) built with React, Vue, or Next.js trigger selective Playwright rendering to evaluate client-side hydrated tags and scripts.',
    },
  ];

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 60px' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 800 }}>Platform Features & Capabilities</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.6 }}>
            Designed for website owners, technical SEO consultants, and engineering teams needing automated website observability and regression tracking.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="card">
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{feat.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
