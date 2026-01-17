# Installation

This guide is for running RTAP with pre-built Docker containers (production or quick local trials).

If you are developing on the codebase, use the local dev workflow instead: [Local Development](./development.md).

## Docker Installation

The provided `docker-compose.yml` file does not include a reverse proxy. For production usage, you'll want to add your own reverse proxy (Caddy, Traefik, nginx, etc) and configure TLS.

### Configure the Docker `.env` file

From the repository root:

```sh
cd deploy/docker
cp .env.example-prod .env
```

Minimum values to edit:

- `AUTH_SECRET` (required, at least 32 characters)
- `INITIAL_ADMIN_EMAIL` (your admin account)
- `POSTGRES_PASSWORD` (database password)
- `AUTH_URL` (URL the app will be accessed on)

### Choose authentication mode

RTAP supports SSO or a demo login button. Supported SSO providers today are Google, GitHub, GitLab, Keycloak, and Okta. If you need another provider, open an issue and we can add it.

- **SSO (recommended):** configure your provider's details (client ID/secret, plus issuer for Keycloak/Okta) using the variable names provided in the .env file.
- **Demo mode:** set `ENABLE_DEMO_MODE=true`. This exposes a “Sign in as Demo Admin” button and **anyone with access to the sign-in page can log in without an account**. Use only for isolated testing or demos.

For any SSO provider, configure the following in your identity provider console:

- Authorized JavaScript origins: matches `AUTH_URL` from `.env`.
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/<provider>` (for example, `/api/auth/callback/github`).

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
