# SiteScope — Crawler & Analytics Testing Suite Specification

## 1. Testing Philosophy & Scope

SiteScope handles customer network interactions, payment entitlements, security configurations, and technical analytics. Automated testing is mandatory across all layers before any production deployment.

**Testing Principles**:
- **Zero Mocking of Security Boundaries**: SSRF defense tests, IP parsing, and network filtering run against real network socket and DNS interceptor fixtures.
- **Deterministic Test Data**: Synthetic fixtures are strictly labeled `[FIXTURE_DATA]` to prevent confusion with live customer records.
- **Isolation**: Integration tests run against an ephemeral Supabase test container or isolated schema with automatic teardown.

---

## 2. Test Suites Overview

### Suite A: Unit Tests (Fast, Isolated, In-Memory)
1. **URL Normalizer & Canonicalizer**:
   - Stripping default ports (`:80`, `:443`).
   - Removing trailing slashes, sorting query parameters deterministically.
   - Removing tracking parameters (`utm_*`, `fbclid`, `gclid`).
   - Unicode/IDN domain Punycode conversion.
2. **SSRF Validator & IP Filter**:
   - Rejection of RFC 1918 addresses (`10.x`, `172.16.x`, `192.168.x`).
   - Rejection of Loopback (`127.0.0.1`, `::1`).
   - Rejection of Cloud Metadata (`169.254.169.254`).
   - Rejection of IPv4-mapped IPv6 (`::ffff:127.0.0.1`, `::ffff:7f00:1`).
   - Rejection of octal, decimal, and hex IP formats (`0177.0.0.1`, `2130706433`, `0x7f000001`).
   - Rejection of non-HTTP schemes (`file://`, `gopher://`, `ftp://`).
3. **Scoring Engine**:
   - Exact mathematical calculation of category weights (SEO 35%, Performance 25%, Health 25%, Security 15%).
   - Normalization when a category is excluded (provisional scoring).
   - Deduplication of multiple occurrences of the same rule on identical URLs.
4. **Quota Calculation**:
   - Free vs. Pro limit verification.
   - Atomic decrement and rollback logic.

---

### Suite B: Crawler & Worker Integration Tests
1. **Mock HTTP Server Fixture**:
   - Local HTTP test server serving a synthetic 50-page web graph with deliberate SEO issues:
     - 5 pages with duplicate `<title>` and missing `<meta description>`.
     - 3 broken internal links (`404 Not Found`).
     - 2 circular redirect loops (`A -> B -> A`).
     - 1 deep redirect chain (`A -> B -> C -> D -> E -> F`).
     - 1 page with invalid canonical URL pointing to external domain.
     - 1 page protected by `robots.txt` Disallow rule.
2. **Crawl Engine Execution**:
   - Launch Crawlee against the local mock target.
   - Verify page discovery count matches expected graph.
   - Verify `robots.txt` compliance: disallowed page is skipped and recorded in `skipped_pages`.
   - Verify redirect chain detection: records all intermediate hops without entering infinite loops.
   - Verify batch insertion into `crawled_pages` and `issues` tables in PostgreSQL.
3. **Playwright SPA Rendering Test**:
   - Serve a client-side React app rendering empty HTML shell with client-injected `<title>` and `<h1>`.
   - Verify Crawlee flags page for selective Playwright rendering.
   - Verify Playwright extracts hydrated title and heading.
   - Verify browser context is completely closed and destroyed post-audit.

---

### Suite C: Security & Adversarial SSRF Test Suite
1. **DNS Rebinding Attack Simulation**:
   - Local mock DNS server configured with TTL = 0 that resolves to `1.1.1.1` on Query 1 and `127.0.0.1` on Query 2.
   - Verify custom `http.Agent` pins initial resolved IP and blocks the request before TCP handshake with `127.0.0.1`.
2. **Redirect-Based SSRF Bypass**:
   - Target server returns `HTTP 302 Location: http://169.254.169.254/latest/meta-data/`.
   - Verify crawler intercepts redirect, resolves destination, detects link-local metadata range, and aborts with `SSRF_DISALLOWED_DESTINATION`.
3. **Cross-Tenant Isolation & RLS Verification**:
   - Create two test users (`User A` and `User B`) with separate projects.
   - Execute queries from User A's JWT token attempting to read or mutate User B's audit jobs, pages, findings, and reports.
   - Verify PostgreSQL RLS blocks read/write with zero rows returned or `403 Forbidden`.

---

### Suite D: End-to-End Analytics & Chart Integrity Tests
1. **Chart Aggregation vs. Database Row Totals**:
   - Seed database with 482 crawled pages and 38 issues.
   - Query `/api/v1/dashboard/summary`.
   - Assert `kpi.totalPagesCrawled === 482` and `kpi.totalIssuesCount === 38`.
   - Assert sum of severity counts (`2 + 7 + 15 + 14 + 8 === 46` including info) matches issue status sums.
2. **Date Boundaries & Timezones**:
   - Verify queries spanning UTC midnight boundaries aggregate correctly without duplicate or missing days.
3. **Worker Crash & Heartbeat Recovery**:
   - Start an audit job.
   - Send `SIGKILL` to the worker process during crawling.
   - Execute stale job sweeper.
   - Verify job is automatically flagged for retry or marked as failed with quota refunded.
