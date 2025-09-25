# Local Development

## Setup

Local development uses the Node.js dev server running directly on your machine with a container running Postgres for the DB. This allows you to easily edit source files and quickly review the changes, while also matching the production schema and migration behavior exactly.

```sh
# Copy example env file and replace secrets
cp .env.example .env

# Install dependencies
npm install

# Start (or restart) the local Postgres container
docker compose -f deploy/docker/docker-compose.dev.yml up -d

# Apply migrations and seed first-run admin + MITRE content
npm run init

# If not using SSO, generate a one-time login URL to enroll your first passkey
npm run generate-admin-login

# Optionally seed demo taxonomy/operation data (FOR DEMO PURPOSES ONLY)
npm run seed:demo

# Start the dev server
npm run dev

# When finished for the day
docker compose -f deploy/docker/docker-compose.dev.yml down

# Trash the DB to start from scratch (YOUR DATA WILL BE DELETED)
docker volume rm docker_dev-postgres-data
```

## Testing

The test suites relies on the Postgres container running. It uses a test database defined in your `.env` file - `TEST_DATABASE_URL` as it wipes, loads, and migrates as part of the testing.

All PRs should pass the following:

```sh
npm run check
npm run test
npm run build
```