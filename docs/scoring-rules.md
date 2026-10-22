# SiteScope — Scoring Engine & Rule Weighting Specification

## 1. Overview & Objective

SiteScope generates a deterministic, transparent health score (0 to 100) that gives website owners an instant diagnostic benchmark.

**Scoring Philosophy**:
1. **Explainable Mathematics**: Scores are derived from explicit category weights and documented severity penalties.
2. **Provisional Scoring**: If an audit module is unselected (e.g., Performance was omitted), the platform **never scores it zero**. The score is normalized across tested categories and explicitly marked `PROVISIONAL`.
3. **No Unfair Stacking**: If the same rule fails on 500 pages (e.g. Missing Meta Description), the score impact is capped at the rule level to prevent a single systemic template issue from crashing the entire domain score to zero.

---

## 2. Weight Distribution by Category

| Category | Weight Proposal | Focus Areas |
| :--- | :--- | :--- |
| **Technical SEO** | **35%** | Meta titles, descriptions, canonical tags, heading structure, robots directives, structured data. |
| **Performance** | **25%** | Core Web Vitals (LCP, INP, CLS), First Contentful Paint, Total Blocking Time, mobile/desktop scores. |
| **Technical Health** | **25%** | HTTP 4xx/5xx errors, broken internal/external links, redirect chains & loops, sitemap integrity, mixed content. |
| **Basic Security** | **15%** | HTTPS configuration, SSL validity, security headers (CSP, HSTS, X-Frame-Options), exposed sensitive files. |
| **Total** | **100%** | Comprehensive SiteScope Composite Score |

---

## 3. Severity Deduction Scale & Rule Caps

Each category starts at **100 points**. Identified findings apply negative point penalties:

| Finding Severity | Penalty per Distinct Rule | Max Stacked Penalty per Rule | Description |
| :--- | :--- | :--- | :--- |
| **`CRITICAL`** | **-10.0 points** | -15.0 points | Fundamental blockers: Domain not resolving, SSL expired, sitewide `noindex` tag. |
| **`HIGH`** | **-5.0 points** | -10.0 points | Major SEO or health degradation: Broken internal links on key landing pages, missing canonical tags. |
| **`MEDIUM`** | **-2.0 points** | -5.0 points | Significant issues: Missing meta descriptions, multi-hop redirect chains, missing H1 tags. |
| **`LOW`** | **-0.5 points** | -2.0 points | Optimization opportunities: Images missing `alt` attributes, heading hierarchy skipped level. |
| **`INFO`** | **0.0 points** | 0.0 points | Observations: Discovered external links, sitemap location noticed. |

### Mathematical Formula:
$$CategoryScore = \max\left(0, 100 - \sum \min\left(Penalty_{rule} \times \log_2(occurrences + 1), Cap_{rule}\right)\right)$$

---

## 4. Normalization for Partial / Provisional Audits

If a user selects only Technical SEO and Technical Health (e.g., omitting Performance and Security):
- Available weights: SEO (35%) + Health (25%) = 60% total available weight.
- Normalization Factor: $Factor = \frac{100}{35 + 25} = 1.6667$.
- Composite Score:
$$OverallScore = \left(SEO \times 0.35 + Health \times 0.25\right) \times 1.6667$$
- Flag: The audit record sets `is_provisional = true` with notice: `"Provisional Score: Performance and Security audits were omitted."`
