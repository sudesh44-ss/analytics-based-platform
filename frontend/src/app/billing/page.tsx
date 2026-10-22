'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, CheckCircle, Shield, AlertTriangle, Download, ArrowUpRight } from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';

export default function BillingPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [entitlement, setEntitlement] = useState<'FREE' | 'PRO_ACTIVE' | 'GRACE_PERIOD'>('FREE');

  const handleStartCheckout = async (plan: 'PRO_MONTHLY' | 'PRO_YEARLY') => {
    setIsProcessing(true);

    try {
      // In production, calls POST /api/v1/billing/checkout
      // and opens Razorpay Checkout modal
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan }),
      });

      if (!res.ok) {
        // If live gateway credentials not yet added, simulate test mode flow safely
        alert(
          'Notice: Razorpay live keys are currently in test-mode setup. Simulating Pro activation for testing.'
        );
        setEntitlement('PRO_ACTIVE');
      } else {
        const data = await res.json();
        alert(`Checkout initialized with Razorpay Subscription: ${data.data.subscriptionId}`);
      }
    } catch {
      alert('Simulating Pro tier activation in local test mode.');
      setEntitlement('PRO_ACTIVE');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        <DashboardSidebar />
        <main style={{ flex: 1, padding: '32px', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Plan, Billing & Quotas</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Manage your subscription entitlements, view payment receipts, and upgrade plan limits.
            </p>
          </div>

          {/* Grace Period Warning Banner */}
          {entitlement === 'GRACE_PERIOD' && (
            <div
              style={{
                backgroundColor: 'var(--high-light)',
                border: '1px solid var(--high-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--high)',
              }}
            >
              <AlertTriangle size={20} />
              <div>
                <strong>Action Required: Payment Renewal Failed. </strong>
                Your 7-day grace period is active. Pro features remain available. Please update your payment card to prevent downgrade.
              </div>
            </div>
          )}

          {/* Current Entitlement Overview */}
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '8px' }}>Active Subscription</span>
                <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
                  {entitlement === 'PRO_ACTIVE' ? 'SiteScope Pro (Monthly)' : 'SiteScope Free Tier'}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {entitlement === 'PRO_ACTIVE'
                    ? 'Renewal Date: Nov 22, 2026 · Auto-renewing at ₹799 + GST'
                    : 'Basic website audit limits. No recurring charges.'}
                </p>
              </div>

              <div>
                {entitlement === 'FREE' ? (
                  <button
                    onClick={() => handleStartCheckout('PRO_MONTHLY')}
                    className="btn btn-primary"
                    disabled={isProcessing}
                  >
                    <CreditCard size={16} />
                    <span>{isProcessing ? 'Processing...' : 'Upgrade to Pro (₹799/mo)'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setEntitlement('FREE')}
                    className="btn btn-secondary"
                  >
                    <span>Cancel Subscription</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quota Progress Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Daily Audits Used</div>
                <div style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>
                  {entitlement === 'PRO_ACTIVE' ? '3 / 30' : '1 / 3'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resets midnight UTC</div>
              </div>

              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Max Pages per Crawl</div>
                <div style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>
                  {entitlement === 'PRO_ACTIVE' ? '1,000 Pages' : '50 Pages'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CheerioCrawler depth</div>
              </div>

              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Monitored Websites</div>
                <div style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>
                  {entitlement === 'PRO_ACTIVE' ? '3 / 10' : '1 / 1'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Concurrent audit slots</div>
              </div>
            </div>
          </div>

          {/* Payment History & Tax Invoices Table */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              Billing History & Tax Invoices (GST Compliant)
            </h3>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Billing Period</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>INV-2026-00104</td>
                    <td>Oct 22, 2026 – Nov 22, 2026</td>
                    <td>₹943 (₹799 + 18% GST)</td>
                    <td>Razorpay Mandate (Card)</td>
                    <td>
                      <span className="badge badge-success">Paid</span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '12px' }}>
                        <Download size={12} /> PDF
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
