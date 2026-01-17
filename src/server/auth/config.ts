import { type DefaultSession, type NextAuthConfig } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { JWT as NextAuthJWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import KeycloakProvider from "next-auth/providers/keycloak";
import OktaProvider from "next-auth/providers/okta";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type UserRole } from "@prisma/client";

import { db } from "@/server/db";
import { auditEvent, logger } from "@/server/logger";
import { env } from "@/env";
import { headers } from "next/headers";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: UserRole;
  }
}

// Local extension for JWT to carry role information
type AugmentedJWT = NextAuthJWT & { role?: UserRole };

const demoModeEnabled = env.ENABLE_DEMO_MODE === "true";
const oauthProviders = new Set(["google", "keycloak", "okta"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const adapterMethods: (keyof Adapter)[] = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "deleteUser",
  "linkAccount",
  "unlinkAccount",
  "createSession",
  "getSessionAndUser",
  "updateSession",
  "deleteSession",
  "createVerificationToken",
  "useVerificationToken",
];

const isAdapterFactory = (value: unknown): value is (client: typeof db) => Adapter =>
  typeof value === "function";

const isAdapter = (value: unknown): value is Adapter => {
  if (!isRecord(value)) return false;
  return adapterMethods.every((method) => {
    const prop = value[method as keyof typeof value];
    return prop === undefined || typeof prop === "function";
  });
};

const prismaAdapter: Adapter = (() => {
  if (!isAdapterFactory(PrismaAdapter)) {
    throw new Error("Invalid Prisma adapter export");
  }
  const candidate = PrismaAdapter(db);
  if (!isAdapter(candidate)) {
    throw new Error("Prisma adapter returned an unexpected shape");
  }
  return candidate;
})();

const isErrorLike = (
  value: unknown,
): value is { name?: unknown; message?: unknown; stack?: unknown } => isRecord(value);

async function resolveUserIdentity(user: {
  id?: string | null;
  email?: string | null;
  role?: UserRole;
} | null | undefined) {
  if (!user) return null;
  if (user.role && user.id) {
    return { id: user.id, role: user.role };
  }

  if (user.id) {
    try {
      const existingById = await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true },
      });
      if (existingById) return existingById;
    } catch (error) {
      logger.warn({ event: "auth.resolve_user_failed", id: user.id, error }, "Failed resolving user by id");
    }
  }

  const email = user.email?.toLowerCase();
  if (email) {
    try {
      const existingByEmail = await db.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (existingByEmail) return existingByEmail;
    } catch (error) {
      logger.warn({ event: "auth.resolve_user_failed", email, error }, "Failed resolving user by email");
    }
  }

  return null;
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  adapter: prismaAdapter,
  useSecureCookies: env.AUTH_URL?.startsWith("https://") ?? false,
  // Route Auth.js logs through our Pino logger for concise, structured output
  logger: {
    error(error) {
      const payload: Record<string, unknown> = { event: "authjs.error" };
      const errorDetails = isErrorLike(error) ? error : null;

      if (errorDetails && typeof errorDetails.name === "string") {
        payload.name = errorDetails.name;
      }

      if (typeof error === "string") {
        payload.message = error;
      } else if (errorDetails && typeof errorDetails.message === "string") {
        payload.message = errorDetails.message;
      }

      if (
        process.env.NODE_ENV === "development" &&
        errorDetails &&
        typeof errorDetails.stack === "string"
      ) {
        payload.stack = errorDetails.stack;
      }

      logger.error(payload, "Auth.js error");
    },
    warn(code) {
      logger.warn({ event: "authjs.warn", code }, "Auth.js warn");
    },
    debug(message, metadata) {
      if (process.env.NODE_ENV === "development") {
        const payload: Record<string, unknown> = { event: "authjs.debug", message };
        if (isRecord(metadata)) Object.assign(payload, metadata);
        logger.debug(payload, "Auth.js debug");
      }
    },
  },
  providers: [
    ...(demoModeEnabled
      ? [
          CredentialsProvider({
            id: "demo",
            name: "Demo Mode",
            credentials: {},
            async authorize() {
              if (!demoModeEnabled) return null;
              const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? "admin@example.com";
              const user = await db.user.findUnique({
                where: { email },
                select: { id: true, name: true, email: true, role: true },
              });
              return user ?? null;
            },
          }),
        ]
      : []),
    // Conditionally register providers when env credentials are available.
    // Actual enablement is enforced via DB in the signIn callback/UI.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // We trust the locally provisioned accounts and block unknown e-mails in the
            // sign-in callback, so allow Auth.js to link Google users directly by e-mail.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET && process.env.KEYCLOAK_ISSUER
      ? [
          KeycloakProvider({
            clientId: process.env.KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
            issuer: process.env.KEYCLOAK_ISSUER,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER
      ? [
          OktaProvider({
            clientId: process.env.OKTA_CLIENT_ID,
            clientSecret: process.env.OKTA_CLIENT_SECRET,
            issuer: process.env.OKTA_ISSUER,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // Use Auth.js defaults for cookies to avoid environment mismatches
  callbacks: {
    // Enforce provider toggles and OAuth user existence rules
    signIn: async ({ account, user }) => {
      if (!account) return true;

      const provider = account.provider;

      if (provider === "demo") {
        if (!demoModeEnabled) {
          logger.warn({ event: "auth.demo_disabled" }, "Blocked demo sign-in because demo mode is disabled");
          return false;
        }
        const resolved = await resolveUserIdentity(user as { id?: string | null; email?: string | null });
        return Boolean(resolved);
      }

      if (oauthProviders.has(provider)) {
        const emailAddr = (user as { email?: string | null } | undefined)?.email?.toLowerCase();
        if (!emailAddr) return false;
        try {
          const existing = await db.user.findUnique({
            where: { email: emailAddr },
            select: { id: true, emailVerified: true },
          });
          if (!existing) return false;

          if (!existing.emailVerified) {
            try {
              await db.user.update({
                where: { id: existing.id },
                data: { emailVerified: new Date() },
              });
            } catch (updateError) {
              logger.warn(
                {
                  event: "auth.oauth_email_verified_update_failed",
                  provider,
                  userId: existing.id,
                  error: updateError,
                },
                "Failed to mark OAuth user as verified",
              );
            }
          }

          return true;
        } catch (error) {
          logger.warn(
            { event: "auth.oauth_validation_error", provider, error },
            "Blocked OAuth sign-in due to validation error",
          );
          return false;
        }
      }

      // Unknown providers blocked by default
      return false;
    },
    session: async ({ session, token }) => {
      const t = token as AugmentedJWT;
      session.user = {
        ...session.user,
        id: token.sub ?? (session.user?.id as string | undefined),
        role: t.role ?? (session.user as { role?: UserRole }).role!,
      } as typeof session.user;
      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        const resolved = await resolveUserIdentity(user as { id?: string | null; email?: string | null; role?: UserRole });
        if (resolved) {
          const t = token as AugmentedJWT;
          t.sub = resolved.id;
          t.role = resolved.role;
          return t;
        }
      }
      return token as AugmentedJWT;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      let headerBag: Headers | undefined;
      try {
        headerBag = await headers();
      } catch {
        headerBag = undefined;
      }

      if (user?.id) {
        try {
          await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
        } catch (error) {
          logger.warn({ event: "auth.last_login_update_failed", userId: user.id, error }, "Failed to update last login timestamp");
        }
      }

      logger.info(
        auditEvent(
          { headers: headerBag },
          "auth.sign_in",
          { provider: account?.provider, isNewUser },
          { actor: user as { id?: string | null; email?: string | null } | null | undefined },
        ),
        "User signed in",
      );
    },
    async signOut(message) {
      let headerBag: Headers | undefined;
      try {
        headerBag = await headers();
      } catch {
        headerBag = undefined;
      }

      if ("session" in message) {
        const sessionData = message.session as { user?: { id?: string | null; email?: string | null } } | undefined;
        const sessionUser = sessionData?.user;
        logger.info(
          auditEvent({ headers: headerBag }, "auth.sign_out", undefined, { actor: sessionUser }),
          "User signed out",
        );
        return;
      }

      const token = message.token;
      const tokenActor: { id?: string | null; email?: string | null } = {
        id: token?.sub,
        email: (token as { email?: string | null } | undefined)?.email ?? undefined,
      };
      logger.info(
        auditEvent({ headers: headerBag }, "auth.sign_out", undefined, { actor: tokenActor }),
        "User signed out",
      );
    },
  },
  pages: {
    // Use our custom, sleek page that matches STYLE.md
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
