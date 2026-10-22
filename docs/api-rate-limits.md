# SiteScope — API Rate Limiting & Abuse Prevention Specification

## 1. Executive Summary & Architecture

SiteScope deploys a distributed, sliding-window rate limiting architecture powered by Redis (Render Key Value) and Fastify rate limit plugins (`@fastify/rate-limit`). 

**Key Mandates**:
- Enforce tiered limits by IP, authenticated user ID, project, and endpoint sensitivity.
- Fail closed for high-risk mutations (authentication, audit creation, payment checkout).
- Protect reverse proxy headers; only trust `X-Forwarded-For` from verified upstream proxies.
- Return standard HTTP `429 Too Many Requests` with RFC 6585 headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

---

## 2. Tiered Rate Limiting Policies

| Route Classification | Target Endpoints | Key Dimension | Limit | Window | Action on Limit Exceeded |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Public Unauthenticated** | `GET /`, `GET /docs`, `GET /pricing` | Client IP | 120 req | 1 minute | Return HTTP 429 |
| **Authentication Sensitive** | `POST /api/v1/auth/login`, `POST /api/v1/auth/signup` | Client IP + Email | 5 attempts | 15 minutes | Progressive delay + 429 |
| **Password Recovery** | `POST /api/v1/auth/forgot-password` | Client IP + Email | 3 requests | 1 hour | Return generic 200, suppress email |
| **Authenticated Reads** | `GET /api/v1/dashboard/*`, `GET /api/v1/audits/*` | User ID | 300 req | 1 minute | Return HTTP 429 |
| **Audit Job Initiation** | `POST /api/v1/audits` | User ID | Free: 3/day<br>Pro: 30/day | 24 hours | Atomic rejection (`QUOTA_EXCEEDED`) |
| **Report Generation** | `POST /api/v1/reports/pdf` | User ID | 10 req | 1 hour | Return HTTP 429 |
| **Payment Checkout** | `POST /api/v1/billing/checkout` | User ID | 5 req | 15 minutes | Return HTTP 429 + Fraud alert |
| **Webhooks (Razorpay)** | `POST /api/v1/webhooks/razorpay` | IP Allowlist + HMAC | Unlimited* | N/A | Strict HMAC SHA-256 verification |

---

## 3. Trusted Reverse-Proxy Header Security

Clients can forge `X-Forwarded-For: 8.8.8.8` to bypass IP-based rate limiting if Fastify is misconfigured.

**SiteScope Implementation**:
1. Fastify `trustProxy` is set to trusted upstream proxy ranges only (Vercel edge network and Render load balancer CIDR blocks).
2. The real client IP is resolved using the rightmost un-trusted IP in the `X-Forwarded-For` chain.
3. If `trustProxy` cannot verify upstream provenance, it falls back to the direct TCP socket remote address.

---

## 4. Redis Failure & Degradation Policy

- **High-Risk Endpoints (Auth, Billing, Crawl Creation)**: **Fail Closed**. If Redis is unreachable, these endpoints return `HTTP 503 Service Unavailable: Rate limiting service temporarily degraded. Operation blocked for security.`
- **Standard Read Endpoints**: **Fail Open with In-Memory LRU Fallback**. Fastify falls back to a local in-memory LRU cache rate limiter (capacity 10,000 keys) to prevent total application outage while mitigating brute-force spikes.
