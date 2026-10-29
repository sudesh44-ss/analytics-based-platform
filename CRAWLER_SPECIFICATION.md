# SiteScope — Complete Crawler Architecture Specification

**Status:** Authoritative Specification & Historical Recovery  
**Target Ecosystem:** Monorepo (`worker`, `backend`, `shared`, `database`, `frontend`)

---

## 1. Executive Summary & Historical Requirements Recovery

SiteScope's auditing engine crawls client websites, discovers internal URL structures, extracts technical SEO metadata, identifies HTTP anomalies (broken links, 4xx/5xx errors), audits passive security headers, and benchmarks Core Web Vitals.

### 1.1 Core Engine Selection
1. **Primary Crawler:** **Crawlee (`CheerioCrawler`)**
   - Stream-based HTTP fetching via `got-scraping` + in-memory DOM traversal via `cheerio`.
   - Concurrency: 3–5 concurrent requests.
   - Per-page memory: ~20–50MB RAM (vs. 200MB+ for headless browser).
   - Speed: 50–100 pages/second on standard compute.
2. **Selective Browser Rendering:** **Crawlee (`PlaywrightCrawler`)**
   - Chromium headless browser.
   - Strictly reserved for client-side JavaScript SPAs, hydration testing, and explicit Pro-tier requests (`enableJs: true`).
   - Strict resource limits: 2 concurrent contexts, subresources (images, fonts, ads, trackers) aborted via `page.route()`.
3. **Performance Diagnostics:** **Google PageSpeed Insights API (Hybrid)**
   - Primary: Google PageSpeed Insights v5 REST API for real-world Chrome UX Report (CrUX) **Field Data** (LCP, INP, CLS p75) + Google-standard **Lab Data**.
   - Fallback: Local worker lab emulation baseline if the API key is unconfigured or rate-limited.
4. **Queue & Storage Orchestration:**
   - **Fastify REST API**: Accepts authenticated requests, performs SSRF validation, reserves PostgreSQL quotas, and enqueues jobs.
   - **BullMQ + Redis**: Asynchronous job queue, concurrency control, delayed retries, and worker coordination.
   - **PostgreSQL / Supabase**: Authoritative durable storage for audit jobs, crawled pages, issues, performance metrics, and quota ledger.

---

## 2. Crawling Rules & Operational Parameters

| Parameter | Previously Defined Rule | Current Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **Origin Bounding** | Strict origin matching (`url.origin === targetOrigin`) | **Implemented & Verified** | Crawlee `preNavigationHooks` aborts any request outside seed origin |
| **External Links** | Recorded as findings/references; never recursively crawled | **Implemented & Verified** | Extracted into `extracted_links` array; only internal links enqueued |
| **Max Crawl Depth** | Default 3 levels; Max 10 levels | **Implemented & Verified** | Enforced via `request.userData.depth < maxDepth` |
| **Request Timeout** | Default 15,000 ms (15s) | **Implemented & Verified** | Configurable via `navigationTimeoutSecs` (min 5s, max 60s) |
| **Concurrency** | 3–5 concurrent threads | **Implemented & Verified** | Default 3, capped at 5 in `worker/src/crawlers/cheerio.ts` |
| **Free Plan Limit** | 50 pages per crawl | **Implemented & Verified** | Default in `CreateAuditSchema` and `plans` table |
| **Pro Plan Limit** | 1,000 pages per crawl | **Configured in Database** | Defined in `plans` schema (`max_pages_per_audit = 1000`) |
| **HTTP Status Discovery** | Detect 200, 3xx, 4xx, 5xx & cross-link 404s | **Implemented & Verified** | Broken internal links resolved via `crawledPagesMap` lookup |
| **HTML Metadata** | Title, Meta Description, H1, Canonical, Robots | **Implemented & Verified** | Extracted via Cheerio selectors in `requestHandler` |
| **Scoring Weights** | SEO: 35%, Perf: 25%, Health: 25%, Sec: 15% | **Implemented & Verified** | Enforced in `worker/src/processors/scoring.ts` (`CATEGORY_WEIGHTS`) |
| **Daily Audit Quota** | Free: 3/day; Pro: 30/day | **Implemented & Verified** | Atomically reserved in PostgreSQL via `reserve_audit_quota` |
| **SSRF Gateway** | 5-layer validation, private IP block, cloud metadata block | **Implemented & Verified** | Canonical module in `shared/src/security/ssrf.ts` |
| **Playwright SPA Fallback**| Selective activation for SPA/JS pages | **Partially Implemented** | Schema allows `enableJs: true`, but worker Cheerio pipeline is primary |
| **Robots.txt & Sitemap**| Automatic parser and obey directives | **Missing** | Planned Crawlee robots.txt integration not yet active |
| **Per-Origin Rate Limit** | Crawl delay politeness | **Partially Implemented** | Crawlee pool throttles concurrency, but dedicated delay unset |
| **Response Size Ceiling** | 10MB HTTP response truncation | **Partially Implemented** | Header checked (`content-length`), stream truncation needed |
