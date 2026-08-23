# Classique Interiors

An internal project-controls workspace for managing interior BOQs, vendor quotations, approvals, and commercial decisions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live
- `artifacts/classique-interiors` — React/Vite application with dashboard, projects, BOQs, vendors, quotations, and commercial comparisons.
- `artifacts/api-server/src/routes/classique.ts` — current API routes and DEMO seed data for the first workflow slice.
- `lib/api-spec/openapi.yaml` — source-of-truth contract for generated API hooks and validation.

## Architecture decisions
- The first release is organized around the BOQ workflow and exposes dashboard summaries as a dedicated read endpoint.
- Client-facing navigation deliberately separates project value and cost-control surfaces so future role permissions can be applied without restructuring pages.
- DEMO records are clearly marked by the API and are used to make the workflow testable on first launch.

## Product
Classique Interiors gives estimators, procurement, site teams, and management a shared view of project stages, BOQ versions, vendor pricing, pending actions, and commercial comparisons.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
