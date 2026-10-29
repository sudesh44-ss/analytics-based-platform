# SiteScope — Database Architecture & Schema Audit

**Repository**: `H:\analytics-based-platform`  
**Database Engine**: PostgreSQL 16 (Compatible with Supabase / AWS RDS / Docker)  
**Schema Definition Location**: `database/migrations/` and `database/seeds/`  
**Migration Verification CLI**: `scripts/migrate.js`  

---

## 1. Database Architecture Overview

SiteScope employs a normalized PostgreSQL schema designed for multi-tenant SaaS workloads. Isolation is achieved at the database engine level via **PostgreSQL Row-Level Security (RLS)** coupled with Supabase's `auth.users` reference system and `auth.uid()` security context.

### Quantitative Schema Metrics:
- **Total Tables**: 25 tables defined across migration files.
- **Total RLS Policies**: 19 security policies actively restricting cross-tenant access.
- **Database Functions & Stored Procedures**: 3 PL/pgSQL functions.
- **Triggers**: 3 `BEFORE UPDATE` automated timestamp triggers.
- **Default Seed Records**: 3 core pricing plans (`FREE`, `PRO_MONTHLY`, `PRO_YEARLY`).

---

## 2. Table-by-Table Inventory

| Table Name | Purpose | Primary Key | Foreign Keys & Relationships | Constraints & Indexes | Row-Level Security (RLS) Status | Used By Service / Route |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `projects` | Registered user websites and audit targets | `id` (UUID) | `user_id -> auth.users(id)` ON DELETE CASCADE | UNIQUE (`user_id`, `domain`), idx on `user_id`, idx on `domain` | **ENABLED**: `auth.uid() = user_id` | `backend/src/routes/projects.ts`, `dashboard.ts` |
| `domain_verifications` | DNS TXT and HTML tag domain ownership tokens | `id` (UUID) | `project_id -> projects(id)` ON DELETE CASCADE | None | **ENABLED**: Inherited project ownership via subquery | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `audit_jobs` | Audit execution lifecycle tracker and config | `id` (UUID) | `project_id -> projects(id)`, `user_id -> auth.users(id)` | idx on (`project_id`, `created_at` DESC), idx on `status` | **ENABLED**: `auth.uid() = user_id` | `backend/src/routes/audits.ts`, `worker/src/index.ts` |
| `audit_job_outbox` | Transactional outbox for guaranteed queue publishing | `id` (UUID) | `audit_job_id -> audit_jobs(id)` ON DELETE CASCADE | idx on (`status`, `created_at`) | Not enabled (Internal backend use) | `backend/src/routes/audits.ts` |
| `crawled_pages` | Per-URL HTTP response metadata, tags, and status | `id` (UUID) | `audit_job_id -> audit_jobs(id)`, `project_id -> projects(id)` | idx on `audit_job_id`, idx on (`project_id`, `normalized_url`) | **ENABLED**: Inherited project ownership | `worker/src/index.ts`, `backend/src/routes/audits.ts` |
| `extracted_links` | Internal and external hyperlinks discovered during crawl | `id` (UUID) | `audit_job_id -> audit_jobs(id)`, `source_page_id -> crawled_pages(id)` | idx on `audit_job_id` | **ENABLED**: Inherited audit job ownership | `worker/src/crawlers/cheerio.ts` |
| `issues` | Project-level aggregated technical SEO and health findings | `id` (UUID) | `project_id -> projects(id)`, `first_audit_id -> audit_jobs(id)`, `latest_audit_id -> audit_jobs(id)` | UNIQUE (`project_id`, `rule_id`), idx on (`project_id`, `status`) | **ENABLED**: SELECT & UPDATE restricted to project owner | `worker/src/index.ts`, `backend/src/routes/audits.ts` |
| `issue_occurrences` | Specific URL instances where an issue rule was triggered | `id` (UUID) | `issue_id -> issues(id)`, `audit_job_id -> audit_jobs(id)` | idx on `issue_id` | **ENABLED**: Inherited issue/project ownership | `worker/src/index.ts` |
| `issue_states` | Audit history of issue state transitions (OPEN, FIXED, IGNORED) | `id` (UUID) | `issue_id -> issues(id)`, `user_id -> auth.users(id)` | None | **ENABLED** | `shared/src/schemas/index.ts` |
| `audit_summaries` | Precomputed category scores and issue counts per audit | `id` (UUID) | `audit_job_id -> audit_jobs(id)`, `project_id -> projects(id)` | UNIQUE (`audit_job_id`) | **ENABLED**: Inherited project ownership | `worker/src/index.ts`, `backend/src/routes/dashboard.ts` |
| `performance_metrics` | Core Web Vitals (LCP, INP, CLS) and Lighthouse metrics | `id` (UUID) | `audit_job_id -> audit_jobs(id)`, `project_id -> projects(id)` | None | **ENABLED**: Inherited project ownership | `worker/src/services/pagespeed.ts`, `worker/src/index.ts` |
| `analytics_connections` | Encrypted OAuth tokens for Google Analytics 4 & GSC | `id` (UUID) | `project_id -> projects(id)`, `user_id -> auth.users(id)` | UNIQUE (`project_id`, `provider`) | **ENABLED** | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `analytics_snapshots` | Daily synchronized traffic, clicks, and impressions | `id` (UUID) | `project_id -> projects(id)` | UNIQUE (`project_id`, `provider`, `snapshot_date`) | **ENABLED** | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `plans` | SaaS tier limits, pricing in paise, and quotas | `id` (VARCHAR) | None | Public SELECT policy where `is_active = TRUE` | **ENABLED**: Public readable | `database/seeds/001_plans_seed.sql`, `backend/src/routes/billing.ts` |
| `subscriptions` | Active user billing status and provider references | `id` (UUID) | `user_id -> auth.users(id)`, `plan_id -> plans(id)` | UNIQUE `provider_subscription_id`, idx on `user_id` | **ENABLED**: `auth.uid() = user_id` | `backend/src/services/billing.ts`, `backend/src/routes/billing.ts` |
| `payments` | Transaction receipts, amounts, and Razorpay payment IDs | `id` (UUID) | `user_id -> auth.users(id)`, `subscription_id -> subscriptions(id)` | UNIQUE `provider_payment_id`, idx on `user_id` | **ENABLED**: `auth.uid() = user_id` | `backend/src/services/billing.ts`, `backend/src/routes/webhooks.ts` |
| `billing_invoices` | GST-compliant invoice metadata and B2 storage keys | `id` (UUID) | `user_id -> auth.users(id)`, `payment_id -> payments(id)` | UNIQUE `invoice_number` | **ENABLED**: `auth.uid() = user_id` | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `webhook_events` | Durable audit log of inbound Razorpay webhook deliveries | `id` (UUID) | None | UNIQUE (`provider`, `provider_event_id`), idx on (`status`, `created_at`) | Not enabled (Backend service role) | `backend/src/routes/webhooks.ts` |
| `usage_ledger` | Atomic daily audit quota consumption tracker | `id` (UUID) | `user_id -> auth.users(id)` | UNIQUE (`user_id`, `period_date`), idx on (`user_id`, `period_date`) | **ENABLED**: `auth.uid() = user_id` | `backend/src/routes/audits.ts`, `00003_functions_and_triggers.sql` |
| `reports` | White-label PDF report records and B2 storage pointers | `id` (UUID) | `audit_job_id -> audit_jobs(id)`, `project_id -> projects(id)`, `user_id -> auth.users(id)` | idx on `project_id` | **ENABLED**: `auth.uid() = user_id` | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `scheduled_audits` | Recurring audit cron schedules and next execution times | `id` (UUID) | `project_id -> projects(id)`, `user_id -> auth.users(id)` | None | **ENABLED**: `auth.uid() = user_id` | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `notifications` | In-app user notifications and alert delivery statuses | `id` (UUID) | `user_id -> auth.users(id)` | idx on (`user_id`, `is_read`) | **ENABLED**: `auth.uid() = user_id` | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `idempotency_keys` | Request deduplication records and cached HTTP responses | `id` (UUID) | `user_id -> auth.users(id)` | UNIQUE (`user_id`, `endpoint`, `idempotency_key`), idx on (`user_id`, `idempotency_key`) | **ENABLED**: `auth.uid() = user_id` | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `admin_audit_logs` | Platform administrative actions and security audit trail | `id` (UUID) | `user_id -> auth.users(id)` | None | Not enabled (Admin audit security) | `database/migrations/00001_initial_schema.sql` (schema ready) |
| `billing_audit_logs` | State transition audit log for subscription plan upgrades/downgrades | `id` (UUID) | `user_id -> auth.users(id)` | None | Not enabled (Admin audit security) | `database/migrations/00001_initial_schema.sql` (schema ready) |

---

## 3. Stored Procedures & Business Logic in SQL

In `database/migrations/00003_functions_and_triggers.sql`:

### 1. `reserve_audit_quota(p_user_id UUID, p_max_daily_audits INTEGER) -> BOOLEAN`
- **Purpose**: Prevents race conditions during concurrent audit triggers.
- **Concurrency Mechanism**: Executes an `INSERT ... ON CONFLICT (user_id, period_date) DO NOTHING`, followed immediately by `SELECT ... FOR UPDATE` row-level exclusive locking on `usage_ledger`.
- **Validation**: If `current_audits_count >= p_max_daily_audits`, returns `FALSE`. Otherwise increments `current_audits_count = current_audits_count + 1` and returns `TRUE`.
- **Security**: Defined with `SECURITY DEFINER` so it can be called safely by authorized application sessions.

### 2. `release_audit_quota(p_user_id UUID) -> VOID`
- **Purpose**: Automatically rolls back consumed daily audit quota if an audit fails before crawl initiation or crashes during queue dispatch.
- **Logic**: Atomically decrements `current_audits_count = GREATEST(0, current_audits_count - 1)` on `usage_ledger` for `CURRENT_DATE`.

### 3. `trigger_set_updated_at() -> TRIGGER`
- **Purpose**: Guarantees that `updated_at` timestamps are updated on every `UPDATE` statement on `projects`, `subscriptions`, and `usage_ledger`.

---

## 4. Plan Seeds & Default Tier Definitions

In `database/seeds/001_plans_seed.sql`:

1. **`FREE`**:
   - `amount_paise`: 0 (Free)
   - `max_projects`: 1 website
   - `max_pages_per_audit`: 50 pages
   - `max_daily_audits`: 3 audits per day
   - `max_performance_urls`: 0 (Synthetic fallback)
   - `retention_days`: 7 days
2. **`PRO_MONTHLY`**:
   - `amount_paise`: 79900 (₹799.00 / month + 18% GST)
   - `max_projects`: 10 websites
   - `max_pages_per_audit`: 1,000 pages
   - `max_daily_audits`: 30 audits per day
   - `max_performance_urls`: 3 Core Web Vitals URLs
   - `retention_days`: 90 days
3. **`PRO_YEARLY`**:
   - `amount_paise`: 799900 (₹7,999.00 / year + 18% GST)
   - Tier limits: Same as Pro Monthly, discounted annual rate.

---

## 5. Schema Validation Status

- **Verification Tool**: `scripts/migrate.js` executed via `npm run db:migrate`.
- **Integrity Result**: 106 SQL statements, 25 tables, 19 RLS policies, 3 functions validated cleanly with zero syntax errors.
- **Runtime Execution**: Tested against PostgreSQL 16 Alpine in Docker Compose. Remote migration pending user-supplied `DATABASE_URL` or `SUPABASE_DB_URL`.
