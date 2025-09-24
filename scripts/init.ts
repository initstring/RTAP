/*
 * Deterministic first-run initialization for all environments.
 * - Applies schema (runs pending migrations)
 * - Creates initial admin and seeds MITRE data when empty (via ensureInitialized)
 * - Logs at info level regardless of LOG_LEVEL to aid operations
 */
import 'dotenv/config';
import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

async function detectLegacyBaselineNeeded(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!databaseUrl) return false;

  try {
    const { Prisma, PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient({ log: ['error'] });
    try {
      if (databaseUrl.startsWith('file:')) {
        const tables = await db.$queryRaw<Array<{ name: string }>>(
          Prisma.sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`,
        );
        if (tables.length === 0) return false;
        return !tables.some((table) => table.name === '_prisma_migrations');
      }

      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        const tables = await db.$queryRaw<Array<{ name: string }>>(
          Prisma.sql`SELECT tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = 'public';`,
        );
        if (tables.length === 0) return false;
        return !tables.some((table) => table.name === '_prisma_migrations');
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.warn('[init] Skipping baseline detection; could not inspect database:', error);
  }

  return false;
}

async function runPrismaCommand(args: string[]): Promise<void> {
  const prismaBin = path.resolve('node_modules/.bin/prisma');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(prismaBin, args, {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`Prisma CLI exited with code ${code}`));
    });
  });
}

async function main() {
  // Basic validation
  const required = ['AUTH_SECRET', 'DATABASE_URL'];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    console.error('[init] Missing required env:', missing.join(', '));
    process.exit(1);
  }

  // Apply pending migrations or push schema on first run using Prisma CLI
  try {
    const migrationsDir = path.resolve('prisma/migrations');
    const migrationFolders = existsSync(migrationsDir) ? readdirSync(migrationsDir).filter((entry) => !entry.startsWith('.')).sort() : [];
    const hasMigrations = migrationFolders.length > 0;

    if (hasMigrations) {
      const baselineMigration = migrationFolders[0];
      if (baselineMigration && (await detectLegacyBaselineNeeded())) {
        console.info(
          `[init] Existing schema without migration history detected; marking ${baselineMigration} as applied via \`prisma migrate resolve\` ...`,
        );
        await runPrismaCommand(['migrate', 'resolve', '--applied', baselineMigration, '--schema', 'prisma/schema.prisma']);
      }
    }

    const args = hasMigrations ? ['migrate', 'deploy', '--schema', 'prisma/schema.prisma'] : ['db', 'push', '--schema', 'prisma/schema.prisma'];
    console.info(
      hasMigrations
        ? '[init] Applying database migrations via `prisma migrate deploy` ...'
        : '[init] No migrations found; syncing schema via `prisma db push` ...',
    );

    await runPrismaCommand(args);
  } catch (e) {
    console.error(
      '[init] Migration/schema sync failed. Ensure DATABASE_URL is correct and migrations are valid. Try `npm run db:migrate` or `npm run db:push` for details.',
      e,
    );
    process.exit(1);
  }

  // Call shared initializer to create admin and seed MITRE if empty
  try {
    console.info('[init] Ensuring initial data (admin + MITRE) ...');
    const { PrismaClient } = await import('@prisma/client');
    const { ensureInitialized } = await import('@server/init/ensure-initialized');
    const db = new PrismaClient({ log: ['error'] });
    await ensureInitialized(db);
    await db.$disconnect();
    console.info('[init] Initialization complete.');
  } catch (e) {
    console.error('[init] Initialization failed:', e);
    process.exit(1);
  }
}

void main();
