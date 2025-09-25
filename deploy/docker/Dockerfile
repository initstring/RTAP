# Minimal single-stage image for an MVP deployment.
# Includes devDependencies so Prisma CLI can run migrations at startup.

FROM node:20-bookworm-slim

WORKDIR /app

# Avoid interactive prompts and reduce noise
ENV SKIP_ENV_VALIDATION=1 \
    # Provide a build-time default so `prisma generate` doesn't error.
    # Runtime will override via compose/env.
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rtap

# Install OpenSSL so Prisma can detect libssl for TLS DBs (future Postgres)
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching)
# Copy package manifests and Prisma schema so postinstall (prisma generate) works
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Install deps including devDependencies so Prisma CLI is available (prisma generate runs now)
RUN npm ci --include=dev

# Copy source and build
COPY . .
# Build the Next.js app in production mode
ENV NODE_ENV=production
RUN npm run build

# App will listen on this port
EXPOSE 3000

# Deterministic init (schema + seed), then start Next.js
CMD sh -lc "node --import=tsx scripts/init.ts && node node_modules/.bin/next start -p \${PORT:-3000}"
