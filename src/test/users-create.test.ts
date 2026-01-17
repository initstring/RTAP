import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { usersRouter } from "@/server/api/routers/users";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

describe("Users Router — create & validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new user", async () => {
    const newUserData = { email: "newuser@test.com", name: "New User", role: UserRole.OPERATOR } as const;
    const mockCreatedUser = {
      id: "new-user-id",
      name: newUserData.name,
      email: newUserData.email,
      role: newUserData.role,
      lastLogin: null,
    };
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue(mockCreatedUser);
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    const result = await caller.create(newUserData);

    expect(result).toEqual({
      id: "new-user-id",
      name: "New User",
      email: "newuser@test.com",
      role: UserRole.OPERATOR,
      lastLogin: null,
    });
  });

  it("normalizes email casing before persisting", async () => {
    const newUserData = { email: "NewUser@TEST.com ", name: "New User", role: UserRole.OPERATOR } as const;
    const normalizedEmail = "newuser@test.com";
    const mockCreatedUser = {
      id: "new-user-id",
      name: newUserData.name,
      email: normalizedEmail,
      role: newUserData.role,
      lastLogin: null,
    };
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue(mockCreatedUser);
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await caller.create(newUserData);

    expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { email: normalizedEmail } });
    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: normalizedEmail }) }),
    );
  });

  it("throws when email already exists", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing", email: "existing@test.com" });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "existing@test.com", name: "Test", role: UserRole.VIEWER })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" }),
    );
  });

  it("defaults role to VIEWER", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({
      id: "u",
      name: "Test",
      email: "test@test.com",
      role: UserRole.VIEWER,
      lastLogin: null,
    });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await caller.create({ email: "test@test.com", name: "Test User" });
    expect(mockDb.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: UserRole.VIEWER }) }));
  });

  it("validates email format", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "bad", name: "Test" })).rejects.toThrow();
  });

  it("validates minimum name length", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "t@test.com", name: "" })).rejects.toThrow();
  });
});
