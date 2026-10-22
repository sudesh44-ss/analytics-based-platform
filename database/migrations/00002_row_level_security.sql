-- SiteScope PostgreSQL Row Level Security (RLS)
-- Migration: 00002_row_level_security.sql

-- Enable RLS on multi-tenant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 1. Plans: Readable by all authenticated and anonymous users
CREATE POLICY "Public plans read" ON plans
    FOR SELECT USING (is_active = TRUE);

-- 2. Projects: User can access only their own projects
CREATE POLICY "Users own projects" ON projects
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Domain Verifications: Inherited from project ownership
CREATE POLICY "Users own domain verifications" ON domain_verifications
    FOR ALL USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- 4. Audit Jobs: User can access jobs belonging to their projects or user_id
CREATE POLICY "Users own audit jobs" ON audit_jobs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Crawled Pages: Inherited from project ownership
CREATE POLICY "Users view crawled pages" ON crawled_pages
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- 6. Extracted Links: Inherited from audit job ownership
CREATE POLICY "Users view extracted links" ON extracted_links
    FOR SELECT USING (
        audit_job_id IN (SELECT id FROM audit_jobs WHERE user_id = auth.uid())
    );

-- 7. Issues: Inherited from project ownership
CREATE POLICY "Users view issues" ON issues
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users update issue status" ON issues
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- 8. Issue Occurrences: Inherited from issue ownership
CREATE POLICY "Users view issue occurrences" ON issue_occurrences
    FOR SELECT USING (
        issue_id IN (
            SELECT i.id FROM issues i
            JOIN projects p ON i.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- 9. Audit Summaries: Inherited from project ownership
CREATE POLICY "Users view audit summaries" ON audit_summaries
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- 10. Performance Metrics: Inherited from project ownership
CREATE POLICY "Users view performance metrics" ON performance_metrics
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- 11. Subscriptions & Payments: Direct user ownership
CREATE POLICY "Users view their subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view their payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view their invoices" ON billing_invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view their usage" ON usage_ledger
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 12. Reports: Direct user ownership
CREATE POLICY "Users own reports" ON reports
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 13. Scheduled Audits: Direct user ownership
CREATE POLICY "Users own scheduled audits" ON scheduled_audits
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 14. Notifications: Direct user ownership
CREATE POLICY "Users own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 15. Idempotency Keys: Direct user ownership
CREATE POLICY "Users own idempotency keys" ON idempotency_keys
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
