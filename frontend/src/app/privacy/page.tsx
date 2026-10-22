import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '20px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Last Updated: October 22, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>1. Information We Collect</h2>
            <p>
              SiteScope collects account credentials (email, name), website domains submitted for auditing, crawl results, and billing metadata processed securely through Razorpay. We do not store raw credit card numbers or CVVs on our servers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>2. How We Use Information</h2>
            <p>
              Data is used strictly to execute website health audits, generate diagnostic reports, process recurring subscriptions, and deliver critical notification alerts regarding technical regressions.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>3. Data Retention & Account Deletion</h2>
            <p>
              Free account audit records are retained for 7 days; Pro account audit histories are retained for 90 days. Users may request full account and project data deletion at any time from their account settings.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>4. Google OAuth Integrations</h2>
            <p>
              When you connect Google Analytics 4 or Google Search Console, SiteScope accesses read-only performance data strictly with your explicit consent. Tokens are encrypted at rest using AES-256-GCM and never shared with third parties.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
