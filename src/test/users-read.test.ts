import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { usersRouter } from "@/server/api/routers/users";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

describe("Users Router — read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns all users for admin", async () => {
      const mockUsers = [
        { id: "1", name: "Admin User", email: "admin@test.com", role: UserRole.ADMIN, lastLogin: null },
        { id: "2", name: "Operator User", email: "operator@test.com", role: UserRole.OPERATOR, lastLogin: null },
      ];
      mockDb.user.findMany.mockResolvedValue(mockUsers);
      const ctx = createTestContext(mockDb, UserRole.ADMIN);
      const caller = usersRouter.createCaller(ctx);
      const result = await caller.list();
      expect(result).toEqual([
        { id: "1", name: "Admin User", email: "admin@test.com", role: UserRole.ADMIN, lastLogin: null },
        { id: "2", name: "Operator User", email: "operator@test.com", role: UserRole.OPERATOR, lastLogin: null },
      ]);
    });

    it("forbids non-admin users", async () => {
      for (const role of [UserRole.OPERATOR, UserRole.VIEWER] as const) {
        const ctx = createTestContext(mockDb, role);
        const caller = usersRouter.createCaller(ctx);
        await expect(caller.list()).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }));
      }
    });
  });

  describe("me", () => {
    it("returns current user profile", async () => {
      const mockUser = { id: "user-123", name: "Test User", email: "test@example.com", role: UserRole.OPERATOR, lastLogin: null };
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      const ctx = createTestContext(mockDb, UserRole.OPERATOR, "user-123");
      const caller = usersRouter.createCaller(ctx);
      const res = await caller.me();
      expect(res).toEqual({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        role: UserRole.OPERATOR,
        lastLogin: null,
      });
    });
  });
});
