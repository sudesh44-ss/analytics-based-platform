-- SiteScope Default Plans Seed
-- Seed: 001_plans_seed.sql

INSERT INTO plans (
    id,
    name,
    interval,
    amount_paise,
    tax_percent,
    currency,
    max_projects,
    max_pages_per_audit,
    max_daily_audits,
    max_performance_urls,
    retention_days,
    is_active
) VALUES 
(
    'FREE',
    'SiteScope Free',
    'free',
    0,
    18.00,
    'INR',
    1,
    50,
    3,
    0,
    7,
    TRUE
),
(
    'PRO_MONTHLY',
    'SiteScope Pro (Monthly)',
    'monthly',
    79900, -- ₹799.00
    18.00,
    'INR',
    10,
    1000,
    30,
    3,
    90,
    TRUE
),
(
    'PRO_YEARLY',
    'SiteScope Pro (Yearly)',
    'yearly',
    799900, -- ₹7,999.00
    18.00,
    'INR',
    10,
    1000,
    30,
    3,
    90,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    amount_paise = EXCLUDED.amount_paise,
    max_projects = EXCLUDED.max_projects,
    max_pages_per_audit = EXCLUDED.max_pages_per_audit,
    max_daily_audits = EXCLUDED.max_daily_audits,
    max_performance_urls = EXCLUDED.max_performance_urls,
    retention_days = EXCLUDED.retention_days;
