import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { usersRouter } from "@/server/api/routers/users";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    user: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    operation: { count: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

describe("Users Router — update/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user details", async () => {
    const updateData = { id: "user-123", name: "Updated Name", email: "updated@test.com", role: UserRole.OPERATOR } as const;
    const mockUpdatedUser = {
      id: updateData.id,
      name: updateData.name,
      email: updateData.email,
      role: updateData.role,
      lastLogin: null,
    };
    mockDb.user.findFirst.mockResolvedValue(null);
    mockDb.user.update.mockResolvedValue(mockUpdatedUser);
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    const res = await caller.update(updateData);
    expect(res).toEqual({
      id: updateData.id,
      name: updateData.name,
      email: updateData.email,
      role: updateData.role,
      lastLogin: null,
    });
  });

  it("normalizes email casing before updating", async () => {
    const updateData = {
      id: "user-123",
      name: "Updated Name",
      email: "Updated@Test.com ",
      role: UserRole.OPERATOR,
    } as const;
    const normalizedEmail = "updated@test.com";
    mockDb.user.findFirst.mockResolvedValue(null);
    mockDb.user.update.mockResolvedValue({
      id: updateData.id,
      name: updateData.name,
      email: normalizedEmail,
      role: updateData.role,
      lastLogin: null,
    });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    const res = await caller.update(updateData);

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({ where: { email: normalizedEmail, id: { not: updateData.id } } });
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: normalizedEmail }) }),
    );
    expect(res.email).toBe(normalizedEmail);
  });

  it("prevents admin from removing their own admin role", async () => {
    const adminId = "admin-123";
    const ctx = createTestContext(mockDb, UserRole.ADMIN, adminId);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.update({ id: adminId, role: UserRole.OPERATOR })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove admin role from your own account" }),
    );
  });

  it("prevents email conflicts", async () => {
    mockDb.user.findFirst.mockResolvedValue({ id: "other-user", email: "taken@test.com" });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.update({ id: "user-123", email: "taken@test.com" })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Email is already taken by another user" }),
    );
  });

  it("deletes user when they have no operations", async () => {
    const userToDelete = { id: "user-to-delete", name: "User To Delete", email: "delete@test.com" };
    mockDb.operation.count.mockResolvedValue(0);
    mockDb.user.delete.mockResolvedValue(userToDelete);
    const ctx = createTestContext(mockDb, UserRole.ADMIN, "admin-123");
    const caller = usersRouter.createCaller(ctx);
    const res = await caller.delete({ id: "user-to-delete" });
    expect(res).toEqual(userToDelete);
  });

  it("prevents admin from deleting their own account", async () => {
    const adminId = "admin-123";
    const ctx = createTestContext(mockDb, UserRole.ADMIN, adminId);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.delete({ id: adminId })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account" }),
    );
  });
});
