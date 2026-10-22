# SiteScope — Local Development Setup Guide

## 1. Prerequisites

Before installing SiteScope locally, ensure you have installed:
- **Node.js**: `v20.x` or `v22.x` LTS ([https://nodejs.org/](https://nodejs.org/))
- **Package Manager**: `npm` (v10+) or `pnpm` (v9+)
- **Git**: v2.40+
- **Docker Desktop** (Optional, recommended for running local Redis and Supabase CLI)

---

## 2. Monorepo Architecture Overview

SiteScope is organized as a clean npm/pnpm workspaces monorepo:
```text
sitescope/
├── frontend/                  # Next.js 16 + TypeScript (Port 3000)
├── backend/                   # Fastify REST API (Port 4000)
├── worker/                    # Crawlee + Playwright Background Worker
├── database/                  # Supabase PostgreSQL migrations & seeds
├── shared/                    # Reusable TypeScript types & Zod schemas
├── docs/                      # Technical specifications & guides
├── scripts/                   # Validation & maintenance scripts
└── package.json               # Root workspace scripts
```

---

## 3. Step-by-Step Local Setup

### Step 1: Clone Repository
```bash
git clone <repository-url> sitescope
cd sitescope
```

### Step 2: Install Dependencies
Run from the root directory to install all monorepo package workspaces:
```bash
npm install
```

### Step 3: Install Playwright System Dependencies (Worker)
```bash
cd worker
npx playwright install-deps chromium
npx playwright install chromium
cd ..
```

### Step 4: Configure Environment Files
Copy the `.env.example` templates to `.env` in each service directory:
```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env
```
*(Refer to `docs/manual-setup-checklist.md` and `docs/environment-variables.md` for required credentials).*

### Step 5: Run Database Migrations
Apply PostgreSQL migrations to your Supabase project:
```bash
npm run db:migrate
```

### Step 6: Start Development Servers
From the root workspace:
```bash
# Start all services concurrently (Frontend, Backend, Worker)
npm run dev

# Or start services individually:
npm run dev --workspace=frontend   # http://localhost:3000
npm run dev --workspace=backend    # http://localhost:4000
npm run dev --workspace=worker     # Background process
```

---

## 4. Verification Commands

Run health checks across the services:
```bash
# Test Fastify API Health
curl http://localhost:4000/api/v1/health

# Run Workspace Type Checking
npm run typecheck

# Run Workspace Unit & Security Tests
npm run test
```
