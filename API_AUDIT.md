# SiteScope — REST API Architecture & Endpoint Audit

**Repository**: `H:\analytics-based-platform`  
**API Engine**: Fastify v5.2.1 with Node.js 20+ Runtime  
**Base Route Prefix**: `/api/v1`  
**CORS Origin**: Configured via `FRONTEND_ORIGIN` (defaults to `http://localhost:3000`, `https://sitescope.io`)  

---

## 1. REST API Endpoint Inventory

| HTTP Method | Route Path | Purpose | Authentication | Input Validation | Database Operations | Runtime Status | Implementation Location |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/health` | Service health status, uptime, and timestamp | None (Public) | None | None | **Verified (200 OK)** | `backend/src/routes/health.ts` |
| **GET** | `/api/v1/projects` | List all active projects owned by user | Bearer Token (`requireAuth`) | None | SELECT from `projects` WHERE `user_id = auth.uid()` | **Implemented** | `backend/src/routes/projects.ts` |
| **POST** | `/api/v1/projects` | Register new project with SSRF domain preflight | Bearer Token (`requireAuth`) | `CreateProjectSchema` (Zod) | SSRF validation -> INSERT into `projects` | **Implemented** | `backend/src/routes/projects.ts` |
| **GET** | `/api/v1/projects/:id` | Fetch single project by ID with ownership check | Bearer Token (`requireAuth`) | Route Param UUID | SELECT from `projects` WHERE `id = :id AND user_id = auth.uid()` | **Implemented** | `backend/src/routes/projects.ts` |
| **POST** | `/api/v1/audits` | Trigger new website crawl & analysis job | Bearer Token (`requireAuth`) | `CreateAuditSchema` (Zod) | Project check -> SSRF check -> RPC `reserve_audit_quota` -> INSERT `audit_jobs` -> Enqueue BullMQ | **Implemented** | `backend/src/routes/audits.ts` |
| **GET** | `/api/v1/audits/:auditId` | Fetch audit job progress, status, and scores | Bearer Token (`requireAuth`) | Route Param UUID | SELECT from `audit_jobs` JOIN `projects` | **Implemented** | `backend/src/routes/audits.ts` |
| **GET** | `/api/v1/audits/:auditId/pages` | Paginated crawled pages table with search | Bearer Token (`requireAuth`) | `PaginationQuerySchema` (Zod) | SELECT from `crawled_pages` WHERE `audit_job_id = :id` | **Implemented** | `backend/src/routes/audits.ts` |
| **GET** | `/api/v1/audits/:auditId/issues` | Paginated issues and SEO recommendations | Bearer Token (`requireAuth`) | `PaginationQuerySchema` (Zod) | SELECT from `issues` WHERE `project_id = audit.project_id` | **Implemented** | `backend/src/routes/audits.ts` |
| **GET** | `/api/v1/dashboard/summary` | Aggregated KPI scores, severity counts, and quota | Bearer Token (`requireAuth`) | `DashboardSummaryQuery` (Zod) | SELECT `audit_summaries`, SELECT `usage_ledger` | **Implemented** | `backend/src/routes/dashboard.ts` |
| **GET** | `/api/v1/dashboard/audit-trends` | 30-day historical score trend records for charts | Bearer Token (`requireAuth`) | `DashboardSummaryQuery` (Zod) | SELECT `audit_summaries` ORDER BY `created_at` ASC | **Implemented** | `backend/src/routes/dashboard.ts` |
| **GET** | `/api/v1/billing/plans` | Public pricing plans and feature quotas | None (Public) | None | SELECT from `plans` WHERE `is_active = TRUE` | **Implemented** | `backend/src/routes/billing.ts` |
| **GET** | `/api/v1/billing/subscription` | Current user plan, entitlement status, and quota | Bearer Token (`requireAuth`) | None | SELECT `subscriptions`, SELECT `usage_ledger` | **Implemented** | `backend/src/routes/billing.ts` |
| **POST** | `/api/v1/billing/checkout` | Create Razorpay recurring subscription checkout | Bearer Token (`requireAuth`) | `CreateCheckoutSchema` (Zod) | Razorpay SDK `subscriptions.create` | **Implemented** | `backend/src/routes/billing.ts` |
| **POST** | `/api/v1/billing/verify` | Verify checkout signature & activate Pro tier | Bearer Token (`requireAuth`) | `VerifyPaymentSchema` (Zod) | HMAC verification -> UPDATE `subscriptions`, UPDATE `usage_ledger` | **Implemented** | `backend/src/routes/billing.ts` |
| **POST** | `/api/v1/webhooks/razorpay` | Asynchronous Razorpay webhook receiver | Public with HMAC Header (`x-razorpay-signature`) | Raw body buffer | Idempotent INSERT `webhook_events` -> Process `subscription.charged` / `payment.failed` | **Implemented** | `backend/src/routes/webhooks.ts` |

---

## 2. API Security Architecture

### A. Centralized Error Handling (`backend/src/plugins/error-handler.ts`)
- Catches Zod validation errors and transforms them into clean HTTP 400 responses with code `VALIDATION_ERROR` and detailed field mappings.
- In production (`NODE_ENV === 'production'`), hides unhandled 5xx stack traces and returns generic message: *"An unexpected internal error occurred. Please contact support."*
- Log redactor in Fastify logger hides `Authorization`, `Cookie`, `password`, and `token` fields from logs.

### B. Raw Body Handling (`backend/src/plugins/raw-body.ts`)
- Uses Fastify content type parser to preserve the original unparsed `Buffer` on `req.rawBody` for cryptographic HMAC-SHA256 signature verification before JSON parsing.

### C. 5-Layer SSRF Gateway (`backend/src/services/ssrf.ts`)
1. **Normalization & Scheme Check**: Only `http:` and `https:` permitted. Rejects `file:`, `ftp:`, `gopher:`.
2. **Credential Stripping**: Rejects URLs containing embedded user info (`user:pass@host`).
3. **Hostname Filtering**: Rejects `localhost`, `*.localhost`, `*.local`, `127.0.0.1`.
4. **Port Restrictions**: Only standard web ports permitted (80, 443, 8080, 8443). Blocks database ports (5432, 6379, 27017) and internal services.
5. **DNS & CIDR Evaluation**: Resolves DNS records and inspects all returned IPs against `ipaddr.js` ranges:
   - Loopback (`127.0.0.0/8`, `::1`)
   - Private RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
   - Cloud metadata (`169.254.169.254`, link-local)
   - IPv6 unique local and IPv4-mapped ranges.

---

## 3. Frontend API Client (`frontend/src/lib/api.ts`)

- Type-safe wrapper built on native `fetch`.
- Automatically attaches `Authorization: Bearer <token>` from `localStorage.getItem('sitescope_auth_token')`.
- Handles network failure gracefully with structured `ApiResponse<T>` return types.
- Supports pagination query construction and URL search parameter encoding.
