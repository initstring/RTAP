/*
 * Manual utility to generate a one-time login link for the initial admin user.
 *
 * - Requires DATABASE_URL and AUTH_SECRET to be configured (same as init script)
 * - Looks up the user defined by INITIAL_ADMIN_EMAIL (defaults to admin@example.com)
 * - Prints the generated login URL and expiry to stdout without emitting info-level logs
 */
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const requiredEnv = ['AUTH_SECRET', 'DATABASE_URL'];
  const missing = requiredEnv.filter((key) => !process.env[key] || String(process.env[key]).trim() === '');

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const initialEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? 'admin@example.com';

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter, log: ['error'] });
  try {
    const adminUser = await db.user.findUnique({ where: { email: initialEmail } });
    if (!adminUser) {
      throw new Error(
        `No user found for ${initialEmail}. Run \`npm run init\` first to provision the initial admin account.`,
      );
    }

    const { createLoginLink } = await import('@server/auth/login-link');
    const { url, expires } = await createLoginLink(db, {
      email: initialEmail,
      baseUrl: process.env.AUTH_URL,
    });

    console.log('Generated a one-time login link for the initial admin user.');
    console.log(url);
    console.log(`Expires at ${expires.toISOString()}`);
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error) => {
  console.error('[generate-admin-login] Failed to generate admin login link:', error);
  process.exit(1);
});
