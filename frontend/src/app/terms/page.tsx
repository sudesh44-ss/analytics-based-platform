import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '20px' }}>Terms and Conditions</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Effective Date: October 22, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using SiteScope, you agree to be bound by these Terms. If you are entering into this agreement on behalf of a business, you represent that you have authority to bind that entity.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>2. Authorized Target Domains</h2>
            <p>
              You must only audit websites that you own or are explicitly authorized to test. You agree not to use SiteScope to conduct denial-of-service attacks, scrape unauthorized proprietary content, or bypass robots.txt policies maliciously.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>3. Service Limitations & Disclaimers</h2>
            <p>
              SiteScope audits are diagnostic observations. We do not guarantee complete discovery of every web page, search ranking improvements, or vulnerability-free server operations. The service is provided &ldquo;as is&rdquo;.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
