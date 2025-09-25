import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@prisma/client";

import { dataRouter } from "@/server/api/routers/data";

vi.mock("@/server/db", () => ({
  db: {
    $transaction: vi.fn(),
    threatActor: { createMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    target: { createMany: vi.fn(), deleteMany: vi.fn() },
    tag: { createMany: vi.fn(), deleteMany: vi.fn() },
    toolCategory: { createMany: vi.fn(), deleteMany: vi.fn() },
    tool: { createMany: vi.fn(), deleteMany: vi.fn() },
    logSource: { createMany: vi.fn(), deleteMany: vi.fn() },
    operation: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    technique: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    outcome: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    attackFlowLayout: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createCaller = (role: UserRole) =>
  dataRouter.createCaller({
    headers: new Headers(),
    session: { user: { id: "u1", role }, expires: "2099-01-01" },
    db: mockDb,
    requestId: "data-restore-test",
  });

describe("Data Restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (callback) => {
      return await callback(mockDb);
    });
  });

  it("restores taxonomy and operations with clearing", async () => {
    const caller = createCaller(UserRole.ADMIN);

    mockDb.threatActor.update.mockResolvedValue({});

    const payload = {
      threatActors: [{ id: "ta1", name: "APT29", description: "desc" }],
      targets: [{ id: "target1", name: "DB", description: "desc", isCrownJewel: true }],
      tags: [{ id: "tag1", name: "Stealth", description: "d" }],
      toolCategories: [{ id: "cat1", name: "EDR", type: "DEFENSIVE" as const }],
      tools: [{ id: "tool1", name: "Falcon", categoryId: "cat1", type: "DEFENSIVE" as const }],
      logSources: [{ id: "log1", name: "SIEM", description: "d" }],
      operations: [
        { id: 1, name: "Op1", description: "d", createdById: "u1", tags: [{ id: "tag1" }], targets: [{ id: "target1" }] },
      ],
      techniques: [
        {
          id: "tech-inst",
          description: "d",
          operationId: 1,
          tools: [{ id: "tool1" }],
          targets: [{ targetId: "target1", wasCompromised: true }],
        },
      ],
      outcomes: [
        {
          id: "out1",
          type: "DETECTION" as const,
          status: "DETECTED" as const,
          techniqueId: "tech-inst",
          tools: [{ id: "tool1" }],
          logSources: [{ id: "log1" }],
        },
      ],
      attackFlowLayouts: [{ id: "layout1", operationId: 1, nodes: [], edges: [] }],
      threatActorTechniqueLinks: [{ threatActorId: "ta1", mitreTechniqueId: "tech-1" }],
    };

    const backup = JSON.stringify({ version: "2.0", timestamp: new Date().toISOString(), data: payload });

    await caller.restore({ backupData: backup });

    expect(mockDb.operation.deleteMany).toHaveBeenCalled();
    expect(mockDb.tool.deleteMany).toHaveBeenCalled();
    expect(mockDb.target.deleteMany).toHaveBeenCalled();
    expect(mockDb.threatActor.createMany).toHaveBeenCalledWith({ data: payload.threatActors });
    expect(mockDb.target.createMany).toHaveBeenCalledWith({
      data: payload.targets?.map((target) => ({ ...target, isCrownJewel: target.isCrownJewel ?? false })),
    });
    expect(mockDb.operation.create).toHaveBeenCalled();
    expect(mockDb.technique.create).toHaveBeenCalled();
    expect(mockDb.outcome.create).toHaveBeenCalled();
    expect(mockDb.attackFlowLayout.create).toHaveBeenCalled();
    expect(mockDb.threatActor.update).toHaveBeenCalledWith({
      where: { id: "ta1" },
      data: { mitreTechniques: { connect: { id: "tech-1" } } },
    });
  });

  it("rejects invalid backup data", async () => {
    const caller = createCaller(UserRole.ADMIN);

    await expect(caller.restore({ backupData: "not-json" })).rejects.toThrow("Invalid backup file");
  });

  it("rejects non-admin access", async () => {
    const caller = createCaller(UserRole.OPERATOR);

    await expect(caller.restore({ backupData: "{}" })).rejects.toThrow("Admin access required");
  });
});
