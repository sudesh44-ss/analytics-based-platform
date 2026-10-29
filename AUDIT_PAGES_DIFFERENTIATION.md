# SiteScope — Audit Pages Differentiation & Architectural Specification

**Document Version:** 1.0.0  
**Target Routes:** `/audits/performance` and `/audits/security` (compared with `/audits`)  
**Scope:** Frontend UI/UX, Data Models, Scoring Engines, Crawler Verification, and API Contracts

---

## 1. Executive Summary & Core Purpose

Prior to this specification, the `/audits/performance` and `/audits/security` routes did not have dedicated route implementations, relying instead on generic sub-tabs inside `/audits/[auditId]`. This led to UI ambiguity regarding whether performance and security were separate audits, shared workflows, or identical data views.

### 1.1 Purpose of Performance & Vitals (`/audits/performance`)
- **Primary Goal:** Answer: *"How fast does my website load, what Core Web Vitals bottlenecks exist, and what code/asset optimizations will improve speed and user experience?"*
- **Domain:** Loading speed, rendering milestones, JavaScript execution responsiveness, visual stability, and Lighthouse optimization opportunities.
- **Data Provenance:** Google PageSpeed Insights API (field real-user data + lab Lighthouse emulation) and crawler-measured HTTP response times.

### 1.2 Purpose of Security Audits (`/audits/security`)
- **Primary Goal:** Answer: *"What security hygiene flaws and protocol weaknesses are detectable across my web pages, how severe are they, and how can I remediate them?"*
- **Domain:** Transport layer security (HTTPS enforcement, mixed content), HTTP response security headers (HSTS, CSP, X-Frame-Options), cookie flags (Secure, HttpOnly, SameSite), open directory exposure, and unencrypted transmission of credentials.
- **Data Provenance:** Cheerio/Playwright crawler HTTP response headers, DOM protocol analysis, and security rule evaluation.
- **Boundary & Scope:** SiteScope performs **external passive hygiene scanning**. It does NOT perform intrusive penetration testing, destructive exploits, or internal network scanning.

---

## 2. Page Differentiation Matrix

| Dimension | Performance & Vitals (`/audits/performance`) | Security Audits (`/audits/security`) |
| :--- | :--- | :--- |
| **Primary Route** | `/audits/performance` | `/audits/security` |
| **Page Heading** | Performance & Core Web Vitals | Website Security Audits |
| **Subtitle** | Measure real-world speed, diagnose Core Web Vitals, and eliminate rendering bottlenecks. | Identify security misconfigurations, missing protective headers, and protocol weaknesses. |
| **Primary Metric (Score)** | `performance_score` (0–100) from PSI / Lighthouse | `security_score` (0–100) from rule deductions |
| **Core KPIs** | LCP (s), INP (ms), CLS, FCP (s), TBT (ms), Speed Index (s) | Critical Security Flaws, High Risk, Insecure HTTP Pages, Missing Headers |
| **Data Separation** | Lab vs. Field data badges; Mobile vs. Desktop emulation | Severity levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) |
| **Actionable Guidance** | Render-blocking resources, image compression, unused CSS/JS | Enforce HSTS, implement CSP, add Secure/HttpOnly flags, redirect HTTP to HTTPS |
| **Table/List View** | Slowest crawled pages (by `response_time_ms`), PageSpeed opportunities | Discovered vulnerabilities & affected URLs with evidence & remediation |
| **Charts** | CWV Health Distribution, Performance Score Trend | Security Score Trend, Findings by Severity Bar Chart |

---

## 3. Shared vs. Distinct UI Architecture

| UI Component | Performance & Vitals | Security Audits | Architecture Strategy |
| :--- | :--- | :--- | :--- |
| **Layout & Shell** | Sidebar + Navbar + Container | Sidebar + Navbar + Container | **Shared** (`DashboardSidebar`, `Navbar`, `Footer`) |
| **Website Selector** | Active project selector | Active project selector | **Shared** (`getProjects()`) |
| **Run Audit Action** | Trigger audit with `enableJs: true` option | Trigger audit with security inspection | **Shared** API (`triggerAudit`) with page-context preset |
| **Score Gauge** | Speed gauge (0–100) | Security rating gauge (0–100) | **Differentiated** semantic color & metadata |
| **Vitals Metric Grid** | 3 CWV Cards (LCP, INP, CLS) + 3 Lab Cards | N/A (Replaced by Severity & Vulnerability Summary) | **Distinct to Performance** |
| **Vulnerability Breakdown** | N/A (Replaced by Opportunities list) | Severity chips & remediation cards | **Distinct to Security** |
| **Affected Pages Table** | Slow URLs sorted by `response_time_ms` | Vulnerable URLs sorted by severity impact | **Differentiated** columns and sorting |

---

## 4. Backend & Database Status Matrix

| Capability / Entity | Database Model | Backend Route | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Performance Metrics Table** | `performance_metrics` | `GET /api/v1/audits/:auditId/performance` | **Implemented & Verified** | Stores LCP, INP, CLS, FCP, TBT, SpeedIndex, field data status |
| **Google PageSpeed Worker** | `services/pagespeed.ts` | BullMQ worker pipeline | **Implemented & Verified** | Queries Google PSI API; has graceful lab emulation fallback |
| **Crawled Page Response Times** | `crawled_pages` | `GET /api/v1/audits/:auditId/pages` | **Implemented & Verified** | Records URL response latency in milliseconds |
| **Security Issues Records** | `issues` (category: `SECURITY`) | `GET /api/v1/audits/:auditId/issues?category=SECURITY` | **Implemented & Verified** | Stores security rule violations, score impacts, status |
| **Security Rules Engine** | `processors/seo-rules.ts` | BullMQ worker pipeline | **Implemented & Verified** | Evaluates HTTP vs HTTPS, broken links, server errors |
| **Dashboard Category Scores** | `audit_summaries` | `GET /api/v1/dashboard/summary` | **Implemented & Verified** | Supplies isolated `performance` and `security` scores |

---

## 5. Security & Boundary Guardrails

1. **No Fake Vulnerability Scanning**: The Security page reflects only what the passive scanner legitimately observes (protocol, headers, status codes, mixed resources). It does not claim SQL injection, XSS exploitation, or penetration testing capabilities.
2. **Data Provenance Transparency**: The Performance page explicitly separates Google Field Data (real Chrome User Experience Report data) from Synthetic Lab Data (Lighthouse emulation).
3. **Tenant Isolation**: Both pages enforce authenticated Supabase RLS and Fastify project ownership checks before delivering audit artifacts.
