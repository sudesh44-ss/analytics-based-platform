# SiteScope — Background Worker & Crawler

Background processing worker running on Render Background Worker.

## Responsibilities
- **URL Discovery & Crawling**: Crawlee CheerioCrawler with bounded concurrency (5).
- **SPA Rendering**: Selective Playwright execution for JavaScript-heavy client apps.
- **Rule Engine**: Technical SEO, broken links, redirect loops, and security headers.
- **Scoring Engine**: Multi-category weighted calculation (SEO 35%, Performance 25%, Health 25%, Security 15%).
- **Performance**: Google PageSpeed Insights API queries for lab and CrUX field metrics.
- **Incremental Persistence**: Batched database writes (25 pages/batch) with worker heartbeat.

## Local Execution
```bash
npm run dev
```
