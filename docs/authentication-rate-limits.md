# SiteScope — Authentication Rate Limiting & Brute-Force Defense

## 1. Threat Model: Credential Stuffing vs. Denial of Service

Attackers frequently attempt credential stuffing against SaaS login forms. However, a naive defense that locks a user's account after 5 failed password attempts creates a critical **Denial-of-Service (DoS) vulnerability**: an attacker can intentionally lock out arbitrary legitimate users simply by submitting wrong passwords for their email addresses.

**SiteScope Defense Policy**:
- **Never lock out an account globally across all IPs** based on unauthenticated password failures.
- Enforce strict **IP + Email tuple throttling** and progressive backoff delays.

---

## 2. Throttling Parameters & Progressive Backoff

| Operation | Scope Key | Allowed Attempts | Sliding Window | Response When Exceeded |
| :--- | :--- | :--- | :--- | :--- |
| **Login Attempt** | `auth:login:ip:{clientIp}` | 10 attempts | 15 minutes | HTTP 429 Too Many Requests |
| **Login Attempt** | `auth:login:acc:{hash(email)}` | 5 failed attempts | 15 minutes | Cloudflare Turnstile challenge triggered |
| **Signup Registration** | `auth:signup:ip:{clientIp}` | 3 accounts | 1 hour | HTTP 429 Too Many Requests |
| **Password Reset Request**| `auth:reset:email:{hash(email)}` | 3 requests | 1 hour | Generic 200 OK (Email suppressed) |
| **Email Verification Resend**| `auth:verify:email:{hash(email)}` | 2 requests | 15 minutes | HTTP 429 with Retry-After header |

---

## 3. Progressive Delay Algorithm

When an IP address incurs successive login failures for the same account:
- **Failure 1–2**: Normal response time (~100ms).
- **Failure 3**: Artificial sleep injected: **1,000ms**.
- **Failure 4**: Artificial sleep injected: **3,000ms**.
- **Failure 5+**: Return `HTTP 429 Too Many Requests` with `Retry-After: 900` seconds (15 minutes).
