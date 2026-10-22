# SiteScope — Session Lifecycle & Token Management Specification

## 1. Overview & Storage Architecture

SiteScope utilizes standard RFC 6749 OAuth 2.0 token management provided by Supabase Auth and `@supabase/ssr`.

**Core Session Rules**:
- **JWT Lifetime**: Short-lived Access Tokens (1 hour).
- **Refresh Token Lifetime**: Long-lived Refresh Tokens (30 days with rolling renewal).
- **Cookie Attributes**:
  - `HttpOnly`: Mitigates Cross-Site Scripting (XSS) token theft.
  - `Secure`: Transmitted strictly over HTTPS in production.
  - `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF) on cross-origin navigation.
  - `Path=/`: Accessible across all Next.js application routes.

---

## 2. Refresh Token Concurrency & Race Condition Defense

When multiple dashboard components or browser tabs fetch data simultaneously using an expired access token, multiple requests may attempt to exchange the refresh token simultaneously.

**Supabase Refresh Token Reuse Detection**:
If a refresh token is used twice, Supabase assumes token compromise and revokes the entire session family immediately.

### Prevention Protocol (`@supabase/ssr` with Client Mutex):
```mermaid
sequenceDiagram
    autonumber
    Tab 1->>Client Middleware: Request 1 (Access Token Expired)
    Tab 2->>Client Middleware: Request 2 (Access Token Expired)
    Client Middleware->>Client Middleware: Acquire In-Memory Refresh Lock / Mutex
    Note over Client Middleware: Tab 1 executes token exchange; Tab 2 waits for lock
    Client Middleware->>Supabase Auth: POST /auth/v1/token?grant_type=refresh_token
    Supabase Auth-->>Client Middleware: Return Fresh Access Token + New Refresh Token
    Client Middleware->>Client Middleware: Update Shared Cookies
    Client Middleware->>Client Middleware: Release Lock
    Note over Client Middleware: Tab 2 uses fresh Access Token without calling Supabase again
```

---

## 3. Session Revocation & Sign-Out

1. **User-Initiated Sign-Out**:
   - Client calls `supabase.auth.signOut()`.
   - The active refresh token is marked as revoked in Supabase Auth.
   - All session cookies (`sb-access-token`, `sb-refresh-token`) are cleared with `Max-Age=0`.
   - BroadcastChannel API notifies all other open browser tabs of the sign-out event, prompting an immediate UI redirect to `/login`.
2. **Password Reset Revocation**:
   - Updating an account password immediately invalidates all active sessions across all devices.
