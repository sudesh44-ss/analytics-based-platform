import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Mail, MessageSquare, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '60px 20px 100px', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>Contact Support</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Have questions about your audits, enterprise plan quotas, or custom crawler integrations? Our technical team is here to assist.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card">
            <Mail size={22} color="var(--primary)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Email Support</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              support@sitescope.io
            </p>
          </div>

          <div className="card">
            <Clock size={22} color="var(--primary)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Response Time</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Within 24 hours (Monday – Friday)
            </p>
          </div>

          <div className="card">
            <MessageSquare size={22} color="var(--primary)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Security Disclosure</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              security@sitescope.io
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Send Us a Message</h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="Jane Doe"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Message or Inquiry
              </label>
              <textarea
                rows={4}
                placeholder="How can we help you?"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              Send Message
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
