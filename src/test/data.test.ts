import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@prisma/client";

import { dataRouter } from "@/server/api/routers/data";

vi.mock("@/server/db", () => ({
  db: {
    operation: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    technique: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    outcome: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    techniqueTarget: { deleteMany: vi.fn() },
    threatActor: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    target: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    tag: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    tool: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    toolCategory: { findMany: vi.fn(), deleteMany: vi.fn() },
    logSource: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    attackFlowLayout: { findMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createMockContext = (role: UserRole) => ({
  headers: new Headers(),
  session: { user: { id: "test-user-id", role }, expires: "2099-01-01" },
  db: mockDb,
  requestId: "data-test",
});

const createCaller = (role: UserRole) => dataRouter.createCaller(createMockContext(role));

describe("Data Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStats", () => {
    it("returns overview counts for admins", async () => {
      const caller = createCaller(UserRole.ADMIN);

      mockDb.operation.count.mockResolvedValue(4);
      mockDb.technique.count.mockResolvedValue(9);
      mockDb.outcome.count.mockResolvedValue(5);
      mockDb.threatActor.count.mockResolvedValue(3);
      mockDb.target.count.mockResolvedValue(2);
      mockDb.tag.count.mockResolvedValue(6);
      mockDb.tool.count.mockResolvedValue(7);
      mockDb.logSource.count.mockResolvedValue(8);

      await expect(caller.getStats()).resolves.toEqual({
        operations: 4,
        techniques: 9,
        outcomes: 5,
        threatActors: 3,
        targets: 2,
        tags: 6,
        tools: 7,
        logSources: 8,
      });
    });

    it("rejects non-admin access", async () => {
      const caller = createCaller(UserRole.VIEWER);

      await expect(caller.getStats()).rejects.toThrow("Admin access required");
    });
  });

  describe("backup", () => {
    it("creates a backup payload for admins", async () => {
      const caller = createCaller(UserRole.ADMIN);

      mockDb.target.findMany.mockResolvedValue([]);
      mockDb.tag.findMany.mockResolvedValue([]);
      mockDb.toolCategory.findMany.mockResolvedValue([]);
      mockDb.tool.findMany.mockResolvedValue([]);
      mockDb.logSource.findMany.mockResolvedValue([]);
      mockDb.operation.findMany.mockResolvedValue([]);
      mockDb.technique.findMany.mockResolvedValue([]);
      mockDb.outcome.findMany.mockResolvedValue([]);
      mockDb.attackFlowLayout.findMany.mockResolvedValue([]);
      mockDb.threatActor.findMany.mockResolvedValue([]);

      const result = await caller.backup();

      expect(result).toContain('"version": "2.0"');
      expect(result).toContain('"data":');
    });

    it("rejects non-admin access", async () => {
      const caller = createCaller(UserRole.OPERATOR);

      await expect(caller.backup()).rejects.toThrow("Admin access required");
    });
  });

  describe("clearData", () => {
    beforeEach(() => {
      mockDb.$transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });
    });

    it("clears operations and taxonomy data together", async () => {
      const caller = createCaller(UserRole.ADMIN);

      await caller.clearData();

      expect(mockDb.outcome.deleteMany).toHaveBeenCalled();
      expect(mockDb.techniqueTarget.deleteMany).toHaveBeenCalled();
      expect(mockDb.technique.deleteMany).toHaveBeenCalled();
      expect(mockDb.attackFlowLayout.deleteMany).toHaveBeenCalled();
      expect(mockDb.operation.deleteMany).toHaveBeenCalled();
      expect(mockDb.tool.deleteMany).toHaveBeenCalled();
      expect(mockDb.toolCategory.deleteMany).toHaveBeenCalled();
      expect(mockDb.logSource.deleteMany).toHaveBeenCalled();
      expect(mockDb.tag.deleteMany).toHaveBeenCalled();
      expect(mockDb.target.deleteMany).toHaveBeenCalled();
      expect(mockDb.threatActor.deleteMany).toHaveBeenCalled();
    });

    it("rejects non-admin access", async () => {
      const caller = createCaller(UserRole.VIEWER);

      await expect(caller.clearData()).rejects.toThrow("Admin access required");
    });
  });
});
