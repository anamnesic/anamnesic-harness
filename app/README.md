# app

Next.js App Router — frontend web application and API endpoints.

## Structure

```
app/
  layout.tsx          Root layout (HTML, metadata, globals)
  page.tsx            Landing page
  globals.css         Tailwind CSS v4 global styles
  dashboard/
    page.tsx          Dashboard with live API data
  api/
    health/route.ts   GET /api/health — server health check
    providers/route.ts  GET /api/providers — provider list
    sessions/route.ts   GET /api/sessions — session list
```

## Dev

```bash
# from repo root
pnpm next dev --port 3000
```

## Config

- `next.config.ts` at repo root
- `postcss.config.mjs` at repo root (Tailwind v4 via `@tailwindcss/postcss`)

## Dependencies

Uses repo-level deps: `next`, `react`, `react-dom`, `lucide-react`, `tailwindcss`.
