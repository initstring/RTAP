import { describe, it, expect, vi, beforeEach } from "vitest";
import { operationsRouter } from "@/server/api/routers/operations";
import { createTestContext } from "@/test/utils/context";
import type { OperationStatus } from "@prisma/client";

vi.mock("@/server/db", () => ({
  db: {
    operation: { findMany: vi.fn(), findUnique: vi.fn() },
    userGroup: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);
const mockOp = {
  id: 1,
  name: "Test Operation",
  status: "PLANNING" as OperationStatus,
  visibility: "EVERYONE",
  accessGroups: [],
};

describe("Operations Router — read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.userGroup.findMany.mockResolvedValue([]);
    mockDb.tag.findMany.mockImplementation((args: any) => (args?.where?.group === null ? [] : []));
  });

  it("lists operations", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.operation.findMany.mockResolvedValue([{ ...mockOp, techniques: [] }]);
    const result = await caller.list({});
    expect(result.operations[0].id).toBe(1);
  });

  it("gets by id", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = operationsRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue({ ...mockOp, tags: [], targets: [], techniques: [] });
    const result = await caller.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Test Operation");
  });
});
