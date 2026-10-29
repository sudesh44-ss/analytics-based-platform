# SiteScope — Crawler Implementation Roadmap & Task Specifications

This ordered implementation plan outlines the prioritized engineering tasks to complete remaining crawler capabilities without duplicating existing infrastructure.

---

## 1. Prioritized Task Roadmap

| Task ID | Component / Milestone | Priority | Estimated Effort | Risk Level | Target Release |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CRW-01** | Crawler Response Headers Persistence & Inspection | **P0 (Critical)** | 4 hours | Low | v1.1 |
| **CRW-02** | Security Header Rules Engine (HSTS, CSP, X-Frame) | **P0 (Critical)** | 4 hours | Low | v1.1 |
| **CRW-03** | Playwright SPA Crawler Worker Branch (`enableJs`) | **P1 (High)** | 8 hours | Medium | v1.1 |
| **CRW-04** | Expanded SEO Rules (Image Alt, Duplicate Titles) | **P1 (High)** | 4 hours | Low | v1.1 |
| **CRW-05** | Robots.txt and Sitemap.xml Parsing Pipeline | **P2 (Medium)** | 6 hours | Low | v1.2 |
| **CRW-06** | Multi-URL PageSpeed Auditing (Top 3 Templates) | **P2 (Medium)** | 4 hours | Low | v1.2 |
| **CRW-07** | Job Cancellation & Graceful Teardown Handler | **P2 (Medium)** | 4 hours | Medium | v1.2 |
| **CRW-08** | Google Analytics 4 & Search Console OAuth Sync | **P3 (Planned)** | 16 hours | High | v2.0 |

---

## 2. Detailed Task Specifications

### Task CRW-01: Crawler Response Headers Persistence & Inspection
- **Objective:** Capture HTTP response headers during Cheerio crawl to enable deep security header analysis.
- **Affected Files:**
  - `worker/src/crawlers/cheerio.ts`: Capture `response.headers` into `CrawledPageData`.
  - `worker/src/processors/seo-rules.ts`: Pass response headers into rule evaluation.
- **Dependencies:** Existing `crawlee` CheerioCrawler request handler.
- **Acceptance Criteria:** Every crawled page record stores lowercase response headers (`strict-transport-security`, `content-security-policy`, `x-frame-options`, `x-content-type-options`).

### Task CRW-02: Security Header Rules Engine
- **Objective:** Add automated checks for missing security headers.
- **Rules to Implement:**
  1. `SEC_MISSING_HSTS`: Absence of `Strict-Transport-Security` on HTTPS domains.
  2. `SEC_MISSING_CSP`: Absence of `Content-Security-Policy`.
  3. `SEC_MISSING_FRAME_OPTIONS`: Absence of `X-Frame-Options` and `frame-ancestors`.
  4. `SEC_MISSING_CONTENT_TYPE_OPTIONS`: Absence of `X-Content-Type-Options: nosniff`.
- **Affected Files:** `worker/src/processors/seo-rules.ts`.
- **Acceptance Criteria:** Automatically records structured `issues` under `category: 'SECURITY'`, reducing `securityScore` proportionally.

### Task CRW-03: Playwright SPA Crawler Worker Branch
- **Objective:** Execute Crawlee's `PlaywrightCrawler` when `auditJob.config.enableJs === true`.
- **Affected Files:**
  - `worker/src/crawlers/playwright.ts`: Create Playwright crawler module with SSRF request interception and ad/tracker route aborting.
  - `worker/src/index.ts`: Branch crawler execution based on `config.enableJs`.
- **Dependencies:** `playwright` (installed in monorepo).
- **Acceptance Criteria:** Capable of rendering JavaScript SPAs and extracting dynamic DOM content while enforcing max concurrency = 2 and SSRF route interception.

### Task CRW-04: Expanded SEO Rules Engine
- **Objective:** Implement missing checks for image alt attributes and duplicate titles/descriptions.
- **Rules to Implement:**
  1. `SEO_MISSING_IMAGE_ALT`: Evaluates `$('img:not([alt])')` and records affected image URLs.
  2. `SEO_DUPLICATE_TITLE`: Groups all crawled page titles and flags pages sharing identical titles.
  3. `SEO_DUPLICATE_META_DESCRIPTION`: Groups descriptions and flags duplicates.
- **Affected Files:** `worker/src/processors/seo-rules.ts`.
- **Acceptance Criteria:** New findings surface cleanly on `/audits` and reduce `seoScore` via logarithmic damping.

### Task CRW-05: Robots.txt & Sitemap.xml Pipeline
- **Objective:** Fetch and parse `/robots.txt` and `/sitemap.xml` prior to seed crawl.
- **Affected Files:** `worker/src/crawlers/cheerio.ts`.
- **Acceptance Criteria:** Warns if robots.txt disallows crawl or if sitemap URLs return 404s.
