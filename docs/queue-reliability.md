# SiteScope — Queue Reliability & Worker Fault-Tolerance Specification

## 1. Overview & Failure Modes

Background crawling, performance testing, and PDF generation are delegated to BullMQ running over Render Key Value (Redis). 

Because network partitions between Fastify, Redis, and Render Workers can occur, SiteScope enforces a **Transactional Outbox Pattern** to ensure zero job loss even if Redis restarts during enqueueing.

---

## 2. Transactional Outbox Architecture

```text
[Fastify API: Audit Request]
          │
          ▼ Single PostgreSQL Transaction
    1. Lock & verify daily quota in `usage_ledger`
    2. INSERT into `audit_jobs` (status = 'QUEUED')
    3. INSERT into `audit_job_outbox` (payload, status = 'PENDING')
    COMMIT Transaction;
          │
          ▼ Dual Enqueue Strategy
    Primary: Fastify API immediately attempts BullMQ queue.add()
             └── If success: UPDATE outbox SET status = 'PUBLISHED'
             └── If Redis down: Outbox entry remains 'PENDING'
          │
          ▼ Fallback Sweeper (Runs every 60s in Worker)
    SELECT * FROM audit_job_outbox WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '30s'
    Republishes orphaned jobs to BullMQ and marks status = 'PUBLISHED'
```

This guarantees that if the Fastify API crashes or Redis blips after the database commit, the job is never lost.

---

## 3. Worker Topology & Concurrency Controls

- **Hosting**: Render Background Worker (Single/Multi-instance deployment).
- **Concurrency**:
  - `audit-queue`: Concurrency = **3 concurrent audit crawls** per worker instance.
  - `reports-queue`: Concurrency = **2 concurrent PDF/CSV generations**.
  - `reconciliation-queue`: Concurrency = **1**.
- **Retry Backoff Strategy**:
  - Max retries: **3**.
  - Backoff: Exponential with jitter.
    - Attempt 1: Wait 5 seconds.
    - Attempt 2: Wait 30 seconds.
    - Attempt 3: Wait 120 seconds.
  - After 3 failed attempts, job enters BullMQ `failed` state and PostgreSQL updates `audit_jobs.status = 'FAILED'`.

---

## 4. Graceful Shutdown & SIGTERM Handling

When Render deploys a new worker version or restarts a container, it transmits a `SIGTERM` signal followed by a 30-second grace window before issuing `SIGKILL`.

**SiteScope Graceful Shutdown Routine**:
1. Worker receives `SIGTERM`.
2. Worker pauses the BullMQ queue (`worker.pause()`), preventing new jobs from being picked up.
3. For currently active crawls:
   - Crawlee stops enqueuing newly discovered URLs.
   - It completes in-flight HTTP requests (max 10 seconds).
   - Flushes pending batches of crawled pages to PostgreSQL.
   - Saves crawl state checkpoint to `audit_jobs.config.resume_state`.
   - BullMQ releases the lock gracefully so another worker can resume.
4. Worker closes database connection pools and exits with code 0.
