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

# If not using SSO, generate 1-time login URL to set up your first passkey
docker exec rtap-web npm run generate-admin-login
```

## Authentication

### How it Works

Let's be the change we want to see in the world. There is no support for passwords! Currently supported options are:

- Passkeys (required TLS or localhost)
- Google OAuth (SSO)

The platform uses NextAuth, so adding additional SSO providers would be pretty easy.

**Admin bootstrap:**

- On first run, the application creates an admin account using `INITIAL_ADMIN_EMAIL` from your `.env`.
- If using Google SSO, just sign in with the matching Google account.
- If using passkeys, you must generate a one-time login URL (`npm run generate-admin-login`) and register a passkey for that account.

**Ongoing user management:**

- Once logged in as admin, you can create additional users.
- Google SSO users: just log in with the matching Google email.
- Passkey users: must receive a one-time login URL from the admin, then register a passkey.

**Recovery:**

- If locked out, re-run `npm run generate-admin-login` to obtain another single-use login URL for the initial admin account.

Accounts must be created inside the platform; SSO logins for unknown emails will be rejected.

### Configuration Info

Authentication options are configured in your `.env` file. The names are slightly different depending on whether you are doing local development or docker compose - the correct values are provided in the appropriate `.env-example` files.

```
# Enable or disable passkey authentication
AUTH_PASSKEYS_ENABLED=true

# Configuring the follow values will enable Google SSO
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For Google, configure the following in the Google Cloud console:

- Authorized JavaScript origins: matches `AUTH_URL` from `.env`.
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/google`.

## Logging

- Server logs emit to stdout/stderr (structured JSON in production, pretty in development). Rely on Docker and the host OS for collection and rotation.
- Log level defaults: `debug` in development, `info` in production. Override with `LOG_LEVEL`.
