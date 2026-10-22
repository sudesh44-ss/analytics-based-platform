# SiteScope — Operational Troubleshooting Guide

## 1. Common Operational Issues & Remediation

### Issue 1: CORS Blocked on Frontend API Requests
- **Symptom**: Browser console displays: `Access to fetch at 'https://api.sitescope.io/api/v1/...' has been blocked by CORS policy`.
- **Root Cause**: Backend `FRONTEND_ORIGIN` does not match the exact origin of the frontend (including protocol or trailing slash).
- **Remediation**:
  1. Inspect `FRONTEND_ORIGIN` in Render API environment settings.
  2. Ensure it exactly matches `https://sitescope.io` (no trailing slash).
  3. Verify Fastify CORS plugin configuration in `backend/src/plugins/cors.ts`.

---

### Issue 2: SSRF Rejection on Valid Target Websites
- **Symptom**: User receives: `"Destination cannot be resolved or accessed"`.
- **Root Cause**:
  1. The target domain resolves to an IP inside a blocked subnet (e.g. Cloudflare proxy misconfiguration or CDN resolving to a 100.64.0.0 carrier NAT range).
  2. Target website has DNS misconfigurations with no A or AAAA records.
- **Remediation**:
  1. Check `admin_audit_logs` for `SECURITY_ALERT_SSRF_DETECTED`.
  2. Run `dig +short A <target-domain>` from a clean terminal to check resolved IPs.
  3. Confirm domain is publicly reachable from standard external DNS resolvers (8.8.8.8, 1.1.1.1).

---

### Issue 3: Razorpay Webhook Signature Mismatch (HTTP 400)
- **Symptom**: Webhook logs show: `HTTP 400 Invalid Webhook Signature`.
- **Root Cause**:
  1. Fastify parsed the JSON body into a JavaScript object before signature verification, modifying whitespace.
  2. The configured `RAZORPAY_WEBHOOK_SECRET` does not match the secret in the Razorpay dashboard.
- **Remediation**:
  1. Verify Fastify uses `addContentTypeParser` to retain `request.rawBody`.
  2. Re-copy the webhook secret from Razorpay Dashboard -> Settings -> Webhooks.

---

### Issue 4: BullMQ Redis Connection Drops
- **Symptom**: Worker logs show: `Connection to Redis failed - ECONNREFUSED`.
- **Root Cause**: Render Key Value instance suspended, or connection limits exceeded.
- **Remediation**:
  1. Check Render Key Value dashboard status.
  2. Ensure worker uses TLS connection (`rediss://...`) if connecting from external hosts.
  3. Check connection pool limits in `backend/src/services/queue.ts` and `worker/src/index.ts`.
