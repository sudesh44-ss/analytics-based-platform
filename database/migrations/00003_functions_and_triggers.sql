-- SiteScope PostgreSQL Database Functions & Triggers
-- Migration: 00003_functions_and_triggers.sql

-- 1. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;
CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_usage_ledger_updated_at ON usage_ledger;
CREATE TRIGGER set_usage_ledger_updated_at
    BEFORE UPDATE ON usage_ledger
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- 2. Atomic Quota Reservation Function
CREATE OR REPLACE FUNCTION reserve_audit_quota(
    p_user_id UUID,
    p_max_daily_audits INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
BEGIN
    -- Ensure usage record exists for today with row lock
    INSERT INTO usage_ledger (user_id, period_date, current_audits_count, max_daily_audits)
    VALUES (p_user_id, CURRENT_DATE, 0, p_max_daily_audits)
    ON CONFLICT (user_id, period_date) DO NOTHING;

    -- Select with row-level lock
    SELECT current_audits_count INTO v_current_count
    FROM usage_ledger
    WHERE user_id = p_user_id AND period_date = CURRENT_DATE
    FOR UPDATE;

    IF v_current_count >= p_max_daily_audits THEN
        RETURN FALSE;
    END IF;

    -- Atomically increment quota
    UPDATE usage_ledger
    SET current_audits_count = current_audits_count + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND period_date = CURRENT_DATE;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Quota Reversal Function
CREATE OR REPLACE FUNCTION release_audit_quota(
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE usage_ledger
    SET current_audits_count = GREATEST(0, current_audits_count - 1),
        updated_at = NOW()
    WHERE user_id = p_user_id AND period_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
