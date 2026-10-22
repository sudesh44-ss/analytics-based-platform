# SiteScope — Mandatory Manual Setup & Credentials Checklist

## 1. Overview & Operational Responsibilities

This checklist distinguishes between:
- **Implemented in Code**: Architecture, database schemas, validation logic, SSRF filters, API endpoints, and worker routines.
- **Requires Manual User Action**: Creating provider accounts, copying secret keys, configuring DNS records, authorizing OAuth consent screens, and activating merchant payment gateways.
- **Requires Verification**: Provider settings that must be tested in live dashboards before production launch.

---

## 2. Provider Setup Tasks

### A. Supabase (Database & Authentication)
1. **Create Project**:
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
   - Select your deployment region (e.g. `ap-south-1` Mumbai or closest to your users).
2. **Obtain Project Credentials**:
   - Navigate to **Project Settings -> API**.
   - Copy **Project URL** -> paste into `SUPABASE_URL` (Frontend, Backend, Worker).
   - Copy **anon public** key -> paste into `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Frontend).
   - Copy **service_role secret** key -> paste into `SUPABASE_SERVICE_ROLE_KEY` (Backend, Worker). **Never expose to Frontend**.
3. **Configure Authentication Redirects**:
   - Go to **Authentication -> URL Configuration**.
   - Set **Site URL** to `http://localhost:3000` (development) or `https://sitescope.io` (production).
   - Add **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - `https://sitescope.io/auth/callback`
4. **Apply Migrations**:
   - In Supabase SQL Editor or via CLI, run all SQL migrations from `database/migrations/`.
   - Verify that Row-Level Security (RLS) is enabled on all tables.

---

### B. Google Cloud Platform (User Login & Analytics Integration)

> [!IMPORTANT]
> Separate User Login OAuth from Analytics Integration OAuth!

1. **Create GCP Project**:
   - Go to [https://console.cloud.google.com/](https://console.cloud.google.com/) and create a project: `SiteScope Platform`.
2. **Configure OAuth Consent Screen**:
   - Set User Type to **External**.
   - Fill in App Name (`SiteScope`), User Support Email, and Developer Contact.
3. **Client 1: User Login OAuth (Supabase)**:
   - Create Credentials -> OAuth Client ID -> Web Application.
   - Name: `SiteScope Supabase Login`.
   - Authorized Redirect URI: Add Supabase callback URL: `https://<supabase-project-id>.supabase.co/auth/v1/callback`.
   - Copy Client ID and Secret into Supabase Dashboard -> **Authentication -> Providers -> Google**.
4. **Client 2: Analytics & Search Console Integration (Backend)**:
   - Create Credentials -> OAuth Client ID -> Web Application.
   - Name: `SiteScope Analytics Engine`.
   - Enable APIs in GCP:
     - **Google Analytics Data API** (v1beta).
     - **Google Search Console API** (Webmasters v3).
     - **PageSpeed Insights API** (v5).
   - Authorized Redirect URIs:
     - `http://localhost:4000/api/v1/integrations/google/callback` (development).
     - `https://api.sitescope.io/api/v1/integrations/google/callback` (production).
   - Copy Client ID -> `GOOGLE_CLIENT_ID` (Backend).
   - Copy Client Secret -> `GOOGLE_CLIENT_SECRET` (Backend).
   - Copy PageSpeed Insights API Key -> `GOOGLE_PAGESPEED_API_KEY` (Backend, Worker).

---

### C. Resend (Transactional Email & Supabase Custom SMTP)
1. **Create Account**: Go to [https://resend.com/](https://resend.com/).
2. **Add & Verify Domain**:
   - Add your domain: `sitescope.io` (or mail subdomain: `mail.sitescope.io`).
   - Add the generated TXT, MX, and CNAME (DKIM/SPF) records to your DNS provider (e.g. Cloudflare).
3. **Obtain API Key**:
   - Create API Key with Sending access -> `RESEND_API_KEY` (Backend).
   - Configure Sender Address -> `EMAIL_FROM=SiteScope <notifications@sitescope.io>`.
4. **Link to Supabase Custom SMTP (Optional but Recommended)**:
   - Go to Supabase -> **Project Settings -> Authentication -> SMTP Settings**.
   - Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: `<RESEND_API_KEY>`.

---

### D. Backblaze B2 (Report Artifact Storage)
1. **Create Bucket**:
   - Log in to [https://www.backblaze.com/b2/](https://www.backblaze.com/b2/).
   - Click **Create a Bucket**: Name e.g. `sitescope-reports-private`.
   - Bucket Files: **Private** (Crucial: never make public).
   - Default Encryption: Enabled (SSE-B2).
2. **Generate Application Key**:
   - Go to **App Keys -> Add a New Application Key**.
   - Name: `sitescope-worker-storage`.
   - Restrict to Bucket: `sitescope-reports-private`.
   - Permissions: `Read and Write`.
   - Copy:
     - `keyID` -> `B2_KEY_ID` (Backend, Worker).
     - `applicationKey` -> `B2_APPLICATION_KEY` (Backend, Worker).
     - Endpoint (e.g. `s3.us-west-004.backblazeb2.com`) -> `B2_ENDPOINT`.
     - Bucket Name -> `B2_BUCKET_NAME`.

---

### E. Razorpay Subscriptions (Pro Billing)
1. **Sign Up & Test Mode**:
   - Create account at [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/).
   - Switch to **Test Mode**.
2. **Generate API Keys**:
   - Go to **Settings -> API Keys -> Generate Key**.
   - Copy Key ID -> `RAZORPAY_KEY_ID` (Backend, Frontend public display).
   - Copy Key Secret -> `RAZORPAY_KEY_SECRET` (Backend).
3. **Create Subscription Plans**:
   - Go to **Subscriptions -> Plans -> Create Plan**.
   - **Plan 1 (Monthly Pro)**:
     - Plan Name: `SiteScope Pro Monthly`
     - Billing Frequency: Monthly (`1 Month`)
     - Amount: `₹799`
     - Copy Plan ID -> `RAZORPAY_PLAN_PRO_MONTHLY` (Backend).
   - **Plan 2 (Yearly Pro)**:
     - Plan Name: `SiteScope Pro Yearly`
     - Billing Frequency: Yearly (`12 Months`)
     - Amount: `₹7,999`
     - Copy Plan ID -> `RAZORPAY_PLAN_PRO_YEARLY` (Backend).
4. **Configure Webhook**:
   - Go to **Settings -> Webhooks -> Add New Webhook**.
   - Webhook URL:
     - Production: `https://api.sitescope.io/api/v1/webhooks/razorpay`
     - Local Testing: Use Ngrok / Cloudflare Tunnel URL.
   - Generate Webhook Secret: Paste into `RAZORPAY_WEBHOOK_SECRET` (Backend).
   - Active Events:
     - `subscription.authenticated`
     - `subscription.activated`
     - `subscription.charged`
     - `subscription.pending`
     - `subscription.halted`
     - `subscription.cancelled`
     - `subscription.completed`
     - `payment.captured`
     - `payment.failed`
     - `refund.created`

---

### F. Render (Fastify API, Background Worker & Redis Queue)
1. **Render Key Value (Redis)**:
   - Create Key Value instance in Render.
   - Copy Internal Redis URL -> `REDIS_URL` (Backend, Worker).
2. **Render Web Service (Fastify API)**:
   - Root Directory: `backend`.
   - Build Command: `npm install && npm run build`.
   - Start Command: `npm run start`.
   - Add Environment Variables from `backend/.env.example`.
3. **Render Background Worker**:
   - Root Directory: `worker`.
   - Build Command: `npm install && npx playwright install-deps chromium && npx playwright install chromium && npm run build`.
   - Start Command: `npm run start`.
   - Add Environment Variables from `worker/.env.example`.

---

### G. Vercel (Next.js Frontend)
1. **Import Git Repository**:
   - Select the `sitescope` monorepo.
   - Root Directory: `frontend`.
   - Framework Preset: `Next.js`.
2. **Configure Environment Variables**:
   - `NEXT_PUBLIC_APP_URL=https://sitescope.io`
   - `NEXT_PUBLIC_API_URL=https://api.sitescope.io`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=...`
