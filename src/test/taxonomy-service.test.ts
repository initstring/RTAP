import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { deleteTag, createTool, deleteTarget } from "@/server/services/taxonomyService";
import type { ToolType, PrismaClient } from "@prisma/client";

const mockDb = {
  operation: { count: vi.fn() },
  toolCategory: { findFirst: vi.fn() },
  tool: { create: vi.fn() },
  outcome: { count: vi.fn() },
  target: { delete: vi.fn() },
};

describe("taxonomyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents deleting tag in use", async () => {
    mockDb.operation.count.mockResolvedValue(2);
    await expect(deleteTag(mockDb as unknown as PrismaClient, "t1")).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete tag: 2 operation(s) are using this tag" })
    );
  });

  it("validates tool category type", async () => {
    mockDb.toolCategory.findFirst.mockResolvedValue(null);
    await expect(
      createTool(mockDb as unknown as PrismaClient, { name: "Tool", categoryId: "cat", type: "DEFENSE" as ToolType })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "Invalid category for tool type" }));
  });

  it("blocks target deletion when in use", async () => {
    mockDb.operation.count.mockResolvedValue(1);
    await expect(deleteTarget(mockDb as unknown as PrismaClient, "target1")).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete target: 1 operation(s) are using this target" })
    );
  });
});
