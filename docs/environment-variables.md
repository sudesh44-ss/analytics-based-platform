# SiteScope — Environment Variables Reference Matrix

## 1. Overview & Security Rules

All environment variable names defined in this specification correspond directly to source code configurations across the monorepo.

**Core Rules**:
- Variables prefixed with `NEXT_PUBLIC_` are bundled into browser JavaScript and are strictly **PUBLIC**.
- **NEVER** put API keys, service role tokens, webhook secrets, encryption keys, or private storage credentials into `frontend/.env*` or any `NEXT_PUBLIC_*` variable.
- Keep blank placeholders in `.env.example` files. Never commit actual secrets into Git.

---

## 2. Master Variable Matrix

| Variable Name | Used By | Public or Secret | Required? | Where to Obtain | Verification Method | Failure Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`NODE_ENV`** | All | Public | Yes | Set to `development` or `production` | Check `process.env.NODE_ENV` | Defaults to `development` |
| **`PORT`** | Backend | Public | Yes | Render / Local configuration (Default `4000`) | API listening check | Defaults to `4000` |
| **`NEXT_PUBLIC_APP_URL`** | Frontend | Public | Yes | Vercel domain or `http://localhost:3000` | Browser URL check | Redirects break |
| **`NEXT_PUBLIC_API_URL`** | Frontend | Public | Yes | Render Web Service URL or `http://localhost:4000` | API fetch calls | All API calls fail (Network error) |
| **`FRONTEND_ORIGIN`** | Backend | Public | Yes | URL allowed in CORS (e.g. `https://sitescope.io`) | CORS pre-flight test | CORS blocked (Frontend cannot reach API) |
| **`NEXT_PUBLIC_SUPABASE_URL`** | Frontend | Public | Yes | Supabase Dashboard -> Project Settings -> API | `curl $URL` returns 200 | Auth login fails |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Frontend | Public | Yes | Supabase Dashboard -> Project Settings -> API (anon key) | Supabase client init | Client auth requests unauthorized |
| **`SUPABASE_URL`** | Backend, Worker | Secret* | Yes | Supabase Dashboard -> Project Settings -> API | Backend ping | All database queries fail |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Backend, Worker | **CRITICAL SECRET** | Yes | Supabase Dashboard -> Project Settings -> API (service_role) | Backend admin query | Worker cannot persist crawl results |
| **`REDIS_URL`** | Backend, Worker | **SECRET** | Yes | Render Key Value dashboard (`rediss://...`) | BullMQ ping | Job enqueueing and rate limiting fail |
| **`ENCRYPTION_MASTER_KEY`** | Backend, Worker | **CRITICAL SECRET** | Yes | Generate via `openssl rand -hex 32` | Hex length check (64 chars) | Cannot encrypt/decrypt OAuth tokens |
| **`GOOGLE_CLIENT_ID`** | Backend | Secret | Optional* | Google Cloud Console -> Credentials | OAuth redirect test | GA4 / GSC connection fails |
| **`GOOGLE_CLIENT_SECRET`** | Backend | **SECRET** | Optional* | Google Cloud Console -> Credentials | Token exchange test | GA4 / GSC authorization fails |
| **`GOOGLE_PAGESPEED_API_KEY`** | Backend, Worker | Secret | Optional | Google Cloud Console -> APIs & Services | Call PSI endpoint | Performance falls back to Lighthouse |
| **`RESEND_API_KEY`** | Backend | **SECRET** | Yes | Resend Dashboard -> API Keys | Send test email | Emails fail safely with logged error |
| **`EMAIL_FROM`** | Backend | Public | Yes | Verified Resend domain (e.g. `notifications@sitescope.io`)| Check email header | Resend rejects delivery |
| **`B2_BUCKET_NAME`** | Backend, Worker | Secret | Yes | Backblaze B2 Console -> Buckets | S3 HeadBucket check | Report generation disabled |
| **`B2_KEY_ID`** | Backend, Worker | Secret | Yes | Backblaze B2 Console -> App Keys | S3 ListObjects check | Report upload fails |
| **`B2_APPLICATION_KEY`** | Backend, Worker | **CRITICAL SECRET** | Yes | Backblaze B2 Console -> App Keys | S3 PutObject check | Report upload fails |
| **`B2_ENDPOINT`** | Backend, Worker | Public | Yes | Backblaze B2 region endpoint (e.g. `s3.us-west-004.backblazeb2.com`)| Endpoint ping | S3 connection fails |
| **`RAZORPAY_KEY_ID`** | Backend, Frontend | Public | Yes | Razorpay Dashboard -> Settings -> API Keys | Checkout modal opens | Checkout cannot initialize |
| **`RAZORPAY_KEY_SECRET`** | Backend | **CRITICAL SECRET** | Yes | Razorpay Dashboard -> Settings -> API Keys | Call Razorpay API | Subscription creation fails |
| **`RAZORPAY_WEBHOOK_SECRET`**| Backend | **CRITICAL SECRET** | Yes | Razorpay Dashboard -> Settings -> Webhooks | Send test webhook | Webhook signatures rejected (HTTP 400)|
| **`RAZORPAY_PLAN_PRO_MONTHLY`**| Backend | Secret | Yes | Razorpay Dashboard -> Subscriptions -> Plans | Plan ID validation | Cannot create monthly subscription |
| **`RAZORPAY_PLAN_PRO_YEARLY`** | Backend | Secret | Yes | Razorpay Dashboard -> Subscriptions -> Plans | Plan ID validation | Cannot create yearly subscription |
