import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { UserRole, PrismaClient } from "@prisma/client";
import { createOperationWithValidations, updateOperationWithValidations } from "@/server/services/operationService";

const user = { id: "u1", role: "OPERATOR" as UserRole };

const mockDb = {
  threatActor: { findUnique: vi.fn() },
  tag: { findMany: vi.fn() },
  target: { findMany: vi.fn() },
  group: { findMany: vi.fn() },
  userGroup: { count: vi.fn() },
  operation: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

describe("operationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.group.findMany.mockReset();
    mockDb.userGroup.count.mockReset();
    mockDb.userGroup.count.mockResolvedValue(1);
  });

  // Tag-based access removed; tags are metadata only

  it("throws on create when tag not found", async () => {
    mockDb.tag.findMany.mockResolvedValue([]);
    await expect(
      createOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { name: "Op", description: "D", tagIds: ["missing"] },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" }));
  });

  it("throws on create when target missing", async () => {
    mockDb.target.findMany.mockResolvedValue([]);
    await expect(
      createOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { name: "Op", description: "D", targetIds: ["t1"] },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "One or more targets not found" }));
  });

  it("throws on update when operation not found", async () => {
    mockDb.operation.findUnique.mockResolvedValue(null);
    await expect(
      updateOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { id: 1, name: "New" },
      })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Operation not found" }));
  });

  it("throws on update when tag missing", async () => {
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, visibility: "EVERYONE", accessGroups: [] });
    mockDb.tag.findMany.mockResolvedValue([]);
    await expect(
      updateOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { id: 1, tagIds: ["missing"] },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" }));
  });

  it("requires accessGroupIds when creating GROUPS_ONLY visibility", async () => {
    await expect(
      createOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { name: "Op", description: "D", visibility: "GROUPS_ONLY" },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "At least one group must be provided when visibility is GROUPS_ONLY" }));
  });

  it("requires membership for GROUPS_ONLY creation", async () => {
    mockDb.group.findMany.mockResolvedValue([{ id: "g1" }]);
    mockDb.userGroup.count.mockResolvedValue(0);
    await expect(
      createOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { name: "Op", description: "D", visibility: "GROUPS_ONLY", accessGroupIds: ["g1"] },
      })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "You must belong to at least one selected group to restrict visibility" }));
  });

  it("throws when updating accessGroupIds with missing group", async () => {
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, visibility: "EVERYONE", accessGroups: [] });
    mockDb.group.findMany.mockResolvedValue([]);
    await expect(
      updateOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { id: 1, accessGroupIds: ["g1"] },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "One or more groups not found" }));
  });

  it("requires groups when switching to GROUPS_ONLY", async () => {
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, visibility: "EVERYONE", accessGroups: [] });
    await expect(
      updateOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { id: 1, visibility: "GROUPS_ONLY" },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "At least one group must be provided when visibility is GROUPS_ONLY" }));
  });

  it("requires membership when switching to GROUPS_ONLY", async () => {
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, visibility: "EVERYONE", accessGroups: [] });
    mockDb.group.findMany.mockResolvedValue([{ id: "g1" }]);
    mockDb.userGroup.count.mockResolvedValue(0);
    await expect(
      updateOperationWithValidations({
        db: mockDb as unknown as PrismaClient,
        user,
        input: { id: 1, visibility: "GROUPS_ONLY", accessGroupIds: ["g1"] },
      })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "You must belong to at least one selected group to restrict visibility" }));
  });
});
