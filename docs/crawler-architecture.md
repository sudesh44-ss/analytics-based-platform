# SiteScope — Crawler Architecture Specification

## 1. Executive Summary & Objective

SiteScope is an enterprise-grade Website Analytics & Auditor SaaS. The audit engine must crawl client websites safely, discover internal URLs, extract technical SEO metadata, detect broken links, identify redirect loops, inspect security headers, and evaluate core web vitals and performance.

This document defines the production crawler architecture, technology selection, worker deployment requirements, and operational constraints.

---

## 2. Crawler Technology Selection

### A. Primary Crawler Engine: Crawlee (`CheerioCrawler`)
- **Official Repository**: [https://github.com/apify/crawlee](https://github.com/apify/crawlee)
- **Official Documentation**: [https://crawlee.dev/](https://crawlee.dev/)
- **Selected Package**: `crawlee` (v3.12+) with `cheerio`
- **Role**: Primary URL discovery, HTTP response parsing, metadata extraction, link graph traversal, and HTTP header inspection.

#### Why `CheerioCrawler` is the Default:
1. **Resource Efficiency**: `CheerioCrawler` operates purely over raw HTTP streams with `got-scraping` and in-memory DOM parsing via `cheerio`. It requires ~20-50MB of RAM per concurrent crawl thread, compared to ~150-300MB for a headless Chromium process.
2. **Throughput**: Processes 50-100 pages per second on standard vCPU allocations, enabling the Free tier (50 pages) to complete in under 5 seconds and Pro tier (1,000 pages) in under 90 seconds.
3. **Deterministic Network Interception**: Raw HTTP requests allow direct access to socket-level IP resolution, redirect hops, exact byte lengths, TLS handshake metadata, and raw HTTP response headers.

### B. Selective Browser Rendering: Crawlee (`PlaywrightCrawler`)
- **Official Repository**: [https://github.com/microsoft/playwright](https://github.com/microsoft/playwright)
- **Official Documentation**: [https://playwright.dev/](https://playwright.dev/)
- **Selected Package**: `playwright` (v1.49+) with Chromium
- **Role**: Fallback execution for Single Page Applications (SPAs), client-side rendered DOM hydration, and JavaScript execution auditing.

#### Strict Activation Triggers for Playwright:
Playwright is **never** invoked for every page by default. It is triggered only when one of the following conditions is met:
1. **User Configuration**: User explicitly selected the `Enable JavaScript Rendering` audit option (Pro tier entitlement).
2. **SPA Shell Detection**: The initial HTML returned by `CheerioCrawler` contains fewer than 50 visible text characters or matches known SPA mount patterns (e.g., `<div id="root"></div>`, `<div id="__next"></div>` with empty body, `<app-root></app-root>`), but contains client-side bundle scripts.
3. **Structured Data Injection**: Canonical tags, headings, or OpenGraph meta tags are absent in raw HTML but detected in client-side script blocks.

#### Playwright Resource Boundaries:
- Maximum concurrent browser contexts per worker instance: **2**
- Browser page navigation timeout: **15,000 ms**
- JavaScript execution timeout: **5,000 ms**
- Disabled sub-resources: Images, video, audio, custom fonts, analytics trackers, and third-party advertising scripts are blocked via `page.route()` to save memory and CPU.
- Ephemeral contexts: Every audited page creates a brand new incognito `BrowserContext` that is immediately closed after DOM snapshot extraction to prevent memory leaks.

---

## 3. Performance Auditing: Lighthouse vs. PageSpeed Insights

### Evaluation Matrix

| Criterion | Self-Hosted Lighthouse in Worker | Google PageSpeed Insights (PSI) API | SiteScope Decision |
| :--- | :--- | :--- | :--- |
| **Operational Cost** | High CPU & RAM footprint (requires full Chromium run per URL) | Free tier available (25,000 queries/day with API key) | **Hybrid Strategy** |
| **Lab vs. Field Data** | Provides synthetic Lab measurements only (LCP, TBT, CLS, FCP) | Provides both real-world Chrome User Experience Report (CrUX) **Field Data** and **Lab Data** | **PageSpeed Insights API as Primary** for accuracy & field metrics |
| **Concurrency & Scaling** | 1 test per worker CPU core; worker starvation risk | Offloads execution to Google infrastructure; zero worker CPU spike | Eliminates worker compute bottleneck |
| **Repeatability** | Varies depending on worker cloud container load | Google standard test runners provide reproducible lab environment | Google PSI ensures industry-standard benchmarking |
| **Self-Hosted Fallback** | Required when target website is behind internal staging or authorization | Cannot audit private domains or non-resolvable public URLs | **Self-hosted Lighthouse in Worker as Fallback** for private/staging audits |

### Performance Audit Protocol
1. **Primary**: Worker calls Google PageSpeed Insights v5 REST API with desktop and mobile strategies.
2. **Metric Classification**:
   - **Lab Data**: Largest Contentful Paint (LCP), First Contentful Paint (FCP), Cumulative Layout Shift (CLS), Total Blocking Time (TBT), Speed Index.
   - **Field Data (CrUX)**: Real-user 75th percentile distributions (p75) for LCP, Interaction to Next Paint (INP), and CLS. If insufficient field data exists, UI explicitly flags it as `"Insufficient Real-User Field Data"`.
3. **Quotas**: Limited to top 3 selected representative URLs per project in Pro tier (e.g., Homepage, primary category/landing page, primary article/product page).

---

## 4. Evaluated and Rejected Alternatives

| Library / Tool | Evaluation Result | Rationale for Rejection |
| :--- | :--- | :--- |
| **Raw Axios / Cheerio** | Rejected | Lacks native queue management, auto-throttling, memory-based concurrency scaling, robots.txt parsing, and session persistence. |
| **Puppeteer Standalone** | Rejected | Crawlee's Playwright integration offers superior cross-platform isolation, better request interception, modern async APIs, and reduced memory footprint. |
| **Scrapy (Python)** | Rejected | Introducing Python into a TypeScript/Node.js monorepo creates dual runtime overhead, complex CI/CD builds, and disjointed type contracts. |
| **Selenium WebDriver** | Rejected | Outdated architecture, heavy JVM or binary driver dependencies, slow execution speed compared to modern CDP/Playwright. |

---

## 5. System Architecture & Worker Topology

```text
  [Fastify REST API]
          │
          ▼ Enqueue Audit Job (Idempotent)
  [BullMQ / Redis Queue]
          │
          ▼ Pull Job Payload
  [Render Background Worker]
          ├── 1. SSRF URL & DNS Validation (Pre-flight check)
          ├── 2. Crawlee CheerioCrawler (Main crawl loop, max concurrency = 5)
          │        ├── Robots.txt check
          │        ├── Page fetch & Link discovery
          │        ├── SEO metadata extraction
          │        └── Incremental persistence to PostgreSQL
          ├── 3. Selective Playwright Crawler (SPA fallbacks only, max concurrency = 1)
          ├── 4. Performance Engine (Google PSI API query for top 3 URLs)
          ├── 5. Security Header & SSL Inspector
          └── 6. Scoring Engine & Finalization -> Notify API / DB
```

---

## 6. Runtime & Deployment Requirements

- **Node.js Compatibility**: Node.js 20.x or 22.x LTS.
- **Worker Infrastructure**: Render Background Worker (Standard service type: 1 vCPU, 2GB RAM minimum to comfortably accommodate selective Playwright Chromium).
- **Environment Dependencies**:
  - Chromium dependencies (`libnss3`, `libatk1.0-0`, `libcups2`, `libxcomposite1`, `libxdamage1`, `libxrandr2`, `libgbm1`, `libpango-1.0-0`). Installed via `npx playwright install-deps chromium`.
- **License Compliance**:
  - `crawlee`: Apache-2.0 (Permissive SaaS use).
  - `playwright`: Apache-2.0 (Permissive SaaS use).
  - `cheerio`: MIT (Permissive SaaS use).
  - `lighthouse`: Apache-2.0 (Permissive SaaS use).
