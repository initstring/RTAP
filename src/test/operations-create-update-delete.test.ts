import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { operationsRouter } from "@/server/api/routers/operations";
import type { OperationStatus, OperationVisibility } from "@prisma/client";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    operation: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    threatActor: { findUnique: vi.fn() },
    tag: { findMany: vi.fn() },
    target: { findMany: vi.fn() },
    userGroup: { count: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createOperationData = {
  name: "Test Operation",
  description: "Test operation description",
  threatActorId: "threat-actor-1",
  tagIds: ["tag-1", "tag-2"],
  targetIds: ["target-1"],
};

const mockOperation = {
  id: 1,
  name: "Test Operation",
  description: "Test operation description",
  status: "PLANNING" as OperationStatus,
  startDate: null,
  endDate: null,
  createdById: "user-1",
  visibility: "EVERYONE" as OperationVisibility,
  accessGroups: [] as Array<{ group: { members: Array<{ userId: string }> } }>,
  threatActorId: "threat-actor-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: { id: "user-1", name: "Test User", email: "test@example.com" },
  threatActor: { id: "threat-actor-1", name: "APT29" },
  tags: [{ id: "tag-1", name: "Purple Team" }],
  targets: [{ id: "target-1", name: "Customer Database", isCrownJewel: true }],
  techniques: [],
};

describe("Operations Router — create/update/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.userGroup.count.mockResolvedValue(1);
  });

  it("creates operation successfully", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.threatActor.findUnique.mockResolvedValue({ id: "threat-actor-1", name: "APT29" });
    mockDb.tag.findMany.mockResolvedValue([{ id: "tag-1", name: "Purple Team" }, { id: "tag-2", name: "Stealth" }]);
    mockDb.target.findMany.mockResolvedValue([{ id: "target-1", name: "Customer Database", isCrownJewel: true }]);
    mockDb.operation.create.mockResolvedValue(mockOperation);
    const res = await caller.create(createOperationData);
    expect(res).toEqual(mockOperation);
  });

  it("throws if threat actor missing", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.threatActor.findUnique.mockResolvedValue(null);
    await expect(caller.create(createOperationData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Threat actor not found" }),
    );
  });

  it("updates operation successfully", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue(mockOperation);
    mockDb.tag.findMany.mockResolvedValue([{ id: "tag-1", name: "Purple Team" }]);
    const updatedOperation = { ...mockOperation, name: "Updated Operation", status: "ACTIVE" as OperationStatus };
    mockDb.operation.update.mockResolvedValue(updatedOperation);
    const res = await caller.update({ id: 1, name: "Updated Operation", status: "ACTIVE", tagIds: ["tag-1"] });
    expect(res).toEqual(updatedOperation);
  });

  it("throws on update when operation not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue(null);
    await expect(caller.update({ id: 999, name: "Updated" })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to modify this operation" }),
    );
  });

  it("deletes as creator", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue(mockOperation);
    mockDb.operation.delete.mockResolvedValue(mockOperation);
    const res = await caller.delete({ id: 1 });
    expect(res).toEqual(mockOperation);
  });

  it("deletes as admin", async () => {
    const ctx = createTestContext(mockDb, "ADMIN");
    const caller = operationsRouter.createCaller(ctx);
    const otherUserOperation = { ...mockOperation, createdById: "other-user" };
    mockDb.operation.findUnique.mockResolvedValue(otherUserOperation);
    mockDb.operation.delete.mockResolvedValue(otherUserOperation);
    const res = await caller.delete({ id: 1 });
    expect(res).toEqual(otherUserOperation);
  });

  it("forbids delete for non-creator non-admin", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    const otherUserOperation = { ...mockOperation, createdById: "other-user" };
    mockDb.operation.findUnique.mockResolvedValue(otherUserOperation);
    await expect(caller.delete({ id: 1 })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this operation" }),
    );
  });

  it("throws delete when operation not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue(null);
    await expect(caller.delete({ id: 999 })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this operation" }),
    );
  });
});
