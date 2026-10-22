# SiteScope — Visualization API Contracts Specification

## 1. Overview & Architectural Standards

All visualization data consumed by the SiteScope frontend is served by the Fastify REST API under the `/api/v1` namespace.

**Core API Standards**:
- **Authentication**: Bearer JWT token in `Authorization: Bearer <token>` header, verified against Supabase Auth JWKS.
- **Tenant Isolation**: Every request enforces `project_id` ownership verification against the authenticated `user_id`. Attempting to query an unauthorized project returns `HTTP 403 Forbidden`.
- **Response Structure**: Uniform JSON envelope:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "timestamp": "2026-10-22T08:00:00Z",
      "cached": false,
      "sync_freshness": "2026-10-22T07:45:00Z"
    }
  }
  ```
- **Error Structure**:
  ```json
  {
    "success": false,
    "error": {
      "code": "PROJECT_NOT_FOUND",
      "message": "The requested project does not exist or access is unauthorized.",
      "details": {}
    }
  }
  ```
- **HTTP Caching**: Dashboard aggregations return `Cache-Control: private, max-age=60` and `ETag: W/"<hash>"`. Clients provide `If-None-Match` to receive `304 Not Modified` on unchanged data.

---

## 2. API Endpoints

### 1. Overview Dashboard Summary
- **Endpoint**: `GET /api/v1/dashboard/summary`
- **Query Parameters**:
  - `projectId` (string, UUID, required): Monitored website project ID.
- **Authorization**: Project Owner or Team Member.
- **Database Tables**: `projects`, `audit_jobs`, `audit_summaries`, `issues`, `usage_ledger`.
- **Response Schema (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "domain": "example.com",
      "overallScore": 84,
      "scoreDelta": 3.5,
      "latestAuditId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
      "latestAuditCompletedAt": "2026-10-22T06:30:00Z",
      "kpi": {
        "totalPagesCrawled": 482,
        "totalIssuesCount": 38,
        "criticalIssuesCount": 2,
        "highIssuesCount": 7,
        "mediumIssuesCount": 15,
        "lowIssuesCount": 14,
        "dailyAuditsRemaining": 28,
        "dailyAuditsLimit": 30
      },
      "categoryScores": {
        "seo": 92,
        "performance": 78,
        "technicalHealth": 88,
        "security": 95
      },
      "issuesBySeverity": [
        { "severity": "CRITICAL", "count": 2, "previousCount": 4 },
        { "severity": "HIGH", "count": 7, "previousCount": 9 },
        { "severity": "MEDIUM", "count": 15, "previousCount": 14 },
        { "severity": "LOW", "count": 14, "previousCount": 16 },
        { "severity": "INFO", "count": 8, "previousCount": 8 }
      ],
      "issueStatusDistribution": {
        "open": 22,
        "fixed": 11,
        "ignored": 3,
        "reopened": 2
      }
    }
  }
  ```

---

### 2. Audit Historical Trends
- **Endpoint**: `GET /api/v1/dashboard/audit-trends`
- **Query Parameters**:
  - `projectId` (string, UUID, required).
  - `startDate` (string, ISO 8601, optional, default: 30 days ago).
  - `endDate` (string, ISO 8601, optional, default: now).
  - `interval` (string, enum: `day`, `week`, default: `day`).
- **Response Schema (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "trends": [
        {
          "auditId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
          "timestamp": "2026-10-15T06:30:00Z",
          "overallScore": 81,
          "seoScore": 89,
          "performanceScore": 72,
          "technicalHealthScore": 84,
          "securityScore": 95,
          "pagesCount": 470
        },
        {
          "auditId": "c1d2e3f4-a5b6-7890-1234-56789abcdef0",
          "timestamp": "2026-10-22T06:30:00Z",
          "overallScore": 84,
          "seoScore": 92,
          "performanceScore": 78,
          "technicalHealthScore": 88,
          "securityScore": 95,
          "pagesCount": 482
        }
      ]
    }
  }
  ```

---

### 3. Crawled Pages Data Grid
- **Endpoint**: `GET /api/v1/audits/:auditId/pages`
- **Query Parameters**:
  - `page` (integer, default: 1).
  - `limit` (integer, default: 25, max: 100).
  - `search` (string, optional, matches URL or title).
  - `statusCode` (integer, optional, e.g. 404, 301, 200).
  - `sortBy` (enum: `url`, `statusCode`, `responseTimeMs`, `linksCount`, default: `url`).
  - `sortOrder` (enum: `asc`, `desc`, default: `asc`).
- **Response Schema (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "e4b1a2c3-d5e6-7890-1234-56789abcdef0",
          "url": "https://example.com/blog/seo-guide",
          "statusCode": 200,
          "responseTimeMs": 142,
          "title": "Complete Technical SEO Guide 2026",
          "titleLength": 32,
          "metaDescriptionLength": 154,
          "h1": "Mastering Modern Technical SEO",
          "canonicalUrl": "https://example.com/blog/seo-guide",
          "isIndexable": true,
          "linksCount": 24,
          "issuesCount": 1
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 25,
        "totalItems": 482,
        "totalPages": 20
      }
    }
  }
  ```

---

### 4. Audit Findings & Issues List
- **Endpoint**: `GET /api/v1/audits/:auditId/issues`
- **Query Parameters**:
  - `severity` (enum: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`, optional).
  - `category` (enum: `SEO`, `PERFORMANCE`, `SECURITY`, `TECHNICAL_HEALTH`, optional).
  - `status` (enum: `OPEN`, `FIXED`, `IGNORED`, `REOPENED`, optional).
  - `search` (string, optional, searches rule title and affected URL).
  - `page` (integer, default: 1).
  - `limit` (integer, default: 20).
- **Response Schema (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "iss_987654321",
          "ruleId": "SEO_MISSING_H1",
          "ruleVersion": "1.0",
          "category": "SEO",
          "severity": "HIGH",
          "title": "Missing Heading 1 (H1) Tag",
          "explanation": "Page has no top-level H1 tag. Search engines rely on H1 for topical context.",
          "recommendation": "Add a single, descriptive <h1> element summarizing the page content.",
          "affectedUrl": "https://example.com/pricing",
          "evidence": { "foundHeadings": ["h2", "h3"] },
          "status": "OPEN",
          "firstObservedAt": "2026-10-15T06:30:00Z",
          "lastObservedAt": "2026-10-22T06:30:00Z",
          "scoreImpact": -3.5
        }
      ],
      "pagination": { "page": 1, "limit": 20, "totalItems": 38, "totalPages": 2 }
    }
  }
  ```

---

### 5. Issue Status Mutation
- **Endpoint**: `PATCH /api/v1/issues/:issueId/status`
- **Body Schema**:
  ```json
  {
    "status": "IGNORED",
    "note": "Intentional architectural choice for this landing page"
  }
  ```
- **Rules**: Users can mark issues `IGNORED` or `OPEN`. Marking an issue `FIXED` manually flags it as `PENDING_VERIFICATION`; only the next automated crawl can verify and confirm the `FIXED` state.

---

### 6. Connected Analytics (GA4)
- **Endpoint**: `GET /api/v1/analytics/ga4`
- **Query Parameters**: `projectId`, `startDate`, `endDate`, `dimension`.
- **Response**: Aggregated real session metrics, engagement rates, and key events. If token expired, returns `HTTP 401` with `error.code: "OAUTH_TOKEN_EXPIRED"`.
