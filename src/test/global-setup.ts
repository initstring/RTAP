import { spawn } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const DEFAULT_DATABASE_URL = "postgresql://rtap:rtap@localhost:5432/rtap_test";

const resolveTestDatabaseUrl = () => {
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const base = process.env.DATABASE_URL?.trim() ?? DEFAULT_DATABASE_URL;
  return base;
};

async function runPrismaReset(databaseUrl: string) {
  const prismaBin = path.resolve("node_modules/.bin/prisma");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      prismaBin,
      ["migrate", "reset", "--force", "--skip-generate", "--skip-seed", "--schema", "prisma/schema.prisma"],
      {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: databaseUrl },
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma migrate reset exited with code ${code}`));
      }
    });
  });
}

const isDuplicateDatabaseError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const prismaError = error as { code?: string; meta?: { code?: string } };
  return prismaError.code === "42P04" || prismaError.meta?.code === "42P04";
};

async function ensureDatabaseExists(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("TEST_DATABASE_URL must specify a database name");
  }

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const prisma = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });

  try {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  } catch (error) {
    if (!isDuplicateDatabaseError(error)) {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalSetup() {
  const connectionString = resolveTestDatabaseUrl();
  await ensureDatabaseExists(connectionString);
  process.env.TEST_DATABASE_URL = connectionString;
  process.env.DATABASE_URL = connectionString;
  await runPrismaReset(connectionString);
}
