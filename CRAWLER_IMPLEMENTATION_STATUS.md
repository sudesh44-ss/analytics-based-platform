# SiteScope — Crawler Implementation Status & Feature Audit

This matrix distinguishes historical requirements from current code presence and runtime verification.

---

## 1. Comprehensive Feature Status Matrix

| Component / Requirement | Historical Requirement | Current Code File | DB Schema Support | Status | Runtime Evidence & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HTTP Crawling Engine** | Crawlee CheerioCrawler | `worker/src/crawlers/cheerio.ts` | `crawled_pages` | **Implemented & Verified** | Full Crawlee pipeline with bounded queue |
| **Origin Bounding** | Restrict crawl to seed origin | `worker/src/crawlers/cheerio.ts:119` | N/A | **Implemented & Verified** | Checked in `preNavigationHooks` |
| **Max Depth Limiting** | Default 3, max 10 | `worker/src/crawlers/cheerio.ts:67` | `audit_jobs.config` | **Implemented & Verified** | Checked prior to `addRequests` |
| **Page Crawl Ceiling** | Free: 50, Pro: 1000 | `worker/src/crawlers/cheerio.ts:66` | `plans.max_pages_per_audit` | **Implemented & Verified** | Passed as `maxRequestsPerCrawl` |
| **Request Concurrency** | 3–5 concurrent threads | `worker/src/crawlers/cheerio.ts:68` | N/A | **Implemented & Verified** | Default 3, max 5 |
| **Request Timeout** | 15s default | `worker/src/crawlers/cheerio.ts:69` | N/A | **Implemented & Verified** | Handled in `navigationTimeoutSecs` |
| **HTML Metadata Extraction**| Title, Meta Desc, H1, Canonical | `worker/src/crawlers/cheerio.ts:145` | `crawled_pages` fields | **Implemented & Verified** | Cheerio selectors parse HTML |
| **Broken Link Discovery** | Match internal links to 404s | `worker/src/crawlers/cheerio.ts:300` | `extracted_links` / `issues` | **Implemented & Verified** | Cross-matched via `crawledPagesMap` |
| **SSRF Multi-Layer Gateway**| DNS, IP block, rebinding, metadata | `shared/src/security/ssrf.ts` | N/A | **Implemented & Verified** | 20+ automated tests passing |
| **Daily Quota Reservation** | Atomic DB decrement | `backend/src/routes/audits.ts:42` | `usage_ledger` | **Implemented & Verified** | PostgreSQL `reserve_audit_quota` RPC |
| **Composite Health Scoring**| SEO 35%, Perf 25%, Health 25%, Sec 15% | `worker/src/processors/scoring.ts` | `audit_summaries` | **Implemented & Verified** | Verified in `tests/scoring.test.ts` |
| **PageSpeed Insights** | Google API + lab fallback | `worker/src/services/pagespeed.ts` | `performance_metrics` | **Implemented & Verified** | Verified in `tests/pagespeed.test.ts` |
| **Notification Engine** | Email / Webhook on finish | `worker/src/services/notifications.ts` | N/A | **Implemented & Verified** | Resend & Slack/Discord webhooks |
| **Playwright SPA Crawler** | Headless browser for JS pages | Referenced in docs & config | `audit_jobs.config.enableJs` | **Partially Implemented** | Flag accepted in schema; worker needs dedicated Playwright branch |
| **Robots.txt & Sitemap** | Automatic directive adherence | Mentioned in specification | N/A | **Missing** | Crawlee native robots.txt parser unconfigured |
| **Security Header Rules** | HSTS, CSP, X-Frame-Options | Mentioned in security spec | `issues` (category: `SECURITY`) | **Partially Implemented** | HTTPS checked; response header rules needed |
| **Image Alt Scanner** | Flag images missing alt | Mentioned in SEO spec | `issues` (category: `SEO`) | **Missing** | Needs Cheerio `img:not([alt])` evaluation |
| **Duplicate Metadata** | Flag duplicate titles/meta | Mentioned in SEO spec | `issues` (category: `SEO`) | **Missing** | Cross-page aggregation needed |
| **GA4 / Search Console** | Third-party analytics sync | Mentioned in features | `analytics_connections` | **Missing / Planned** | Database schema exists; OAuth API sync needed |
