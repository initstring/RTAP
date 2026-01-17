# Installation

Follow these instructions to set up Red Team Assessment Platform (RTAP) in local development or production environments.

## Docker Installation

The provided `deploy/docker/docker-compose.yml` file does not include a reverse proxy; configure your own with TLS.

```sh
cd deploy/docker

# Copy example env file and replace secrets
cp .env.example .env

docker compose up -d

# Optionally - seed demo taxonomy/operation data (FOR DEMO PURPOSES ONLY)
docker exec rtap-web npm run seed:demo

# Optional: enable demo admin login for trials (see Authentication below)
```

## Authentication

### How it Works

Let's be the change we want to see in the world. There is no support for passwords! Authentication is SSO-first (Google OAuth today), with an optional demo-mode button for trials.

**Admin bootstrap:**

- On first run, the application creates an admin account using `INITIAL_ADMIN_EMAIL` from your `.env`.
- If using Google SSO, sign in with the matching Google account.
- If using demo mode, click "Sign in as Demo Admin" (requires `ENABLE_DEMO_MODE=true`).

**Ongoing user management:**

- Once logged in as admin, you can create additional users.
- Google SSO users: log in with the matching Google email.

Accounts must be created inside the platform; SSO logins for unknown emails will be rejected.

### Configuration Info

Authentication options are configured in your `.env` file. The names are slightly different depending on whether you are doing local development or docker compose - the correct values are provided in the appropriate `.env-example` files.

```
# Demo mode: expose a demo admin login button on the sign-in page
ENABLE_DEMO_MODE=false

# Configuring the following values will enable Google SSO
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For Google, configure the following in the Google Cloud console:

- Authorized JavaScript origins: matches `AUTH_URL` from `.env`.
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/google`.

## Logging

- Server logs emit to stdout/stderr (structured JSON in production, pretty in development). Rely on Docker and the host OS for collection and rotation.
- Log level defaults: `debug` in development, `info` in production. Override with `LOG_LEVEL`.
