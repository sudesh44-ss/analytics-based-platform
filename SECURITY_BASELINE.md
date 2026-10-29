# SiteScope — Global Backend Security Baseline

**Status**: Active & Enforced  
**Applicability**: Backend REST API (`backend/`), Background Crawler Worker (`worker/`), Shared Contracts (`shared/`), Database (`database/`), and all future backend modules.  

---

## 1. Executive Summary

This document establishes the mandatory security rules, controls, and architecture baselines for SiteScope. Every developer, agent, and engineer working on backend services, API routes, crawler components, database migrations, or third-party integrations must adhere to these policies without exception.

---

## 2. The 10 Mandatory Security Directives

### Directive 1: No Direct Unvalidated Fetching of External URLs
- Any user-submitted, database-stored, or dynamically discovered URL must be validated through the canonical 5-layer SSRF gateway (`validateTargetUrl` from `@sitescope/shared`) **before** any socket connection is attempted.
- Direct invocation of raw HTTP clients (`fetch`, `axios`, `got`, `http.get`) on untrusted input is strictly prohibited.

### Directive 2: Mandatory DNS Rebinding & Socket Pinning Controls
- Pre-flight DNS validation alone is insufficient due to Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding attacks.
- Outbound HTTP agents must employ connection-time validation (`createSsrfLookup` or `createSsrfAgents`) to inspect the resolved IP address immediately before the TCP socket handshake completes.

### Directive 3: No Unauthenticated or Unchecked Protected Endpoints
- Every route handling tenant data, project registration, audit triggering, or billing must enforce server-side authentication (`requireAuth` middleware).
- Insecure development bypasses (`dev-token` or placeholder bypasses) are **strictly prohibited** in staging and production environments (`NODE_ENV === 'production' || NODE_ENV === 'staging'`). In local development, bypasses are only permitted when `ALLOW_DEV_AUTH_BYPASS === 'true'` is explicitly configured.

### Directive 4: Strict Tenant Isolation & Object-Level Authorization
- The backend must **never trust client-supplied `userId`, `role`, or tenant claims**.
- Identity must be extracted exclusively from cryptographically verified JWT tokens (`supabase.auth.getUser(token)`).
- Every database query modifying or retrieving user assets must explicitly filter by `user_id = authenticated_user_id` and rely on underlying PostgreSQL Row-Level Security (RLS) policies.

### Directive 5: Zero Unvalidated Request Data
- All HTTP request bodies, route parameters, and query strings must be validated against strict Zod schemas (`@sitescope/shared/schemas`) at the route entry point.
- Requests with unknown, malformed, or oversized payloads must be rejected immediately with HTTP 400 `VALIDATION_ERROR`.

### Directive 6: Zero Secrets in Client Bundles or Version Control
- API secrets, private keys, database service-role credentials, and webhook signing secrets must remain strictly on the server in environment variables.
- Client bundles may only receive public identifiers prefixed with `NEXT_PUBLIC_`.
- Fastify server logging must redact sensitive headers (`Authorization`, `Cookie`, `body.password`, `body.token`).

### Directive 7: Mandatory Rate Limiting & Resource Ceilings
- All public and computationally expensive endpoints must be protected by global and route-level rate limiting (`@fastify/rate-limit`).
- Response size limits (maximum 10MB) and network timeouts (maximum 15 seconds) must be enforced on all outbound HTTP responses to prevent memory exhaustion and decompression bombs.

### Directive 8: Authoritative Server-Side State Transitions
- Payment activations, plan upgrades, and audit quota increments must never be granted based on client-side redirects or unverified frontend claims.
- Entitlement upgrades require cryptographic HMAC-SHA256 signature verification (`crypto.timingSafeEqual`) on the raw request body.

### Directive 9: Comprehensive Automated Security Testing
- No security-sensitive implementation (SSRF, auth middleware, quota reservations, rate limits, signature checks) is considered complete without automated tests asserting both expected successes and adversarial attack vector rejections.

### Directive 10: Documented Security Review for Exceptions
- Any exception to port allowlists (default: 80, 443, 8080, 8443) or IP boundaries requires an explicit architectural review, documented business justification, and security sign-off.

---

## 3. Threat Matrix & Standard Controls

| Threat Vector | Attack Scenario | Standard Control Enforced | Implementation Location |
| :--- | :--- | :--- | :--- |
| **SSRF (Internal Network)** | Target URL resolves to `10.0.0.1` or `192.168.1.1` | CIDR range check against `ipaddr.js` RFC 1918 blocks | `shared/src/security/ssrf.ts` |
| **SSRF (Cloud Metadata)** | Target URL resolves to `169.254.169.254` or `fd00:ec2::254` | Explicit metadata IP set & link-local subnet block | `shared/src/security/ssrf.ts` |
| **SSRF (DNS Rebinding)** | Hostname resolves to public IP during pre-flight, then rebinds to `127.0.0.1` | Connection-time DNS lookup callback in HTTP agent (`createSsrfLookup`) | `shared/src/security/ssrf.ts` |
| **SSRF (IPv4-Mapped IPv6)** | Target URL uses `[::ffff:127.0.0.1]` or `[::ffff:169.254.169.254]` | Automatic translation via `addr.toIPv4Address()` and recursive IPv4 check | `shared/src/security/ssrf.ts` |
| **Public-to-Private Redirect** | Public page redirects to internal microservice | Redirect re-validation and origin-bounding enforcement | `worker/src/crawlers/cheerio.ts` |
| **API Denial of Service** | High-frequency automated request flooding | Global IP sliding-window rate limiting (100 req/min) | `backend/src/app.ts` |
| **Broken Object Level Auth** | User A queries projects belonging to User B | `user_id` constraint in queries + Supabase PostgreSQL RLS | `backend/src/routes/projects.ts` |
| **Webhook Spoofing** | Adversary posts forged payment events | Constant-time HMAC-SHA256 signature verification on raw body | `backend/src/routes/webhooks.ts` |
| **Credential Harvesting** | URL contains `https://admin:pass@host` | Pre-flight rejection of URLs with `username` or `password` | `shared/src/security/ssrf.ts` |
| **Memory / Zip Bomb** | Remote web server returns multi-gigabyte payload | Strict 10MB response size ceiling and streaming limits | `worker/src/crawlers/cheerio.ts` |

---

## 4. Canonical Usage Example

```typescript
import { validateTargetUrl, createSsrfAgents } from '@sitescope/shared';

// 1. Validate Target URL
const ssrfResult = await validateTargetUrl(userInputUrl);
if (!ssrfResult.isValid) {
  throw new Error(`SSRF Blocked: ${ssrfResult.error}`);
}

// 2. Fetch using connection-pinned SSRF agents
const { httpAgent, httpsAgent } = createSsrfAgents();
// Pass agents to http client (got, undici, or node-fetch)
```
