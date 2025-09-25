import { describe, it, expect, vi, beforeEach } from "vitest";
import { importRouter } from "@/server/api/routers/import";

// Mock db similar to techniques tests
vi.mock("@/server/db", () => ({
  db: {
    threatActor: { findFirst: vi.fn(), create: vi.fn() },
    mitreTechnique: { findMany: vi.fn(), findUnique: vi.fn() },
    mitreSubTechnique: { findMany: vi.fn(), findUnique: vi.fn() },
    operation: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    technique: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

// Mock STIX extraction to avoid loading large bundle
vi.mock("@/server/import/stix", () => ({
  loadLocalEnterpriseBundle: vi.fn(() => ({})),
  extractActorCandidates: vi.fn(() => ([
    { key: "actor-1", name: "APT X", description: "desc", techniqueIds: ["T1000", "T1001.001", "T9999"] },
  ])),
  extractOperationCandidates: vi.fn(() => ([
    { key: "camp-1", name: "Op One", description: "op desc", techniques: [
      { techniqueId: "T1000", description: "a" },
      { techniqueId: "T1001.001", description: "b" },
      { techniqueId: "T4040.123", description: "missing" },
    ] },
  ])),
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const ctxBase = {
  headers: new Headers(),
  session: {
    user: { id: "user-1", role: "ADMIN", email: "a@b.c", name: "Admin" },
    expires: "2030-01-01",
  },
  db: mockDb,
  requestId: "import-test",
};

describe("Import Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports threat actors with existing techniques only", async () => {
    const caller = importRouter.createCaller(ctxBase as never);
    mockDb.threatActor.findFirst.mockResolvedValue(null);
    mockDb.mitreTechnique.findMany.mockResolvedValue([{ id: "T1000" }, { id: "T1001" }]);

    mockDb.threatActor.create.mockResolvedValue({ id: "ta-1" });

    const res = await caller.run.actors({ kind: "actor", source: "local", ids: ["actor-1"] });
    expect(res.created).toBe(1);
    expect(res.skipped).toBe(0);
    expect(mockDb.threatActor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "APT X",
          mitreTechniques: { connect: [{ id: "T1000" }, { id: "T1001" }] },
        }),
      }),
    );
  });

  it("imports operations and appends techniques with sort order", async () => {
    const caller = importRouter.createCaller(ctxBase as never);
    mockDb.operation.findFirst.mockResolvedValue(null);
    mockDb.operation.create.mockResolvedValue({ id: 1, name: "Op One" });
    // Service validates existence
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, visibility: "EVERYONE", accessGroups: [], targets: [] });
    mockDb.mitreTechnique.findUnique = vi.fn(async ({ where: { id } }: any) => (id === "T4040" ? null : { id }));
    mockDb.mitreSubTechnique.findUnique = vi.fn(async ({ where: { id } }: any) => (id === "T1001.001" ? { id, techniqueId: "T1001" } : null));
    mockDb.technique.findFirst
      .mockResolvedValueOnce(null) // first create -> sort 0
      .mockResolvedValueOnce({ sortOrder: 0 }); // second create -> sort 1
    mockDb.technique.create.mockResolvedValue({ id: "tech-1" });

    const res = await caller.run.operations({ kind: "operation", source: "local", ids: ["camp-1"] });
    expect(res.created).toBe(1);
    expect(res.skipped).toBe(0);
    // Should create at least two techniques (T1000 base and T1001.001 sub-tech)
    expect(mockDb.technique.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operationId: 1, mitreTechniqueId: "T1000", sortOrder: 0 }),
      }),
    );
    expect(mockDb.technique.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operationId: 1, mitreTechniqueId: "T1001", mitreSubTechniqueId: "T1001.001", sortOrder: 1 }),
      }),
    );
  });
});
