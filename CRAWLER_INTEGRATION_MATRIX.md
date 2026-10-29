# SiteScope — Crawler Integration Matrix (Multi-Feature Powering)

A single crawler execution produces structured artifacts that are analyzed and partitioned across four distinct dashboard domains.

---

## 1. Feature Integration Breakdown

```text
                                [Raw Crawl Execution]
                                (Cheerio / Playwright)
                                          │
       ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
       ▼                  ▼                               ▼                  ▼
[Technical SEO]   [Performance & Vitals]          [Security Audits]     [Analytics Snapshots]
  - Title tags      - Core Web Vitals (LCP/INP/CLS) - HTTPS enforcement   - GA4 / Search Console
  - H1 headings     - Lab Metrics (FCP/TBT/SI)      - Security headers    - (External OAuth)
  - Meta desc       - Slow page latency (TTFB)      - Mixed content       - (Separate API)
  - Canonical       - Rendering bottlenecks         - Broken links        - (Not crawler data)
  - Broken links    - PageSpeed Opportunities       - Server errors
```

### 1.1 Technical SEO (`/audits`)
- **Data Model:** `crawled_pages` and `issues` (where `category = 'SEO'` or `'TECHNICAL_HEALTH'`).
- **Crawler Input:** Discovered HTML documents, tag structure, internal link graph, HTTP status codes.
- **Implemented Checks:**
  1. `SEO_MISSING_TITLE`: Missing or blank `<title>` element.
  2. `SEO_MISSING_META_DESCRIPTION`: Missing `<meta name="description">`.
  3. `SEO_MISSING_H1`: Missing or empty `<h1>` heading.
  4. `SEO_MISSING_CANONICAL`: Absence of `<link rel="canonical">`.
  5. `SEO_NOINDEX_DIRECTIVE`: Presence of `noindex` in robots directive.
  6. `HEALTH_CLIENT_ERROR`: HTTP 4xx status codes.
  7. `HEALTH_SERVER_ERROR`: HTTP 5xx server exceptions.
  8. `HEALTH_BROKEN_LINK`: Internal links pointing to confirmed 404 targets.
- **Gaps / Planned:**
  - Duplicate title/meta detection across crawled pages.
  - Heading hierarchy verification (multiple H1s, skipped H2/H3 levels).
  - OpenGraph / Twitter card metadata validation.
  - Image alt attribute scanner.
  - Robots.txt and sitemap.xml fetch and parse.

### 1.2 Performance & Core Web Vitals (`/audits/performance`)
- **Data Model:** `performance_metrics` and `crawled_pages.response_time_ms`.
- **Crawler vs. Performance Engine Distinction:**
  - The crawler discovers pages and records raw HTTP network latency (`responseTimeMs` / TTFB).
  - High-fidelity performance benchmarking is delegated to the **Google PageSpeed Insights API** (with local lab fallback), testing key landing pages.
- **Implemented Metrics:**
  - **Field Data (CrUX):** LCP (p75), INP (p75), CLS (p75).
  - **Lab Data (Lighthouse):** FCP, TBT, Speed Index, Accessibility Score, Best Practices Score.
  - **Latency Bottlenecks:** Crawled internal URLs sorted descending by response time.
- **Gaps / Planned:**
  - Multi-URL PageSpeed execution (currently benchmarks target seed URL; planned top 3 representative URLs).
  - Desktop vs Mobile dual-strategy toggles in worker pipeline.

### 1.3 Security Audits (`/audits/security`)
- **Data Model:** `issues` (where `category = 'SECURITY'`).
- **Scope & Limitations:**
  - Operates as a **passive external hygiene scanner**.
  - It does NOT perform destructive penetration testing, credential stuffing, or exploit payloads.
- **Implemented Checks:**
  1. `SEC_INSECURE_HTTP`: Flags any internal URL loaded over unencrypted `http://`.
- **Gaps / Planned:**
  - Strict Transport Security (`Strict-Transport-Security` / HSTS) header inspection.
  - Content Security Policy (`Content-Security-Policy` / CSP) presence & directive analysis.
  - Clickjacking protection (`X-Frame-Options` / `frame-ancestors`).
  - MIME-sniffing protection (`X-Content-Type-Options: nosniff`).
  - Cookie security flags (`Secure`, `HttpOnly`, `SameSite`).
  - Mixed content scanner (HTTP images/scripts loaded inside HTTPS pages).

### 1.4 External Analytics (Google Analytics 4 & Search Console)
- **Data Model:** `analytics_connections` and `analytics_snapshots`.
- **Architectural Boundary:**
  - Crawler data is strictly structural/technical; it CANNOT measure visitor traffic, pageviews, bounce rate, or search impressions.
  - Third-party analytics are pulled via OAuth2 API connections to Google Analytics 4 (Data API) and Google Search Console API.
- **Current Status:**
  - Database schema (`analytics_connections`, `analytics_snapshots`) exists.
  - OAuth flow and synchronization worker endpoints are currently **planned / missing**; no fake data is generated.
