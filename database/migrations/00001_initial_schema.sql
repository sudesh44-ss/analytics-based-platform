-- SiteScope PostgreSQL Database Schema
-- Migration: 00001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Projects & Domain Verification
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    normalized_url TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(128) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_domain UNIQUE (user_id, domain)
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects (domain);

CREATE TABLE IF NOT EXISTS domain_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    verification_method VARCHAR(32) NOT NULL, -- 'DNS_TXT' or 'HTML_TAG'
    expected_value TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' -- 'PENDING', 'VERIFIED', 'FAILED'
);

-- 2. Audit Jobs, Pages & Links
CREATE TABLE IF NOT EXISTS audit_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    config JSONB NOT NULL,
    pages_crawled INTEGER NOT NULL DEFAULT 0,
    max_pages INTEGER NOT NULL DEFAULT 50,
    overall_score INTEGER,
    failure_reason TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_project ON audit_jobs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_status ON audit_jobs (status);

CREATE TABLE IF NOT EXISTS audit_job_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON audit_job_outbox (status, created_at);

CREATE TABLE IF NOT EXISTS crawled_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    content_type VARCHAR(128),
    content_length INTEGER,
    title TEXT,
    meta_description TEXT,
    h1 TEXT,
    canonical_url TEXT,
    robots_meta VARCHAR(128),
    is_indexable BOOLEAN NOT NULL DEFAULT TRUE,
    depth INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_job ON crawled_pages (audit_job_id);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_url ON crawled_pages (project_id, normalized_url);

CREATE TABLE IF NOT EXISTS extracted_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    source_page_id UUID NOT NULL REFERENCES crawled_pages(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    anchor_text TEXT,
    is_internal BOOLEAN NOT NULL,
    status_code INTEGER,
    is_broken BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_links_job ON extracted_links (audit_job_id);

-- 3. Issues & Findings Lifecycle
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_id VARCHAR(128) NOT NULL,
    rule_version VARCHAR(32) NOT NULL DEFAULT '1.0',
    category VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    score_impact NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    first_audit_id UUID NOT NULL REFERENCES audit_jobs(id),
    latest_audit_id UUID NOT NULL REFERENCES audit_jobs(id),
    first_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_rule UNIQUE (project_id, rule_id)
);
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues (project_id, status);

CREATE TABLE IF NOT EXISTS issue_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    affected_url TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_occurrences_issue ON issue_occurrences (issue_id);

CREATE TABLE IF NOT EXISTS issue_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Summaries & Performance Metrics
CREATE TABLE IF NOT EXISTS audit_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    seo_score INTEGER NOT NULL,
    performance_score INTEGER NOT NULL,
    technical_health_score INTEGER NOT NULL,
    security_score INTEGER NOT NULL,
    total_pages_crawled INTEGER NOT NULL,
    total_issues_count INTEGER NOT NULL,
    critical_issues_count INTEGER NOT NULL,
    high_issues_count INTEGER NOT NULL,
    medium_issues_count INTEGER NOT NULL,
    low_issues_count INTEGER NOT NULL,
    info_issues_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_summary UNIQUE (audit_job_id)
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tested_url TEXT NOT NULL,
    device_mode VARCHAR(16) NOT NULL,
    source VARCHAR(32) NOT NULL,
    performance_score INTEGER NOT NULL,
    accessibility_score INTEGER,
    best_practices_score INTEGER,
    seo_score INTEGER,
    fcp_ms INTEGER,
    lcp_ms INTEGER,
    cls NUMERIC(6, 4),
    inp_ms INTEGER,
    tbt_ms INTEGER,
    speed_index_ms INTEGER,
    has_field_data BOOLEAN NOT NULL DEFAULT FALSE,
    opportunities JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Integrations & Snapshots
CREATE TABLE IF NOT EXISTS analytics_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    property_id VARCHAR(128) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    encrypted_refresh_token BYTEA NOT NULL,
    encryption_iv BYTEA NOT NULL,
    encryption_auth_tag BYTEA NOT NULL,
    access_token_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_provider UNIQUE (project_id, provider)
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    snapshot_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_snapshot UNIQUE (project_id, provider, snapshot_date)
);

-- 6. Billing, Subscriptions, Payments & Invoices
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    interval VARCHAR(16) NOT NULL,
    amount_paise INTEGER NOT NULL,
    tax_percent NUMERIC(4, 2) NOT NULL DEFAULT 18.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    max_projects INTEGER NOT NULL,
    max_pages_per_audit INTEGER NOT NULL,
    max_daily_audits INTEGER NOT NULL,
    max_performance_urls INTEGER NOT NULL,
    retention_days INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    provider_subscription_id VARCHAR(128) UNIQUE,
    provider_customer_id VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    entitlement_status VARCHAR(32) NOT NULL DEFAULT 'FREE',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    grace_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    provider_payment_id VARCHAR(128) UNIQUE,
    provider_order_id VARCHAR(128),
    amount_paise INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL,
    method VARCHAR(32),
    error_code VARCHAR(64),
    error_description TEXT,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);

CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id),
    subtotal_paise INTEGER NOT NULL,
    tax_paise INTEGER NOT NULL,
    total_paise INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    billing_name VARCHAR(255) NOT NULL,
    billing_email VARCHAR(255) NOT NULL,
    billing_address JSONB,
    tax_id VARCHAR(64),
    pdf_object_key TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(32) NOT NULL DEFAULT 'razorpay',
    provider_event_id VARCHAR(128) NOT NULL,
    event_name VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_events (status, created_at);

CREATE TABLE IF NOT EXISTS usage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_audits_count INTEGER NOT NULL DEFAULT 0,
    max_daily_audits INTEGER NOT NULL DEFAULT 3,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_period UNIQUE (user_id, period_date)
);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_ledger (user_id, period_date);

-- 7. Reports, Schedules, Notifications & Idempotency
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_job_id UUID NOT NULL REFERENCES audit_jobs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    format VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    b2_object_key TEXT,
    file_size_bytes BIGINT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 DAYS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_project ON reports (project_id);

CREATE TABLE IF NOT EXISTS scheduled_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    frequency VARCHAR(16) NOT NULL,
    cron_expression VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    response_code INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 HOURS',
    CONSTRAINT uq_user_endpoint_key UNIQUE (user_id, endpoint, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys (user_id, idempotency_key);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(64) NOT NULL,
    target_resource VARCHAR(128),
    ip_address VARCHAR(45),
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    subscription_id VARCHAR(128),
    payment_id VARCHAR(128),
    action VARCHAR(64) NOT NULL,
    previous_state JSONB NOT NULL,
    new_state JSONB NOT NULL,
    performed_by VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
