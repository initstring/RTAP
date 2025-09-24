import { describe, it, expect, vi, beforeEach } from "vitest";
import { operationsRouter } from "@/server/api/routers/operations";
import type { UserRole } from "@prisma/client";

// Mock db
vi.mock("@/server/db", () => ({
  db: {
    operation: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const ctx = (role: UserRole = "VIEWER") => ({
  headers: new Headers(),
  session: {
    user: { id: "u1", role, email: "", name: "" },
    expires: "2099-01-01",
  },
  db: mockDb,
  requestId: "operations-access-test",
});

describe("operations access filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list uses visibility/group ACL filter for non-admins", async () => {
    mockDb.operation.findMany.mockResolvedValue([]);
    const caller = operationsRouter.createCaller(ctx("VIEWER"));
    await caller.list({ limit: 10 });
    expect(mockDb.operation.findMany).toHaveBeenCalled();
    const arg = mockDb.operation.findMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      OR: [
        { visibility: "EVERYONE" },
        { AND: [ { visibility: "GROUPS_ONLY" }, { accessGroups: { some: { group: { members: { some: { userId: "u1" } } } } } } ] },
      ],
    });
  });

  it("getById denies access when user lacks group membership", async () => {
    // Make the operation GROUPS_ONLY with no membership
    mockDb.operation.findUnique.mockResolvedValue({
      id: "op1",
      createdById: "other",
      visibility: "GROUPS_ONLY",
      accessGroups: [ { group: { members: [] } } ],
      techniques: [],
      threatActor: null,
      targets: [],
      createdBy: { id: "other", name: "", email: "" },
    });
    const caller = operationsRouter.createCaller(ctx("VIEWER"));
    await expect(caller.getById({ id: "op1" })).rejects.toThrow();
  });
});
