# Red Team Assessment Platform Design (Current)

A concise, accurate description of how RTAP works today.

## Purpose

Plan and execute red‑team operations and measure defensive effectiveness (detection, prevention, attribution).

## Roles & Access

- Admin: full access; manage users, groups, taxonomy, database.
- Operator: create/edit operations and techniques; record outcomes.
- Viewer: read‑only.
- Visibility + Groups: operations are `EVERYONE` (all authenticated roles) or `GROUPS_ONLY` (members of at least one linked access group). Non-admins inherit visibility from `accessGroups`; admins bypass the filter.
- All routes/API require auth. Middleware redirects unauthenticated HTML to `/auth/signin` and 401s API callers. Protected sections (`/settings/**`, `/analytics/**`, `/operations/**`) run inside the `(protected-routes)` server layout, which calls `auth()` once to force redirects and prevent static prerender. Child layouts/pages do not duplicate the check; the homepage `/` also lives under that protected layout.

## Architecture

- Next.js 15 (App Router) + TypeScript
- tRPC v11 (Zod validation); Prisma targeting PostgreSQL (local dev uses a Docker container, production uses managed Postgres)
- NextAuth (passkey-first, with optional OAuth)
- Access helpers enforce scoping and rights: `getAccessibleOperationFilter`, `checkOperationAccess`.

### Conventions (where things live)

- UI (features-first): `src/features/<domain>/{components,hooks}`; shared domain widgets in `src/features/shared/**`.
- Primitives: `src/components/ui/**` (buttons, inputs, cards, etc.).
- Server: `src/server/api/routers/**` (entity + analytics routers), `src/server/services/**` (shared DB logic), `src/server/auth/**`.
- Lib: `src/lib/**` framework-agnostic utilities (no React).
- Path aliases: `@features/*`, `@server/*`, `@lib/*`, `@components/*`, and `@/*` for concise imports.
- Naming: keep current names for now; future cleanup will normalize React component filenames to kebab-case and utilities to camelCase.

## Navigation & UI Standards

- Sidebar nav: persistent left rail with Dashboard, Operations, expandable Analytics (Matrix • Scorecard • Trends), and Settings (admin only). User menu + theme toggle live in the sidebar header.
- Surfaces: neutral cards everywhere; elevated only for modals/overlays.
- Lists: edit‑in‑place via InlineActions (pencil/trash). Navigational cards use subtle ring hover.
- Destructive actions: ConfirmModal (secondary Cancel, danger Delete). No browser confirms.

## Core Entities

- Operation { name, description, tags[], targets[], threatActor?, status, visibility, accessGroups[], techniques[] }
- Technique { tactic, technique, subTechnique?, description, start/end, sourceIp?, targetSystem?, targets[], tools[], executedSuccessfully? }
- TechniqueTarget { techniqueId, targetId, wasCompromised }
- Target { name, description, isCrownJewel }
- Outcome { type: DETECTION | PREVENTION | ATTRIBUTION, status, tools[]/logSources[], timestamp? }
- ThreatActor { name, description, topThreat, mitreTechniques[] }
- Tool { name, type: DEFENSIVE | OFFENSIVE, category }
- ToolCategory { name, type }
- Tag { name, description, color }
- LogSource { name, description }
- User { name?, email, role, groups[] }

## Screens & Flows

### Dashboard

- KPIs: totals by status; detection/prevention/attribution %; average time to detect/attribute.
- Recent Operations: neutral tiles with subtle hover; quick link to Operations.

### Operations

- Filters: search, status (All/Planning/Active/Completed/Cancelled), selectable tag chips.
- List: neutral operation cards; click to open detail. Card delete uses ConfirmModal.
- Create/Edit Operation: elevated modal with name/description, optional threat actor, dates, tags, planned targets.

#### Operation Detail

- Header: name, description, tags, threat actor, planned targets (badges call out crown jewels and show compromised state), status.
- KPIs: detection/prevention/attribution (%) computed from graded outcomes (excludes N/A).
- Tabs
  - Techniques: drag‑and‑drop list; InlineActions for edit/delete. Technique Editor (elevated) with:
    - Overview: tactic/technique (sub‑tech aware) + description.
    - Execution: start/end (datetime with “Now”), source IP, target system, offensive tools, target assignments (mark compromise per target).
    - Outcomes: grade detection/prevention/attribution; add tools/log sources; optional timestamps.
  - ATT&CK Heatmap: full MITRE matrix with executed highlighting; sub‑tech expansion; ops/all toggle available in analytics view.
  - Attack Flow: simple flow of techniques (editors can organize).

### Analytics

Neutral cards; all results respect access filters.

- Scorecard (`/analytics/scorecard`): tactic resilience, threat actor resilience, target coverage (with crown‑jewel insight), response timing, and defensive tool/log effectiveness.
- Scorecard Execution Outcomes: stacked horizontal bar chart per tactic that plots technique execution successes vs. failures (with unknown outcomes in a muted neutral). The legend reuses the analytics filter badge styling, tooltips surface the raw counts, and each row links to the contributing operations. The card sits alongside the summary metrics so teams can quickly compare totals with tactic-level performance.
- Attack Matrix (`/analytics/attack-matrix`): ATT&CK matrix with operations/all toggle.
- Trends (`/analytics/trends`): operations and effectiveness over time (charts).

### Settings

Unified pattern across tabs: SettingsHeader + EntityListCard + EntityModal; InlineActions; ConfirmModal for destructive.

- Users: create/edit; role picker; delete via ConfirmModal.
- Groups: create/edit; manage membership; one Tag per Group; delete via ConfirmModal.
- Taxonomy: Targets (optional crown‑jewel flag), Tags, Tool Categories (by type), Tools, Threat Actors (attach ATT&CK techniques), Log Sources.
- Data: overview metrics; export/import a combined operations + taxonomy backup (always replaces existing data); clear-all confirmation.

## Data & Validation

- Strict TypeScript; Zod input validation; Prisma selects favour minimal fields.
- No public procedures; server enforces access filters and modify checks.

## First Boot & DB Init

- Startup runs `scripts/init.ts` before Next.js launches. It executes `prisma migrate deploy` against `DATABASE_URL`, then ensures the initial admin user and MITRE dataset exist (parsed from `data/mitre/enterprise-attack.json` via `src/lib/mitreStix.ts`).
- Local development: run `npm run db:up` to start the Dockerized Postgres instance, then `npm run init` to apply migrations + seed baseline data. Test runs target `TEST_DATABASE_URL` (defaults to a dedicated `rtap_test` database) and reset it automatically.
- Production: bundle migrations, run `npm run db:deploy` (or the same `scripts/init.ts`) during release/startup, and persist the Postgres volume. No `prisma db push` usage in any environment.

## Database Migrations

- Prisma migrations are authoritative for schema changes. After editing `prisma/schema.prisma`, generate a named migration with `npm run db:migrate -- --name <change>`; commit both the schema diff and the new folder under `prisma/migrations/`.
- Never edit historical migrations once merged. If a PR needs tweaks, update the migration before it lands; otherwise add a new migration on top.
- Drift check: CI runs `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code --shadow-database-url $SHADOW_DATABASE_URL`. Run the same command locally when you want to confirm migrations and schema are in lockstep.
- Reproducibility: `npm run init` (or `npx prisma migrate reset`) rebuilds the database from migrations and seeds—use it to verify upgrades and fresh installs behave the same.
