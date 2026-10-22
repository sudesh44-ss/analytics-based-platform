import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import Link from 'next/link';
import { BookOpen, Terminal, Shield, Zap } from 'lucide-react';

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
            SiteScope Documentation & Help Center
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '40px' }}>
            Learn how SiteScope crawls websites, computes health scores, secures outbound network requests, and integrates with Google Analytics.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '48px' }}>
            <div className="card">
              <BookOpen size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Quickstart Guide</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Add your first domain, configure crawl depth and page limits, and run an automated audit in under 60 seconds.
              </p>
            </div>

            <div className="card">
              <Terminal size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Fastify REST API Spec</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Explore authenticated REST endpoints under /api/v1 for programmatic audit triggering and JSON result ingestion.
              </p>
            </div>

            <div className="card">
              <Shield size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>SSRF & Security Baseline</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Learn how our 5-layer network validation, socket IP pinning, and RFC 1918 filters prevent unauthorized internal network access.
              </p>
            </div>

            <div className="card">
              <Zap size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Scoring Methodology</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Understand category weights (SEO 35%, Performance 25%, Health 25%, Security 15%) and logarithmic severity dampening.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Does SiteScope guarantee #1 rankings on Google?
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                  No. SiteScope is a technical diagnostics platform that identifies crawl errors, performance bottlenecks, and SEO regressions. Ranking depends on hundreds of search engine algorithm factors including backlinks and content quality.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Why does an audit require domain verification for some features?
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                  Domain verification via DNS TXT or HTML meta tags proves authorized ownership before enabling scheduled recurrent audits, white-label PDF branding, and Search Console data integration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
