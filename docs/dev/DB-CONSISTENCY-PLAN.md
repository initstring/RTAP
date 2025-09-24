# Database Consistency Rollout Plan

## Context
- [x] Confirm the published Docker image already runs `scripts/init.ts`, which applies migrations before starting Next.js, so shipping new migrations only requires publishing an updated image.

## Objectives
- Align local development, CI, and production on PostgreSQL with shared Prisma migrations.
- Preserve the fast local developer loop while using Docker only for the database dependency.
- Provide deterministic automation so UI/Codex can perform database setup without manual tweaks.

## Task List

### 1. Standardize Prisma on PostgreSQL
- [ ] Update `prisma/schema.prisma` to use `provider = "postgresql"` and replace SQLite-specific field annotations with PostgreSQL-compatible ones.
- [ ] Replace the SQLite URL in `.env.example` with a PostgreSQL connection string (e.g., `postgresql://rtap:rtap@localhost:5432/rtap`).
- [ ] Regenerate the Prisma client after the provider change (`npm run postinstall`).
- [ ] Update `src/env.ts` (and any other env validation) to expect PostgreSQL URLs by default.

### 2. Establish a Baseline Migration
- [ ] Use `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` against PostgreSQL to generate `prisma/migrations/000_init/migration.sql`.
- [ ] Run `npx prisma migrate deploy --schema prisma/schema.prisma` against a fresh PostgreSQL instance to verify the baseline migration applies cleanly.
- [ ] Commit the generated migration directory and remove the SQLite database file from version control references if present.

### 3. Simplify Initialization and Local Tooling
- [ ] Update `scripts/init.ts` to always run `prisma migrate deploy` (remove the `db push` fallback) now that migrations will exist.
- [ ] Add npm scripts for common database flows (e.g., `db:migrate:dev`, `db:reset`, `db:status`) that wrap Prisma CLI commands.
- [ ] Remove redundant init helpers (e.g., `npm run dev:with-init`) and document the canonical flow: start Postgres, run `npm run init`, run `npm run dev --turbo`.

### 4. Provide a Consistent Local PostgreSQL Service
- [ ] Add `docker-compose.dev.yml` with a single PostgreSQL service (named volume, port 5432 exposed) for local use.
- [ ] Provide helper npm scripts (e.g., `db:up`, `db:down`) that shell out to `docker compose -f docker-compose.dev.yml ...` so UI/Codex can control the dev database.
- [ ] Document the local workflow in `README.md` and/or `docs/installation.md` (copy `.env.example`, start PostgreSQL, run init, start dev server).

### 5. Align Tests and GitHub Actions CI with PostgreSQL
- [ ] Update Vitest setup (`src/test/setup.ts`) to target a dedicated PostgreSQL schema or database (e.g., `rtap_test` with `?schema=vitest`).
- [ ] Add a Vitest global setup that ensures the test database is migrated (call `prisma migrate deploy` or `prisma migrate reset --force --skip-generate --schema prisma/schema.prisma` against the test URL).
- [ ] Modify `.github/workflows/ci.yml` to provision PostgreSQL via the built-in `services:` block, set `DATABASE_URL` to the service connection string, and run migrations before `npm run check`, `npm run test:coverage`, and `npm run build`.
- [ ] Add a CI safeguard (e.g., `npx prisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma --exit-code`) that fails when the schema changes without a corresponding migration directory.
- [ ] Update any other GitHub Actions (e.g., release workflows) that run Prisma commands to use the same PostgreSQL service configuration.

### 6. Streamline Production Packaging
- [ ] Remove the `sed` commands from `deploy/docker/Dockerfile` since the Prisma schema will already target PostgreSQL.
- [ ] Ensure the Docker build continues to run `npm ci --include=dev`, `prisma generate`, and `npm run build` so migrations and generated client files are baked into the published image.
- [ ] Verify the release workflow builds the image after migrations are committed, and keep the existing entrypoint (`node --import=tsx scripts/init.ts && next start`) so runtime migrations remain automatic.

### 7. Documentation and Cleanup
- [ ] Update project documentation (README, docs/dev, docs/installation) to emphasize PostgreSQL-only support and the new workflow commands.
- [ ] Remove lingering references to SQLite in code comments, scripts, or documentation.
- [ ] Communicate the new migration workflow (schema change → `npm run db:migrate:dev -- --name <change>` → commit migration) in contributor docs.

