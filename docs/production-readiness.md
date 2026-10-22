# SiteScope — Production Readiness & Launch Checklist

## 1. Launch Gate Criteria

SiteScope cannot launch publicly until every item on this checklist is marked **VERIFIED**.

---

## 2. Checklist

### A. Security & OWASP Baseline
- [ ] **SSRF Defense Tested**: Verified that all internal, private, loopback, and metadata IPs are rejected across direct and redirect requests.
- [ ] **Tenant Isolation Verified**: Verified that Row-Level Security (RLS) strictly prevents User A from reading or modifying User B's projects, audits, or reports.
- [ ] **Secret Confinement**: Confirmed that `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `ENCRYPTION_MASTER_KEY` are never exposed to browser bundles.
- [ ] **Token Encryption Active**: Confirmed that Google OAuth refresh tokens are stored encrypted using AES-256-GCM.
- [ ] **Rate Limiting Active**: Confirmed that auth endpoints reject brute-force attacks with HTTP 429.

### B. Payment & Entitlement Verification
- [ ] **Server-Authoritative Pricing**: Confirmed that plan amounts cannot be tampered with via frontend payloads.
- [ ] **Webhook Signature Verification**: Confirmed that raw-body HMAC SHA-256 verification rejects forged webhooks.
- [ ] **Idempotent Webhook Processing**: Verified that duplicate delivery of `subscription.charged` does not create duplicate invoices or billing periods.
- [ ] **Grace Period Verified**: Verified that 7-day grace period keeps Pro active during renewal failure and downgrades cleanly if unresolved.

### C. Crawler & Worker Stability
- [ ] **Bounded Resource Consumption**: Confirmed max page limits (Free: 50, Pro: 1,000) and timeouts terminate runaway crawls.
- [ ] **Worker Crash Recovery**: Confirmed that stale jobs are detected and recovered after worker process restarts.
- [ ] **robots.txt Compliance**: Verified RFC 9309 compliance for target domains.

### D. Legal & Compliance
- [ ] Privacy Policy deployed (`/privacy`).
- [ ] Terms and Conditions deployed (`/terms`).
- [ ] Acceptable Use Policy deployed (`/acceptable-use`).
- [ ] Refund & Cancellation Policy deployed (`/refund-policy`).
- [ ] Contact Page with customer support channels deployed (`/contact`).
