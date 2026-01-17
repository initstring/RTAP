import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdapterUser } from "next-auth/adapters";

// Mock server-only barrier and db import so config can be imported in Vitest
vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: { user: { findUnique: vi.fn(), update: vi.fn() } } }));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

beforeEach(() => {
  mockDb.user.findUnique.mockReset();
  mockDb.user.update.mockReset();
});

describe("NextAuth signIn callback", () => {
  it("allows calls without account context", async () => {
    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");
    const result = await signInCb({ account: null, user: {} as AdapterUser });
    expect(result).toBe(true);
  });

  it("denies demo sign-in when demo mode is disabled", async () => {
    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");
    const res = await signInCb({
      account: { provider: "demo" } as any,
      user: { id: "u1", email: "user@test.com" } as AdapterUser,
    });
    expect(res).toBe(false);
  });

  it("allows Google sign-in for existing user and marks email verified", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", emailVerified: null });
    mockDb.user.update.mockResolvedValue({ id: "u1" } as never);

    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");

    const res = await signInCb({
      account: { provider: "google" } as any,
      user: { email: "User@Test.com" } as AdapterUser,
    });

    expect(res).toBe(true);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@test.com" },
      select: { id: true, emailVerified: true },
    });
    expect(mockDb.user.update).toHaveBeenCalledTimes(1);
    const updateArg = mockDb.user.update.mock.calls[0]?.[0];
    expect(updateArg).toMatchObject({ where: { id: "u1" } });
    expect(updateArg?.data?.emailVerified).toBeInstanceOf(Date);
  });

  it("skips verification update when Google user already verified", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u2", emailVerified: new Date("2024-01-01T00:00:00.000Z") });

    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");

    const res = await signInCb({
      account: { provider: "google" } as any,
      user: { email: "verified@test.com" } as AdapterUser,
    });

    expect(res).toBe(true);
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("denies Google sign-in when user does not exist", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");

    const res = await signInCb({
      account: { provider: "google" } as any,
      user: { email: "missing@test.com" } as AdapterUser,
    });

    expect(res).toBe(false);
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
});
