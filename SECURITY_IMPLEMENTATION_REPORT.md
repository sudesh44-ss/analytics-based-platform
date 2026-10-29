# SiteScope — Security Implementation & Hardening Report

**Report Date**: October 2026  
**Status**: Implemented & Verified  
**Auditor**: Senior Backend Security Engineer  

---

## 1. Summary of Files Changed & Created

| File Path | Action | Description of Security Enhancement |
| :--- | :--- | :--- |
| [`shared/src/security/ssrf.ts`](file:///H:/analytics-based-platform/shared/src/security/ssrf.ts) | **Created** | Canonical 5-layer SSRF validation module, IPv6 unbracket parser, IPv4-mapped IPv6 unwrap, cloud metadata blocklist, and `createSsrfLookup` connection-time DNS rebinding protection. |
| [`shared/src/security/index.ts`](file:///H:/analytics-based-platform/shared/src/security/index.ts) | **Created** | Export barrel for canonical security utilities. |
| [`shared/src/index.ts`](file:///H:/analytics-based-platform/shared/src/index.ts) | **Updated** | Re-exports `security` package across the monorepo. |
| [`shared/package.json`](file:///H:/analytics-based-platform/shared/package.json) | **Updated** | Added `ipaddr.js` dependency to `@sitescope/shared`. |
| [`backend/src/services/ssrf.ts`](file:///H:/analytics-based-platform/backend/src/services/ssrf.ts) | **Updated** | Re-exports from canonical `@sitescope/shared` security layer, eliminating code duplication and ensuring consistent rules. |
| [`backend/src/app.ts`](file:///H:/analytics-based-platform/backend/src/app.ts) | **Updated** | Registered `@fastify/rate-limit` globally with 100 req/min sliding-window limit per IP and standardized 429 response formatting. |
| [`backend/src/middleware/auth.ts`](file:///H:/analytics-based-platform/backend/src/middleware/auth.ts) | **Updated** | Hardened authentication middleware: strictly disabled `dev-token` bypass in production/staging environments, requiring explicit `ALLOW_DEV_AUTH_BYPASS === 'true'` only in development. |
| [`worker/src/security/ssrf.ts`](file:///H:/analytics-based-platform/worker/src/security/ssrf.ts) | **Updated** | Re-exports from canonical `@sitescope/shared` security layer. |
| [`backend/tests/ssrf.test.ts`](file:///H:/analytics-based-platform/backend/tests/ssrf.test.ts) | **Updated** | Expanded test suite to 20 automated tests covering IPv4-mapped IPv6, IPv6 loopback, cloud metadata hostnames, dword/hex IP notations, port filtering, and URL length limits. |
| [`worker/tests/ssrf.test.ts`](file:///H:/analytics-based-platform/worker/tests/ssrf.test.ts) | **Updated** | Added tests for IPv6 loopback, link-local, IPv4-mapped IPv6, and direct utility assertions. |
| [`SECURITY_BASELINE.md`](file:///H:/analytics-based-platform/SECURITY_BASELINE.md) | **Created** | 10 mandatory security directives for all current and future backend development. |
| [`SSRF_AUDIT.md`](file:///H:/analytics-based-platform/SSRF_AUDIT.md) | **Created** | Comprehensive attack surface analysis, threat vectors, port policy, and DNS rebinding mitigations. |

---

## 2. Key Security Findings Resolved

### Finding 1: IPv6 Bracket Literal Validation Skip (High)
- **Vulnerability**: URLs with IPv6 hostnames (e.g. `http://[::1]` or `http://[fe80::1]`) retained brackets in `parsed.hostname`, causing `ipaddr.isValid` to return `false` and potentially evading direct IP checks.
- **Resolution**: Implemented bracket-stripping normalization (`cleanHostname = rawHostname.replace(/^\[|\]$/g, '')`) before calling `ipaddr.isValid`.

### Finding 2: IPv4-Mapped IPv6 Subnet Evasion (High)
- **Vulnerability**: Attackers could submit IPv6 addresses representing internal IPv4 subnets (e.g. `http://[::ffff:127.0.0.1]` or `http://[::ffff:169.254.169.254]`).
- **Resolution**: Enhanced validator to detect `isIPv4MappedAddress()`, convert to canonical IPv4 via `toIPv4Address()`, and evaluate against all IPv4 loopback, RFC 1918, link-local, and cloud metadata rules.

### Finding 3: Time-of-Check / Time-of-Use (TOCTOU) DNS Rebinding (High)
- **Vulnerability**: A malicious DNS server returning a public IP during pre-flight validation could rebind to `127.0.0.1` at the moment the HTTP client connects.
- **Resolution**: Implemented `createSsrfLookup` and `createSsrfAgents` providing socket connection-time DNS validation for Node.js `http.Agent` and `https.Agent`.

### Finding 4: Insecure Authentication Bypass in Backend Middleware (High)
- **Vulnerability**: `backend/src/middleware/auth.ts` previously accepted `dev-token` or placeholder `SUPABASE_URL` without verifying production environment constraints.
- **Resolution**: Prohibited bypass in production and staging (`NODE_ENV === 'production' || NODE_ENV === 'staging'`). Required explicit `ALLOW_DEV_AUTH_BYPASS === 'true'` flag only in development.

### Finding 5: Unregistered Rate Limiter on API Endpoints (Medium)
- **Vulnerability**: `@fastify/rate-limit` was installed in dependencies but not registered in `backend/src/app.ts`, leaving public and expensive endpoints open to flood abuse.
- **Resolution**: Registered `@fastify/rate-limit` globally with a 100 requests per minute sliding window per IP.

---

## 3. Automated Test Verification Results

### Backend Test Suite (`backend/tests/`)
- Command: `npx tsx --test tests/health.test.ts tests/ssrf.test.ts`
- **Result: 20/20 PASS (100%)**
  - Fastify Health Route (HTTP 200 OK)
  - Rejects loopback IPv4 127.0.0.1
  - Rejects localhost hostname
  - Rejects cloud metadata IP 169.254.169.254
  - Rejects cloud metadata hostnames (`metadata.google.internal`)
  - Rejects RFC 1918 private IP 10.0.0.1
  - Rejects RFC 1918 private IP 192.168.1.1
  - Rejects non-HTTP protocols (file, ftp, gopher, ws)
  - Rejects embedded credentials in URL
  - Rejects disallowed internal ports (6379, 5432, 22)
  - Rejects IPv6 loopback `[::1]`
  - Rejects IPv6 link-local `[fe80::1]`
  - Rejects IPv6 cloud metadata `[fd00:ec2::254]`
  - Rejects IPv4-mapped IPv6 `[::ffff:127.0.0.1]`
  - Rejects IPv4-mapped IPv6 cloud metadata `[::ffff:169.254.169.254]`
  - Rejects decimal dword and hex IP notation for loopback
  - Rejects URLs exceeding maximum permitted length (2048 chars)
  - `isIpAddressDisallowed` utility directly identifies illegal IP ranges

### Worker Test Suite (`worker/tests/`)
- Command: `npx tsx --test tests/notifications.test.ts tests/pagespeed.test.ts tests/scoring.test.ts tests/seo-rules.test.ts tests/ssrf.test.ts`
- **Result: 24/24 PASS (100%)**
  - Resend audit completion email simulation
  - Resend critical security alert email simulation
  - PageSpeed Insights Core Web Vitals extraction & lab emulation fallback
  - Scoring engine mathematical accuracy & 100-point composite score
  - SEO rule engine missing title, H1, and 404 detection
  - Worker SSRF defense layers (IPv4, IPv6, ports, metadata, mapped IPs)

---

## 4. Remaining Risks & Defense-in-Depth Recommendations

1. **Infrastructure Network Egress Rules**:
   - In production cloud deployments (Render, AWS, GCP), configure egress security groups or iptables rules that drop outbound traffic from worker containers to `169.254.169.254` and `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
2. **Headless Browser Subresource Isolation**:
   - If Playwright browser automation is expanded to evaluate client-side Single Page Applications (SPAs), route all browser traffic through an egress proxy enforcing the same SSRF gateway on all subresources (iframes, WebSockets, scripts).
3. **Distributed Redis Rate Limiting**:
   - For horizontally scaled backend instances, configure `@fastify/rate-limit` to use a shared Redis store via `redisConnection`.
