# SiteScope — Supabase PostgreSQL Migrations

This directory contains version-controlled database assets for SiteScope.

## Directory Structure
- `migrations/`: Sequential SQL migration files.
  - `00001_initial_schema.sql`: Core tables, indexes, constraints, and extensions.
  - `00002_row_level_security.sql`: Row-Level Security (RLS) policies for strict tenant isolation.
  - `00003_functions_and_triggers.sql`: Stored functions for atomic quota reservations and automatic timestamps.
- `seeds/`: Seed data for development and production initialization.
  - `001_plans_seed.sql`: Free, Pro Monthly (₹799), and Pro Yearly (₹7,999) plan configurations.
- `policies/`: Reference security policies.
- `tests/`: Automated database RLS isolation tests.

## Applying Migrations to Supabase

### Option 1: Supabase CLI
```bash
# Link to your Supabase project:
npx supabase link --project-ref <your-project-ref>

# Push migrations:
npx supabase db push
```

### Option 2: Supabase Web Dashboard
1. Open your Supabase Project -> **SQL Editor**.
2. Run `migrations/00001_initial_schema.sql`.
3. Run `migrations/00002_row_level_security.sql`.
4. Run `migrations/00003_functions_and_triggers.sql`.
5. Run `seeds/001_plans_seed.sql`.
