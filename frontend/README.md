# SiteScope — Frontend Application

Next.js 16 + TypeScript web application for SiteScope Website Analytics & Auditor SaaS.

## Features
- **Design System**: Modular CSS (CSS Modules), zero Tailwind CSS. Light and dark theme variables.
- **Client & Server Rendering**: Server-side rendering with streaming, client interactivity for charts and filters.
- **Visualizations**: Recharts for responsive SVG metrics and TanStack Table for virtualized audit inspection.
- **Authentication**: Supabase Auth via `@supabase/ssr` cookies.

## Local Development
```bash
npm run dev
```
Runs at [http://localhost:3000](http://localhost:3000).

## Environment Configuration
Copy `.env.example` to `.env.local` and populate `NEXT_PUBLIC_*` variables.
