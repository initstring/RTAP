/*
 * Deterministic first-run initialization for all environments.
 * - Applies schema (runs pending migrations)
 * - Creates initial admin and seeds MITRE data when empty (via ensureInitialized)
 * - Logs at info level regardless of LOG_LEVEL to aid operations
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';

async function main() {
  // Basic validation
  const required = ['AUTH_SECRET', 'DATABASE_URL'];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    console.error('[init] Missing required env:', missing.join(', '));
    process.exit(1);
  }

  // Always apply pending migrations via Prisma CLI
  try {
    const prismaBin = path.resolve('node_modules/.bin/prisma');
    const args = ['migrate', 'deploy', '--schema', 'prisma/schema.prisma'];
    console.info('[init] Applying database migrations via `prisma migrate deploy` ...');

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
  } catch (e) {
    console.error(
      '[init] Migration/schema sync failed. Ensure DATABASE_URL is correct and migrations are valid. Try `npm run db:migrate` for details.',
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
