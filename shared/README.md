# SiteScope — Shared Contracts & Types

This package contains shared TypeScript interfaces, enums, and Zod validation schemas used across `@sitescope/frontend`, `@sitescope/backend`, and `@sitescope/worker`.

## Security Rule
This package contains **NO secrets** and **NO server-only modules**. It is safe to import in both client-side Next.js code and Fastify/Worker backend code.
