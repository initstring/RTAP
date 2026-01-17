import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    DATABASE_URL: z
      .string()
      .refine(
        (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
        { message: "DATABASE_URL must be a valid PostgreSQL connection string" },
      ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Logging: default to debug in dev, info in prod; override with LOG_LEVEL
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    AUTH_URL: z.string().url().optional(),
    // Optional: demo-mode login button (default disabled)
    ENABLE_DEMO_MODE: z.enum(["true", "false"]).optional(),
    // Optional: Google OAuth client credentials (registers provider when present)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Optional: GitHub OAuth client credentials (registers provider when present)
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // Optional: GitLab OAuth client credentials (registers provider when present)
    GITLAB_CLIENT_ID: z.string().optional(),
    GITLAB_CLIENT_SECRET: z.string().optional(),
    GITLAB_ISSUER: z.string().optional(),
    // Optional: Keycloak OAuth client credentials (registers provider when present)
    KEYCLOAK_CLIENT_ID: z.string().optional(),
    KEYCLOAK_CLIENT_SECRET: z.string().optional(),
    KEYCLOAK_ISSUER: z.string().optional(),
    // Optional: Okta OAuth client credentials (registers provider when present)
    OKTA_CLIENT_ID: z.string().optional(),
    OKTA_CLIENT_SECRET: z.string().optional(),
    OKTA_ISSUER: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    AUTH_URL: process.env.AUTH_URL,
    ENABLE_DEMO_MODE: process.env.ENABLE_DEMO_MODE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITLAB_CLIENT_ID: process.env.GITLAB_CLIENT_ID,
    GITLAB_CLIENT_SECRET: process.env.GITLAB_CLIENT_SECRET,
    GITLAB_ISSUER: process.env.GITLAB_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID,
    OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET,
    OKTA_ISSUER: process.env.OKTA_ISSUER,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
