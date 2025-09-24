import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { techniquesRouter } from "@/server/api/routers/techniques";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    technique: { create: vi.fn(), findFirst: vi.fn() },
    operation: { findUnique: vi.fn() },
    mitreTechnique: { findUnique: vi.fn() },
    mitreSubTechnique: { findUnique: vi.fn() },
    tool: { findMany: vi.fn() },
    target: { findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createTechniqueData = {
  operationId: 1,
  description: "Test phishing campaign",
  mitreTechniqueId: "T1566",
  mitreSubTechniqueId: "T1566.001",
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T11:00:00Z"),
  sourceIp: "192.168.1.100",
  targetSystem: "workstation-01",
  toolIds: ["tool-1"],
  targetEngagements: [{ targetId: "target-1", status: "succeeded" }],
};

function mockCreateTechniqueDependencies() {
  mockDb.mitreTechnique.findUnique.mockResolvedValue({ id: "T1566", name: "Phishing" });
  mockDb.mitreSubTechnique.findUnique.mockResolvedValue({ id: "T1566.001", name: "Sub", techniqueId: "T1566" });
  mockDb.tool.findMany.mockResolvedValue([{ id: "tool-1", name: "Cobalt Strike" }]);
  mockDb.target.findMany.mockResolvedValue([{ id: "target-1", name: "Target" }]);
  mockDb.technique.findFirst.mockResolvedValue(null);
  mockDb.technique.create.mockResolvedValue({ id: "technique-1" });
}

describe("Techniques Router — create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
  });

  it("should create technique successfully", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);

    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      name: "Test Operation",
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
    mockCreateTechniqueDependencies();

    const res = await caller.create(createTechniqueData);
    expect(res).toEqual({ id: "technique-1" });
  });

  it("should allow empty descriptions", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);

    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      name: "Test Operation",
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
    mockCreateTechniqueDependencies();

    const res = await caller.create({ ...createTechniqueData, description: "" });
    expect(res).toEqual({ id: "technique-1" });
  });

  it("should throw error if operation not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue(null);
    await expect(caller.create(createTechniqueData)).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to modify this operation" }),
    );
  });

  it("should throw error if MITRE technique not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, createdById: "user-1", visibility: "EVERYONE", accessGroups: [] });
    mockDb.mitreTechnique.findUnique.mockResolvedValue(null);
    await expect(caller.create(createTechniqueData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "MITRE technique not found" }),
    );
  });

  it("should throw error if MITRE sub-technique not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, createdById: "user-1", visibility: "EVERYONE", accessGroups: [] });
    mockDb.mitreTechnique.findUnique.mockResolvedValue({ id: "T1566" });
    mockDb.mitreSubTechnique.findUnique.mockResolvedValue(null);
    await expect(caller.create(createTechniqueData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "MITRE sub-technique not found" }),
    );
  });
});
