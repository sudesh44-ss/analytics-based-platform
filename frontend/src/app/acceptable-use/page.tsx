import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

export default function AcceptableUsePage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '20px' }}>Acceptable Use Policy (AUP)</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Effective Date: October 22, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>1. Prohibited Target Destinations</h2>
            <p>
              Users may not submit localhost, private internal networks (RFC 1918), link-local IP addresses, or cloud instance metadata endpoints (169.254.169.254) for auditing. Our systems enforce automated SSRF blocking and alert on repeated bypass attempts.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>2. Fair Crawl Rates & Concurrency</h2>
            <p>
              SiteScope crawlers operate with bounded concurrency (max 5 requests per domain) and respect standard RFC 9309 robots.txt rules. Attempting to artificially inflate crawl concurrency or bypass daily audit limits is grounds for immediate account suspension.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>3. No Penetration Testing or Exploits</h2>
            <p>
              SiteScope is an auditor, not an exploit engine. Using SiteScope to probe for zero-day vulnerabilities, inject malicious payloads, or conduct unauthorized security testing is strictly forbidden.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
