# SiteScope — Billing Architecture & Differentiation Specification

**Document Version:** 1.0.0  
**Target Module:** Subscription & Quotas vs. Plan & Billing  
**Route:** `/billing` (with unified tabbed sub-navigation: `?tab=quotas` and `?tab=plans`)

---

## 1. Executive Summary & Root Cause Analysis

In the previous codebase:
1. The sidebar presented two separate navigation entries:
   - **Subscription & Quota** (`/billing`) under Main Navigation.
   - **Plan & Billing** (`/billing`) under Settings & Help.
2. Both sidebar links navigated to the exact same URL (`/billing`).
3. The page contained hardcoded placeholder simulation numbers (`3 / 30`, `INV-2026-00104`) with client-side state manipulation (`setEntitlement('PRO_ACTIVE')`).
4. Real backend endpoints (`GET /billing/subscription`, `GET /billing/plans`, `POST /billing/checkout`) were never called by the frontend.

This specification cleanly separates the two domains:
- **Subscription & Quotas:** Operational resource consumption and allowance tracking for the active billing cycle.
- **Plan & Billing:** Commercial plan selection, pricing, Razorpay subscription checkout, and tax invoices.

---

## 2. Functional Responsibility Separation

| Dimension | Section 1: Subscription & Quotas (`/billing?tab=quotas`) | Section 2: Plan & Billing (`/billing?tab=plans`) |
| :--- | :--- | :--- |
| **Primary Question** | *"What resources am I currently using and how much remains today?"* | *"Which plan should I choose, how much does it cost, and how do I pay?"* |
| **Target Audience** | Site engineers, SEO operators, daily users | Account owners, finance administrators |
| **Data Models** | `usage_ledger`, `subscriptions`, `projects` count | `plans`, `subscriptions`, `payments`, `billing_invoices` |
| **Primary KPIs** | - Daily Audits used vs limit (e.g. 1 / 3)<br>- Active monitored websites vs project limit<br>- Max crawl depth & page ceiling per crawl<br>- Daily quota reset schedule | - Current Plan name (Free vs Pro)<br>- Billing cycle (Monthly / Yearly)<br>- Next renewal date and auto-renewal status<br>- Commercial plan cards with feature matrix |
| **Actions** | - Review daily usage progress<br>- Jump to upgrade when quota reached | - Select Monthly or Yearly billing<br>- Initiate Razorpay subscription checkout<br>- Download official GST-compliant invoices |
| **Security & Guarantees** | Quotas are reserved atomically in PostgreSQL (`reserve_audit_quota`); frontend cannot bypass limits. | Server verifies Razorpay HMAC signatures (`verifyCheckoutSignature`) before activating Pro. |

---

## 3. Backend & Database Status Matrix

| Capability / Resource | Database Model | Backend Route | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Active Plan Catalog** | `plans` | `GET /api/v1/billing/plans` | **Implemented & Verified** | Returns active plans (`FREE`, `PRO_MONTHLY`, `PRO_YEARLY`) |
| **Subscription Record** | `subscriptions` | `GET /api/v1/billing/subscription` | **Implemented & Verified** | Returns user's active plan, status, entitlement |
| **Daily Quota Ledger** | `usage_ledger` | `GET /api/v1/billing/usage` | **Implemented & Verified** | Returns daily audits count, remaining, max projects, page limits |
| **Invoice & Receipts** | `billing_invoices` | `GET /api/v1/billing/invoices` | **Implemented & Verified** | Returns GST invoices, totals, PDF download URLs |
| **Razorpay Checkout** | External Gateway | `POST /api/v1/billing/checkout` | **Implemented & Verified** | Creates subscription ID; gracefully handles test mode |
| **Payment Verification** | External Gateway | `POST /api/v1/billing/verify` | **Implemented & Verified** | Verifies HMAC-SHA256 signature and upgrades entitlement |
| **Webhook Sweeper** | `webhook_events` | `POST /api/v1/webhooks/razorpay` | **Implemented & Verified** | Verifies HMAC signature, records idempotent events |

---

## 4. UI Architecture & Navigation Pattern

Both sections reside under `/billing` using a unified sub-navigation switcher:
1. `?tab=quotas` displays **Subscription & Quotas**.
2. `?tab=plans` displays **Plan & Billing**.

The dashboard sidebar correctly preserves both semantic access paths:
- Main Navigation: `Subscription & Quota` $\rightarrow$ `/billing?tab=quotas`.
- Settings & Help: `Plan & Billing` $\rightarrow$ `/billing?tab=plans`.
