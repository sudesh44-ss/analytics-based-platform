# SiteScope — Independent Deployment Guide

## 1. Deployment Topology Overview

SiteScope is designed for complete component independence. Services are deployed to dedicated specialized hosting providers:

```text
  [End Users]
       │
       ▼ HTTPS (Port 443)
  [Frontend: Vercel] ───────────────► Static Assets & SSR Pages
       │
       ▼ REST API Calls (CORS Protected)
  [Backend: Render Web Service] ────► Fastify REST API (/api/v1)
       │                 │
       │                 ▼ Jobs / Enqueue
       │           [Queue: Render Key Value (Redis)]
       │                 │
       │                 ▼ Pull & Execute
       │           [Worker: Render Background Worker]
       │                 │
       ▼ Queries         ▼ Incremental Persist
  [Database: Supabase PostgreSQL]
       ▲                 ▲
       │                 │ Signed URLs / Uploads
  [Storage: Backblaze B2 Private Buckets]
```

---

## 2. Service-by-Service Deployment Instructions

### Service 1: Database (Supabase PostgreSQL)
1. **Pre-requisite**: Deploy database migrations before deploying new backend code.
2. **Apply Migrations**:
   ```bash
   # From database directory using Supabase CLI:
   cd database
   supabase db push
   ```
3. **Verify RLS**: Run verification scripts in `database/tests/` to confirm RLS policies are active.

---

### Service 2: Backend API (Render Web Service)
1. **Create Web Service**:
   - Repository: `sitescope`
   - Name: `sitescope-api`
   - Environment: `Node`
   - Region: Same region as Supabase (e.g. Frankfurt or Singapore or Oregon) to minimize latency.
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Health Check Path: `/api/v1/health`
2. **Configure Environment Variables**:
   - Set all variables listed for Backend in `docs/environment-variables.md`.
   - Set `FRONTEND_ORIGIN` to your production frontend URL (e.g. `https://sitescope.io`).

---

### Service 3: Background Worker (Render Background Worker)
1. **Create Background Worker**:
   - Repository: `sitescope`
   - Name: `sitescope-worker`
   - Environment: `Node`
   - Root Directory: `worker`
   - Build Command: `npm install && npx playwright install-deps chromium && npx playwright install chromium && npm run build`
   - Start Command: `npm run start`
2. **Configure Environment Variables**:
   - Set all variables listed for Worker in `docs/environment-variables.md`.
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` and `REDIS_URL` match Backend settings.

---

### Service 4: Frontend (Vercel)
1. **Import Project**:
   - Select `sitescope` monorepo.
   - Root Directory: `frontend`
   - Framework: `Next.js`
2. **Configure Build Settings**:
   - Build Command: `next build`
   - Output Directory: `.next`
3. **Configure Environment Variables**:
   - `NEXT_PUBLIC_APP_URL=https://sitescope.io`
   - `NEXT_PUBLIC_API_URL=https://sitescope-api.onrender.com` (or custom domain `https://api.sitescope.io`)
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=...`
4. **Deploy & Set Custom Domain**: Assign `sitescope.io` in Vercel Domain Settings.
