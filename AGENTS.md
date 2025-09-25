# Engineering Guidelines (AGENTS)

Concise, enforceable standards for this app. Enough context to work effectively without bloating agent memory.

## What This App Is
- Mission: Manage and analyze red‑team operations and defensive effectiveness.
- Core objects: Operations → Techniques → Outcomes, plus Taxonomy (tags, tools, log sources, crown jewels, threat actors) and MITRE data.
- Users and roles: ADMIN, OPERATOR, VIEWER. Groups are optional to restrict access per operation.
- Tech stack: Next.js 15 (App Router) + TypeScript, tRPC v11 + Zod, Prisma, NextAuth v5, Tailwind.
- Local development runs the Next.js dev server against a local PostgreSQL container; production environments use Docker with Postgres (user provides their own reverse proxy)

## Quick Commands
- `npm run db:up` — Start local Postgres (`deploy/docker/docker-compose.dev.yml`)
- `npm run init` — Apply migrations + seed baseline data
- `npm run dev --turbo` — Start dev server
- `npm run db:migrate -- --name <change>` — Create a new migration during development
- `npm run db:deploy` — Apply committed migrations to the current database
- `npm run seed:demo` — Populate optional demo taxonomy/operation data
- `npm run check` — Lint + type-check (must be clean)
- `npm run test` — Run tests
- `npm run build` — Production build

## Core Principles
- Security first: all app routes and tRPC procedures require authentication. No public endpoints other than login.
- Single source of truth: no duplicated APIs for the same data/metric.
- Keep API shapes stable during structural refactors.
- Predictable typing: no `any`. Use Zod to validate inputs and Prisma types for DB results.
- Prefer small, composable modules; target **300–700 LoC** per file.

## Target Structure & Imports
```
src/
  app/                         # Next.js app router
  features/                    # Domain UI + hooks (operations, analytics, settings, shared)
  components/ui/               # Shared UI primitives only
  lib/                         # Framework‑agnostic utilities and MITRE helpers
  server/
    api/routers/               # All tRPC routers (entity + analytics)
    services/                  # Shared DB/service logic
    auth/                      # NextAuth config/callbacks
    db/                        # DB bootstrap helpers
  test/                        # Vitest tests, factories, utilities
  types/                       # Global ambient types
```
- Do not create routers under `src/features/**`; keep them in `src/server/api/routers/**`.
- Keep analytics-only logic under `src/server/api/routers/analytics/**` (no CRUD).
- `src/lib/**` remains React-free.

### Path Aliases (`tsconfig.json`)
```
"paths": {
  "@/*": ["src/*"],
  "@features/*": ["src/features/*"],
  "@server/*": ["src/server/*"],
  "@lib/*": ["src/lib/*"],
  "@components/*": ["src/components/*"]
}
```

### Lint Boundaries
Use `eslint-plugin-boundaries` and `no-restricted-imports` to discourage cross‑feature leaks.

## Auth & Access
- Use `protectedProcedure`/`viewerProcedure`/`operatorProcedure`/`adminProcedure` (no public procedure).
- Use the shared access helpers from `src/server/api/access.ts` everywhere you need operation scoping:
  - `getAccessibleOperationFilter(ctx)` — list queries
  - `checkOperationAccess(ctx, operationId, action)` — view/modify checks
- Group-based rule: operations are either `EVERYONE` or `GROUPS_ONLY`. Non-admins must belong to at least one of the operation's `accessGroups` when visibility is `GROUPS_ONLY`; `EVERYONE` operations are visible to all authenticated roles.
- Redirect policy: Middleware gates all routes; unauthenticated API calls get 401 JSON, and pages redirect to `/auth/signin` (with `callbackUrl`).
- Layout gating (route group pattern):
  - Put all protected pages under `src/app/(protected-routes)/**` and add a server `layout.tsx` in that group that calls `auth()` and redirects to `/auth/signin` when missing. This prevents static prerender.
  - Do not duplicate auth checks in child layouts/pages under the group. Rely on the group layout for auth.
  - Keep `src/app/(protected-routes)/settings/layout.tsx` for the admin-only rule; it should only enforce `session.user.role === ADMIN` (assumes auth already passed).
  - Keep public auth at `src/app/(public-routes)/auth/signin/**`.
  - Passkey enrollment happens from the account page after first login via a one-time link.
  - The homepage `/` is under the protected group and does not need page-level `auth()`.

## API Architecture
- Routers by concern:
  - Entity routers: CRUD and simple queries.
  - Analytics router: aggregations and metrics only (no CRUD). Keep analytics here; do not duplicate analytics in entity routers.
- Consistent shapes: list and get endpoints should return the same entity shape.
- Input validation: all endpoints validate with Zod; avoid optional/loose shapes when a stricter one is known.
- Error semantics: prefer `TRPCError({ code, message })`; do not leak internal details.
- Services layer: Routers validate/auth, then call small service functions for shared DB logic. Services throw `TRPCError` on validation failures and return Prisma-typed results. This avoids duplication across routers and import flows.

### Services Layer
- Purpose: keep routers thin, reduce duplication, standardize validation and errors.
- Location: `src/server/services/*` (e.g., `operationService.ts`, `techniqueService.ts`).
- Use when: logic is reused by multiple routers/flows or validation is nontrivial.
- Avoid when: a trivial, single Prisma call unlikely to be reused.
- Conventions:
  - Signature: function(db: PrismaClient, dto) => Prisma-typed entity/result.
  - Inputs: routers own Zod validation; services accept already-narrowed DTOs.
  - Errors: throw `TRPCError({ code, message })`; do not return error objects.
  - Auth: none in services; use access helpers in routers.
  - Shapes: return include/select shapes the UI/tests already rely on.
- Testing: prefer router-level tests; mock `ctx.db` and assert service usage, returned shapes, and TRPC errors. Only unit-test services directly when they have substantial logic.
- Current services:
  - `operationService.ts`: `createOperationWithValidations`, `updateOperationWithValidations`
  - `techniqueService.ts`: `getNextTechniqueSortOrder`, `createTechniqueWithValidations`
  - `threatActorService.ts`: `createThreatActor`, `updateThreatActor`, `deleteThreatActor`
  - `outcomeService.ts`: `createOutcome`, `updateOutcome`, `deleteOutcome`, `bulkCreateOutcomes`, `defaultOutcomeInclude`
  - `groupService.ts`: `createGroup`, `updateGroup`, `deleteGroup`, `addMembersToGroup`, `removeMembersFromGroup`
  - `userService.ts`: `createUser`, `updateUser`, `defaultUserSelect`
  - `taxonomyService.ts`: `create/update/delete` for `crownJewel`, `tag`, `toolCategory`, `tool`, `logSource`

## TypeScript Standards
- Strict mode; zero `any` (use `unknown` + narrowing when needed).
- Prefer inference over assertions; avoid `as any`.
- Export canonical context types from `trpc.ts` and use them in helpers:
  - `TRPCContext` — raw context
  - `AuthedContext` — non-null `session` (for protected flows)

## Data & Validation
- DB reads: request the minimum fields needed (`select` over broad `include` when possible).
- DB writes (bulk/restore): validate and whitelist with Zod before persisting.
- Seed/restore: keep side-effecting routines isolated in the server layer (no UI logic).

## Client UI Standards
- Viewer UX is read-only:
  - Hide editing affordances, disable DnD, prevent opening editors.
  - Present a neutral view (avoid green accent unless signaling success/positive state).
- Destructive actions: place at the bottom with a themed confirmation (no browser popups).
- Keep pages focused: avoid unnecessary “view all”/CTA clutter in headers.

### UI Style Guide (STYLE.md)
- Source of truth: `docs/dev/STYLE.md`. Follow it for tokens, card variants, hover states, and confirmation patterns.
- Cards: use neutral default cards (1px border) for all list/content sections; use `variant="elevated"` only for overlays/modals.
- Hover: navigational cards may show a subtle ring; edit-in-place rows/cards do not have a card-level hover ring and expose InlineActions.
- Destructive actions: always use `ConfirmModal` (secondary Cancel, danger Delete). No browser `confirm()`.
- Heatmaps/metrics: use tokens; avoid hardcoded brand colors.
- Keep STYLE.md current: when you migrate or alter a pattern, tick the checklist items and add a short rule if you had to make a new decision.
- Before merging UI work: scan the affected pages to ensure surfaces, buttons, and confirmations match STYLE.md, then run `npm run check`.

## Logging & Observability
- No raw `console.log`/`console.error` in production paths. Use a tiny logger utility gated by env.
- Avoid PII in logs. Include a `requestId` in context where helpful for tracing.

## Performance
- Push aggregations to the DB when reasonable. Minimize N+1 and heavy `include`s.
- Cache is optional and local for now (short TTL in-memory) — only where it demonstrably reduces cost.
- Add indexes when access filters become hot paths (e.g., group/tag lookups).

## Testing
- Run `npm run check` and `npm run test` on every PR.
- Tests live under `src/test/**` with factories in `src/test/factories/**` and helpers in `src/test/utils/**`.
- Split large scenario-dense tests into focused files.
- Access control: helper tests + router-level tests to assert filters are enforced.
- Analytics completeness: return all tactics with zeroed metrics when not executed.
- Validation: inputs fail fast with clear messages.
- Coverage: run `npm run test:coverage`; prioritize server routers, services, and shared libs. UI and scripts are excluded. Keep test files small and modular.

## Process
- Before coding: run `npm run check` and scan existing patterns.
- After coding: ensure `npm run check` and `npm run test` are clean.
- New endpoints: confirm they fit the router’s concern and reuse shared helpers.

## Database Workflow
- Treat `prisma/schema.prisma` as the source of truth for all schema edits; never hand-edit existing SQL migrations.
- Create migrations with `npm run db:migrate -- --name <change>` immediately after updating the schema; commit both the schema update and the new `prisma/migrations/` folder.
- Apply committed migrations locally with `npm run db:deploy` (or `npm run init` on first run) and push the same migrations with your PR—no drift fixes after merge.
- Use `npx prisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma --exit-code` if you suspect divergence; CI runs the same guard.
- Tests target `TEST_DATABASE_URL` (default `postgresql://rtap:rtap@localhost:5432/rtap_test`) and `global-setup` creates the DB on demand before running `prisma migrate reset`, keeping your main dev database untouched.

## AI Contributor Rules (Structural PRs)
- Use `git mv` before edits to preserve history.
- Only create routers under `src/server/api/routers/**`.
- Do not bypass the services layer with raw Prisma in routers (except trivial one-liners unlikely to be reused).
- Keep updates brief and domain-scoped.
- Shape freeze: do not change endpoint shapes during structural PRs.
- Lib purity: keep `src/lib/**` framework-agnostic (no React/UI imports).

These are living guidelines — keep them concise. If something routinely surprises us, add a short rule here rather than duplicating logic in code.

## Security model quick recap:
- Operations own visibility: `EVERYONE` (all roles) or `GROUPS_ONLY` (members of at least one linked group). Non-admins inherit access from `accessGroups`; admins bypass the check.
- Viewers are read‑only across the UI; Operators can modify operations; Admins can do everything including application settings.
- Groups are optional and can further restrict access to specific operations.
- Analytics respect access: results include only data from accessible operations, but still return the full MITRE tactic/technique set (zero‑filled).

## Architecture Map (Where Things Live)
- Pages (App Router): `src/app/**`
- Domain UI & hooks: `src/features/**` (e.g., `operations/components/...`)
- Shared UI primitives: `src/components/ui/**`
- API (tRPC): `src/server/api/**`
  - `routers/*` — entity + analytics routers
  - `access.ts` — centralized access helpers
  - `trpc.ts` — initialization + `TRPCContext`/`AuthedContext`
- Services: `src/server/services/**`
- Auth config: `src/server/auth/**`
- Database: `prisma/schema.prisma`
- MITRE data: `data/mitre/enterprise-attack.json` parsed via `src/lib/mitreStix.ts`; tactic ordering in `src/lib/mitreOrder.ts`
- Env schema: `src/env.ts`
- Tests: `src/test/**` (Vitest)

## Workflow Cheatsheet (non-duplicative)
- Local run: `npm install && npm run dev --turbo`; first DB: see README “Getting Started”.
- Endpoints: follow “API Architecture” + “Auth & Access” above; validate with Zod; reuse access helpers; keep shapes consistent.
- UI: server auth, neutral viewer UX, destructive actions with themed confirmation.

## Links
- Project overview + setup: README.md
- Design overview: docs/dev/DESIGN.md
- UI style guide: docs/dev/STYLE.md
- This guide: AGENTS.md (source of truth for coding standards)
