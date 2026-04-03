# Local Development

## Setup

Local development uses the Node.js dev server running directly on your machine with a container running Postgres for the DB. This lets you edit source files and quickly review changes while matching the production schema and migration behavior.

From the repository root:

```sh
# Copy the local dev env file and replace secrets
cp .env.example-dev .env

# Install dependencies
npm install

# Start (or restart) the local Postgres container
docker compose -f deploy/docker/docker-compose.dev.yml up -d

# Apply migrations and seed first-run admin + MITRE content
npm run init

# Optional: enable demo admin login (set ENABLE_DEMO_MODE=true in .env)

# Optionally seed demo taxonomy/operation data (FOR DEMO PURPOSES ONLY)
npm run seed:demo

# Start the dev server
npm run dev

# When finished for the day
docker compose -f deploy/docker/docker-compose.dev.yml down

# Trash the DB to start from scratch (YOUR DATA WILL BE DELETED)
docker volume rm docker_dev-postgres-data
```

## Troubleshooting

### I changed `INITIAL_ADMIN_EMAIL` or SSO and can’t sign in

If you need to re-bootstrap the initial admin account (for example after changing `INITIAL_ADMIN_EMAIL`), re-run the initializer:

```sh
npm run init
```

### Environment variables

Local development uses the same env variable names as Docker (for example, `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`). The local `.env.example` also includes `TEST_DATABASE_URL` for the test runner.

## Testing

The test suites relies on the Postgres container running. It uses a test database defined in your `.env` file - `TEST_DATABASE_URL` as it wipes, loads, and migrates as part of the testing.

All PRs should pass the following:

```sh
npm run check
npm run test
npm run build
```
