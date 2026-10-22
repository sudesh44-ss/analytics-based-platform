# SiteScope — Fastify REST API

Production Fastify REST API running under `/api/v1` namespace.

## Architecture & Responsibilities
- **Authentication**: JWT token verification against Supabase Auth.
- **Tenant Isolation**: Object-level authorization for projects, audits, findings, and billing records.
- **SSRF Defense**: 5-layer network validation, IP CIDR filtering, DNS rebinding socket pinning.
- **Payment Verification**: Razorpay Subscription checkout, signature verification, and raw-body webhook handler.
- **Rate Limiting**: Distributed sliding-window rate limiting with Redis.
- **Job Enqueueing**: Atomic quota reservation in PostgreSQL with BullMQ job distribution.

## Development
```bash
npm run dev
```
Runs at [http://localhost:4000](http://localhost:4000).
Health check: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health).
