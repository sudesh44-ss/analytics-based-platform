# SiteScope — System Architecture & Monorepo Topology

## 1. Monorepo Organization & Boundaries

SiteScope is structured as a modular TypeScript monorepo with strict architectural boundaries:

```text
sitescope/
├── frontend/                  # Next.js 16 + TypeScript (Port 3000)
│   ├── src/app/               # App Router pages (Dashboard, Projects, Billing)
│   ├── src/components/        # Reusable UI widgets, Recharts, TanStack Tables
│   ├── src/styles/            # CSS Modules & design system tokens (NO Tailwind)
│   ├── package.json
│   └── README.md
│
├── backend/                   # Fastify REST API (Port 4000)
│   ├── src/routes/            # REST API route controllers (/api/v1/*)
│   ├── src/services/          # Business logic, billing, OAuth, rate limiting
│   ├── src/plugins/           # Fastify plugins (CORS, JWT, Redis, RawBody)
│   ├── src/schemas/           # Fastify/TypeBox/Zod validation schemas
│   ├── src/app.ts             # Application bootstrapping
│   ├── tests/                 # Unit & integration tests
│   ├── package.json
│   └── README.md
│
├── worker/                    # Background Jobs & Crawling
│   ├── src/crawlers/          # Crawlee CheerioCrawler & Playwright engines
│   ├── src/jobs/              # BullMQ queue processors (Crawl, PDF, Reconcile)
│   ├── src/processors/        # SEO rule analyzer, PSI API client, scoring engine
│   ├── tests/                 # Mock crawler target tests, SSRF tests
│   ├── package.json
│   └── README.md
│
├── database/                  # Supabase PostgreSQL Assets
│   ├── migrations/            # Version-controlled SQL migration files
│   ├── seeds/                 # Local development test fixtures
│   ├── policies/              # Row-Level Security (RLS) rules
│   ├── tests/                 # pgTAP / RLS isolation test scripts
│   └── README.md
│
├── shared/                    # Shared Types & Contracts
│   ├── types/                 # Shared TypeScript interfaces (Audit, Issues, User)
│   ├── schemas/               # Shared validation contracts
│   └── package.json
│
├── docs/                      # Technical specifications & guides
├── scripts/                   # Safe maintenance & setup scripts
├── IMPLEMENTATION_STATUS.md   # Ground-truth project status ledger
└── package.json               # Root workspace orchestration
```

---

## 2. End-to-End Audit Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant FE as Frontend (Next.js)
    participant API as Backend API (Fastify)
    participant DB as Supabase PostgreSQL
    participant Q as Redis Queue (BullMQ)
    participant W as Worker (Crawlee)
    participant Ext as Target Website / PSI API

    User->>FE: Click "Start Audit"
    FE->>API: POST /api/v1/audits (projectId, config, Idempotency-Key)
    API->>API: Layer 1-3 SSRF Pre-flight & URL validation
    API->>DB: Atomically reserve quota in usage_ledger (Row lock)
    API->>DB: INSERT audit_jobs (QUEUED) & audit_job_outbox (PENDING)
    API->>Q: Enqueue audit job
    API-->>FE: HTTP 201 Created (auditId)
    
    Q->>W: Worker dequeues job
    W->>DB: UPDATE audit_jobs SET status = 'CRAWLING'
    loop Crawlee Cheerio Loop (bounded concurrency = 5)
        W->>Ext: Fetch page (with pinned IP socket & redirect check)
        Ext-->>W: HTML stream & headers
        W->>W: Extract metadata & outbound links
        W->>DB: Batch insert crawled_pages (batches of 25)
    end
    
    alt SPA detected or JS enabled
        W->>Ext: Playwright Chromium browser fetch
        Ext-->>W: Hydrated DOM
    end
    
    W->>Ext: Call Google PageSpeed Insights API for top 3 URLs
    Ext-->>W: Lab & Field metrics
    
    W->>W: Run SEO rule evaluation & scoring algorithm
    W->>DB: INSERT issues, issue_occurrences, and audit_summaries
    W->>DB: UPDATE audit_jobs SET status = 'COMPLETED', overall_score = ...
    W->>User: Transmit completion email via Resend
```
