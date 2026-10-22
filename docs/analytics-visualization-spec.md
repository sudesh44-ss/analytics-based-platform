# SiteScope — Analytics Visualization System Specification

## 1. Executive Summary & Design Principles

SiteScope provides deep technical diagnostics and actionable website insights through an enterprise-grade analytics dashboard. Every visualization must be grounded in verified, authoritative data from PostgreSQL or authorized OAuth provider APIs. 

**Core Visualization Rules**:
- **Zero Decorative / Fake Charts**: No simulated trends, mock data generators, or fabricated scores in production.
- **Data Provenance & Freshness**: Every chart explicitly displays its data source (e.g. `SiteScope Crawler Engine`, `Google PageSpeed Insights`, `Google Analytics 4`, `Google Search Console`), the active date range, and the timestamp of last synchronization.
- **Distinction of Lab vs. Field Data**: Synthetic lab tests (Lighthouse) and real-user field observations (CrUX / GA4) are never blended on the same axis without distinct visual tagging.
- **Component Stack**:
  - **Chart Library**: **Recharts** (v2.13+) — chosen for its lightweight SVG rendering, declarative React integration, accessible DOM structure, and predictable SSR behavior without Next.js hydration issues.
  - **Table Library**: **TanStack Table** (v8+) — chosen for headless, high-performance virtualization, multi-column sorting, facet filtering, server-side pagination, and zero Tailwind dependency (styled via CSS Modules).

---

## 2. Dashboard Inventory by Page

### Page A: Overview Dashboard

#### 1. KPI Metric Cards
- **Purpose**: At-a-glance health and operational capacity summary.
- **Card 1: Overall Health Score**: Latest weighted composite score (0–100) with delta vs previous audit (+3.2% green, -1.5% red).
- **Card 2: Audited Projects**: Count of active monitored websites (e.g., `4 / 10` on Pro plan).
- **Card 3: Open Issues**: Total unresolved findings broken down into Critical and High badges.
- **Card 4: Pages Crawled**: Total pages crawled in latest cycle vs plan limit.
- **Card 5: Daily Audit Quota Remaining**: Atomic quota left for current calendar day (e.g., `24 / 30`).
- **Interaction**: Clicking any card filters the dashboard or navigates to the detailed view.

#### 2. Composite Score Trend (Line Chart)
- **Component**: Recharts `<ResponsiveContainer>`, `<LineChart>`, `<Line>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<Legend>`.
- **Metrics**: Composite Score, SEO Score, Performance Score, Technical Health Score.
- **X-Axis**: Audit Execution Date (ISO 8601 formatted as `MMM DD, YYYY`).
- **Y-Axis**: Score (0 to 100).
- **Controls**: Date Range Selector (Last 7 Days, Last 30 Days, Last 90 Days, Custom Range).
- **Interactions**:
  - Hovering a data point displays a tooltip with composite score and sub-scores.
  - Clicking a data point opens the historical audit report modal for that exact run.
  - Legend items can be clicked to toggle visibility of individual score lines.

#### 3. Issues by Severity (Horizontal Bar Chart)
- **Component**: Recharts `<BarChart layout="vertical">`.
- **Categories**: Critical (Red `#ef4444`), High (Orange `#f97316`), Medium (Yellow `#eab308`), Low (Blue `#3b82f6`), Info (Slate `#64748b`).
- **Metrics**: Count of active issues in the latest audit compared to previous audit (dual bars).
- **Interactions**: Clicking a severity bar applies that severity filter to the issues table below.

#### 4. Issue Resolution Lifecycle (Donut / Pie Chart)
- **Component**: Recharts `<PieChart>`, `<Pie>`, `<Cell>`.
- **Segments**: Open (58%), Fixed (24%), Ignored (12%), Reopened (6%).
- **Center Label**: Total findings count.
- **Interactions**: Clicking a slice filters the issue list by that lifecycle state.

#### 5. Recent Audits Table
- **Component**: TanStack Table.
- **Columns**: Target Domain, Audit Timestamp, Status (`Completed`, `Crawling`, `Failed`), Health Score, Issues Found, Actions (`View Report`, `Download PDF`).
- **Features**: Server-side pagination, sorting, status badges.

---

### Page B: Technical SEO Analysis

#### 1. Issue Categorization (Bar Chart)
- **Metrics**: Issue counts grouped by:
  - Meta & Title Tags (Missing, duplicate, length violations).
  - Indexability & Robots (`noindex`, `nofollow`, robots.txt disallows).
  - Headings Hierarchy (Missing H1, multiple H1s, skipped levels).
  - Canonical Tags (Missing, mismatched, conflicting).
  - Structured Data / Schema issues.

#### 2. HTTP Status Code Distribution (Bar Chart)
- **Categories**: `2xx Success`, `3xx Redirection`, `4xx Client Error`, `5xx Server Error`.
- **Data Source**: Crawlee crawled page HTTP response metadata.

#### 3. Crawled Pages Data Grid
- **Component**: Virtualized TanStack Table.
- **Columns**: URL, Status Code, Load Time (ms), Title, Meta Description Length, H1 Tag, Canonical URL, Discovered Links Count, Actions.
- **Features**: Search by URL path, filter by status code (e.g. show only 404s), sort by load time, CSV export button.

#### 4. Broken Links & Redirect Chains Table
- **Columns**: Source URL, Broken / Redirecting Target Link, Anchor Text, Status Code, Redirect Chain Hops (e.g., `A -> B -> C`), Recommendation.
- **Drill-down**: Expands row to show exact DOM path of the link element.

---

### Page C: Performance & Core Web Vitals Analysis

#### 1. Historical Performance Score Trend
- **Chart**: Multi-line chart comparing **Mobile** vs. **Desktop** performance scores over time.
- **Data Source**: Google PageSpeed Insights API.

#### 2. Core Web Vitals Metric Cards
- **LCP (Largest Contentful Paint)**: Good (< 2.5s), Needs Improvement (2.5s–4.0s), Poor (> 4.0s).
- **INP (Interaction to Next Paint)**: Good (< 200ms), Needs Improvement (200ms–500ms), Poor (> 500ms).
- **CLS (Cumulative Layout Shift)**: Good (< 0.1), Needs Improvement (0.1–0.25), Poor (> 0.25).
- **Badge**: Explicitly labeled `Real-User Field Data (CrUX 75th percentile)` or `Lab Test (Lighthouse)`.

#### 3. Diagnostic Opportunities Table
- **Columns**: Audit Rule, Estimated Savings (ms or KB), Affected Resource URL, Category (JavaScript, CSS, Images, Server).
- **Examples**: `"Eliminate render-blocking resources"`, `"Properly size images"`, `"Reduce unused JavaScript"`.

---

### Page D: Connected Analytics (Google Analytics 4 & Search Console)

#### 1. GA4 Traffic & Engagement (Multi-Axis Line Chart)
- **Metrics**: Total Users, Sessions, Engagement Rate (%), Key Events (Conversions).
- **Controls**: Date Range picker, Dimension selector (By Day, By Week, By Device Category).
- **Empty State**: If not connected, displays: `"Connect Google Analytics 4 in Project Settings to view authorized audience engagement metrics."`

#### 2. Google Search Console Organic Performance
- **Chart**: Dual-line chart showing **Clicks** (Left Y-Axis) and **Impressions** (Right Y-Axis).
- **Top Queries & Landing Pages Table**:
  - Columns: Query / Page URL, Clicks, Impressions, Click-Through Rate (CTR %), Average Position.
  - Sorting: By Clicks descending or Position ascending.

---

### Page E: Basic Security Analysis

#### 1. Security Configuration Checklist Cards
- **HTTPS & SSL/TLS Configuration**: Certificate validity, expiration countdown, protocol version (TLS 1.2/1.3), Strict-Transport-Security (HSTS).
- **Security Headers Evaluation**: Content-Security-Policy (CSP), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Mixed Content Inspector**: Count of insecure HTTP resources loaded on HTTPS pages.
- **Exposed Sensitive Files**: Safe inspection of publicly accessible `.env`, `.git/HEAD`, `wp-config.php.bak` endpoints.

---

## 3. Interaction & Accessibility Standards

1. **Accessible SVGs**: All Recharts SVG charts include `aria-label`, `<title>`, and `<desc>` elements for screen readers.
2. **Keyboard Navigation**: Tables support `ArrowUp`, `ArrowDown`, `Enter` (to open drill-down), and focus visible outlines (`outline: 2px solid var(--focus-ring)`).
3. **Responsive Scaling**: All charts wrap in `<ResponsiveContainer width="100%" height={320}>` with CSS Module media queries adapting font sizes and tick intervals on screens `< 768px`.
4. **Theme Harmonization**: Charts pull colors from CSS custom properties (`--color-primary`, `--color-critical`, `--color-card-bg`, `--color-axis-border`) adapting automatically between Light and Dark modes.
5. **CSV Export**: Every table includes an `"Export CSV"` button that streams formatted tabular data directly to the user's browser without backend re-computation.
