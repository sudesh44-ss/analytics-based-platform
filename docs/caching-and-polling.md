# SiteScope — Caching & Polling Lifecycle Specification

## 1. Overview & Objectives

High-frequency polling and redundant database aggregations degrade database performance. SiteScope implements an efficient, multi-tier caching and smart polling architecture to ensure:
- Sub-50ms response times for dashboard overview and trend queries.
- Zero cache leakage between multi-tenant accounts.
- Intelligent client-side status polling that halts when jobs complete and suspends when browser tabs are inactive.

---

## 2. Server-Side Caching Strategy

```text
[Frontend Request]
       │
       ▼ Fastify API Gateway
[Check Redis Cache: key = 'cache:dash:{userId}:{projectId}:{hash}']
       ├── HIT  ──► Return JSON immediately (X-Cache: HIT)
       └── MISS ──► Execute PostgreSQL Query
                      │
                      ▼ Compute Aggregation
                   Store in Redis (TTL: 60s)
                      │
                      ▼ Return JSON (X-Cache: MISS) + ETag
```

### Cache Key Namespacing & Tenant Isolation
Every cache key strictly embeds both `user_id` and `project_id`:
`cache:dashboard:summary:{userId}:{projectId}`
`cache:audit:trends:{userId}:{projectId}:{startDate}:{endDate}`

**Rule**: A user can never access or invalidate another user's cached dataset.

### Cache Invalidation Triggers
Cached aggregations are purged immediately upon the occurrence of any of the following lifecycle events:
1. **Audit Completed**: Background worker finishes crawl and score calculation -> deletes `cache:dashboard:*:{projectId}`.
2. **Issue State Changed**: User marks an issue `IGNORED` or `OPEN` -> deletes `cache:dashboard:*:{projectId}`.
3. **Project Settings Updated**: Monitored domain renamed or archived -> deletes all project keys.
4. **Analytics Sync Run**: Google Analytics or Search Console sync job completes -> deletes connected analytics cache keys.

---

## 3. Client-Side Smart Polling Protocol

When a user triggers an audit, the frontend navigates to the audit progress view and begins polling `/api/v1/audits/:auditId/status`.

### Smart Polling Rules:
1. **Backoff Schedule**:
   - Initial 30 seconds: Poll every **2 seconds** (fast crawl feedback).
   - 31–120 seconds: Poll every **5 seconds**.
   - After 120 seconds: Poll every **10 seconds** (long-running deep crawls).
2. **Immediate Polling Termination**:
   - Polling stops immediately upon receiving any terminal state: `COMPLETED`, `FAILED`, `CANCELLED`, or `TIMED_OUT`.
   - The UI re-enables interactive controls and invalidates local SWR/React Query caches.
3. **Page Visibility API Integration**:
   - If the user switches browser tabs or minimizes the window (`document.visibilityState === 'hidden'`), polling intervals are throttled to **30 seconds** or suspended entirely.
   - When the user returns to the tab (`visibilitychange` event), the frontend dispatches a single immediate refresh query and resumes normal scheduling.
4. **Network Reconnection**:
   - If the client goes offline (`navigator.onLine === false`), polling pauses and a non-blocking banner appears: `"Network offline. Reconnecting..."`.
   - When connectivity is restored, polling resumes seamlessly.
