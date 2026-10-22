import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

export default function RefundPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '20px' }}>Refund & Cancellation Policy</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Effective Date: October 22, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>1. Subscription Cancellation</h2>
            <p>
              You can cancel your SiteScope Pro subscription at any time directly through your Billing Dashboard. Upon cancellation, your Pro plan entitlements remain active until the end of your current paid billing period, and no further recurring charges will be initiated.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>2. Refund Eligibility</h2>
            <p>
              Due to the immediate compute resources consumed by automated crawls, PageSpeed Insights API queries, and background worker queues, subscription fees are generally non-refundable once the billing period has commenced. If technical service outages prevent you from utilizing your audit quota, contact support for a pro-rata credit review.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>3. Failed Renewals & 7-Day Grace Period</h2>
            <p>
              If a recurring subscription payment fails, your Pro access remains active for a 7-calendar-day grace period. If payment is not recovered within 7 days, your account will automatically downgrade to the Free plan without loss of historical audit data.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
