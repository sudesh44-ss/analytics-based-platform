# SiteScope — Payment Failure Recovery & UX Specification

## 1. Core Financial Safety Axiom

**A client network timeout, browser redirect interruption, device crash, or server error does not prove that a payment failed.**

If a user authorizes a recurring mandate and closes the browser tab before the redirect completes:
1. The issuing bank or Razorpay may still capture the payment successfully.
2. Initiating a replacement checkout or prompting the user to pay again immediately causes **duplicate charges**.
3. SiteScope must persist the initial payment operation, reconcile with Razorpay asynchronously, and restore status gracefully.

---

## 2. Failure Scenarios & Systemic Recovery

### Scenario 1: Browser Disconnect During Mandate Authorization
- **Problem**: User submits OTP; connection drops before browser redirects to SiteScope.
- **Recovery**:
  - Razorpay processes the webhook `subscription.charged` or `payment.captured` asynchronously.
  - The webhook handler identifies the `razorpay_subscription_id`, confirms payment, creates the internal `payments` record, and upgrades entitlement to `PRO_ACTIVE`.
  - When the user re-opens the SiteScope Billing Dashboard, the frontend queries `/api/v1/billing/subscription` and detects the active Pro plan immediately.

### Scenario 2: Recurring Renewal Payment Fails (7-Day Grace Period)
- **Problem**: A monthly recurring debit fails due to insufficient funds or expired card.
- **Recovery Protocol**:
  1. Webhook `payment.failed` is received.
  2. The subscription status updates to `past_due`.
  3. SiteScope initiates a **7-calendar-day Grace Period**:
     - Entitlement remains `GRACE_PERIOD` (Pro features stay active to prevent immediate disruption to client operations).
     - Automated email is dispatched via Resend: `"Action Required: Your SiteScope Pro renewal payment failed. Please update your payment method within 7 days."`
     - Billing banner displayed in UI with a direct link to the Razorpay customer portal or payment retry checkout.
  4. Razorpay automatically retries according to its scheduled dunning rules (e.g. Day 1, Day 3, Day 5).
  5. If payment succeeds during the window: Webhook `payment.captured` transitions entitlement back to `PRO_ACTIVE` smoothly.
  6. If Day 7 expires with zero successful payments:
     - Worker reconciles authoritative status via Razorpay API `/v1/subscriptions/:id`.
     - Entitlement transitions to `DOWNGRADED`.
     - Automated downgrade notification email dispatched.

---

## 3. Customer-Facing Payment Recovery UX States

The frontend Billing & Checkout UI enforces explicit states to avoid confusion or panic:

| UI State | Visual Representation | User Guidance & Controls |
| :--- | :--- | :--- |
| **`INITIALIZING`** | Skeleton / Spinner | "Setting up secure checkout session..." Button disabled. |
| **`AWAITING_CONFIRMATION`** | Pulsing Shield Icon | "Connecting to payment gateway. Please complete authorization in the modal window." |
| **`VERIFYING_PAYMENT`** | Synchronizing Spinner | "Verifying transaction with your bank. Please do not refresh or close this page." |
| **`PAYMENT_SUCCESS`** | Green Checkmark | "Welcome to SiteScope Pro! Your payment of ₹799 was verified. Reference: `pay_12345`." |
| **`UNKNOWN_OUTCOME`** | Amber Warning Shield | "We are verifying your transaction with your bank. **Please do not pay again.** Reference: `sub_12345`. This may take up to 5 minutes." (Includes status refresh button). |
| **`DEFINITIVELY_FAILED`** | Red Alert Box | "Payment was declined by your bank. Reason: Insufficient funds. No money was deducted. You may try another card." |
| **`GRACE_PERIOD_ACTIVE`** | Persistent Amber Banner | "Your last renewal payment failed. Pro access remains active for 4 more days. [Update Payment Method]." |
