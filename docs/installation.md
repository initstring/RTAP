# Installation

This guide is for running RTAP with pre-built Docker containers (production or quick local trials).
If you are developing on the codebase, use the local dev workflow instead: [Local Development](./development.md).

## Docker Installation

The provided `deploy/docker/docker-compose.yml` file does not include a reverse proxy; configure your own with TLS.

### Environment files (pick the right one)

- Docker Compose: `deploy/docker/.env.example` → `deploy/docker/.env`
- Local development: `.env.example` (repo root) → `.env`

Docker Compose only reads `deploy/docker/.env`, so keep that file next to `deploy/docker/docker-compose.yml`.

### Configure the Docker `.env` file

From the repository root:

```sh
cd deploy/docker
cp .env.example .env
```

Minimum values to edit:

- `AUTH_SECRET` (required, at least 32 characters)
- `INITIAL_ADMIN_EMAIL` (your admin account)
- `POSTGRES_PASSWORD` (database password)
- `AUTH_URL` (public URL users will visit)

`DATABASE_URL` is already pre-wired to the postgres container (`rtap-postgres`). Keep it unless you are pointing to an external database.

### Choose authentication mode

RTAP supports Google SSO or a demo login button.

- **Google SSO (recommended):** set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Demo mode:** set `ENABLE_DEMO_MODE=true`. This exposes a “Sign in as Demo Admin” button and **anyone with access to the sign-in page can log in without an account**. Use only for isolated demos.

For Google, configure the following in the Google Cloud console:

- Authorized JavaScript origins: matches `AUTH_URL` from `.env`.
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/google`.

### Start the containers

From the repository root:

```sh
cd deploy/docker
docker compose up -d

# Optional - seed demo taxonomy/operation data (FOR DEMO PURPOSES ONLY)
docker exec rtap-web npm run seed:demo
```

## Logging

- Server logs emit to stdout/stderr (structured JSON in production, pretty in development). Rely on Docker and the host OS for collection and rotation.
- Log level defaults: `debug` in development, `info` in production. Override with `LOG_LEVEL`.
