import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { taxonomyRouter } from "@/server/api/routers/taxonomy";

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    threatActor: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    target: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tool: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    logSource: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    operation: {
      count: vi.fn(),
    },
    technique: {
      count: vi.fn(),
    },
    techniqueTarget: {
      count: vi.fn(),
    },
    outcome: {
      count: vi.fn(),
    },
    mitreTactic: {
      findMany: vi.fn(),
    },
    mitreTechnique: {
      findMany: vi.fn(),
    },
    mitreSubTechnique: {
      findMany: vi.fn(),
    },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

// Helper to create mock context
const createMockContext = (userRole: UserRole = UserRole.ADMIN, userId = "test-user-id") => ({
  session: {
    user: { id: userId, role: userRole },
    expires: new Date().toISOString(),
  },
  db: mockDb,
  headers: new Headers(),
  requestId: "taxonomy-test",
});

describe("Taxonomy Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Threat Actors", () => {
    describe("list", () => {
      it("should return all threat actors for authenticated users", async () => {
        const mockThreatActors = [
          { 
            id: "1", 
            name: "APT29", 
            description: "Russian APT", 
            topThreat: true,
            mitreTechniques: [],
            _count: { mitreTechniques: 0 }
          },
          { 
            id: "2", 
            name: "Lazarus", 
            description: "North Korean APT", 
            topThreat: true,
            mitreTechniques: [],
            _count: { mitreTechniques: 0 }
          },
        ];

        mockDb.threatActor.findMany.mockResolvedValue(mockThreatActors);

        const ctx = createMockContext(UserRole.VIEWER);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.threatActors.list();

        expect(result).toEqual(mockThreatActors);
        expect(mockDb.threatActor.findMany).toHaveBeenCalledWith({
          include: {
            mitreTechniques: {
              include: {
                tactic: true,
              },
            },
            _count: {
              select: {
                mitreTechniques: true,
              },
            },
          },
          orderBy: [{ topThreat: "desc" }, { name: "asc" }],
        });
      });
    });

    describe("create", () => {
      it("should create threat actor for admin users", async () => {
        const newThreatActor = {
          name: "APT1",
          description: "Chinese APT",
          topThreat: false,
        };

        const mockCreatedThreatActor = {
          id: "3",
          ...newThreatActor,
          mitreTechniques: [],
        };

        mockDb.threatActor.create.mockResolvedValue(mockCreatedThreatActor);

        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.threatActors.create(newThreatActor);

        expect(result).toEqual(mockCreatedThreatActor);
        expect(mockDb.threatActor.create).toHaveBeenCalledWith({
          data: {
            ...newThreatActor,
            mitreTechniques: {
              connect: [],
            },
          },
          include: {
            mitreTechniques: {
              include: {
                tactic: true,
              },
            },
          },
        });
      });

      it("should throw FORBIDDEN error for non-admin users", async () => {
        const ctx = createMockContext(UserRole.OPERATOR);
        const caller = taxonomyRouter.createCaller(ctx);

        await expect(
          caller.threatActors.create({
            name: "APT1",
            description: "Chinese APT",
            topThreat: false,
          })
        ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }));
      });
    });

    describe("delete", () => {
      it("should delete threat actor when not used in operations", async () => {
        const threatActorId = "threat-actor-1";
        const mockThreatActor = { id: threatActorId, name: "APT1", description: "Test" };

        mockDb.operation.count.mockResolvedValue(0); // No operations using this threat actor
        mockDb.threatActor.delete.mockResolvedValue(mockThreatActor);

        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.threatActors.delete({ id: threatActorId });

        expect(result).toEqual(mockThreatActor);
        expect(mockDb.operation.count).toHaveBeenCalledWith({
          where: { threatActorId },
        });
        expect(mockDb.threatActor.delete).toHaveBeenCalledWith({
          where: { id: threatActorId },
        });
      });

      it("should throw BAD_REQUEST error when threat actor is used in operations", async () => {
        const threatActorId = "threat-actor-1";

        mockDb.operation.count.mockResolvedValue(2); // 2 operations using this threat actor

        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        await expect(caller.threatActors.delete({ id: threatActorId })).rejects.toThrow(
          new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete threat actor: 2 operation(s) are using this threat actor",
          })
        );

        expect(mockDb.threatActor.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe("Targets", () => {
    describe("create", () => {
      it("should create target with default non-crown jewel flag", async () => {
        const newTarget = {
          name: "Customer Database",
          description: "Primary customer data store",
        };

        const mockCreatedTarget = { id: "target-1", ...newTarget, isCrownJewel: false };
        mockDb.target.create.mockResolvedValue(mockCreatedTarget);

        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.targets.create(newTarget);

        expect(result).toEqual(mockCreatedTarget);
        expect(mockDb.target.create).toHaveBeenCalledWith({
          data: { ...newTarget, isCrownJewel: false },
        });
      });
    });
  });

  describe("Tags", () => {
    describe("create", () => {
      it("should create tag with valid hex color", async () => {
        const newTag = {
          name: "High Priority",
          description: "High priority operations",
          color: "#FF0000",
        };

        const mockCreatedTag = { id: "tag-1", ...newTag };
        mockDb.tag.create.mockResolvedValue(mockCreatedTag);

        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.tags.create(newTag);

        expect(result).toEqual(mockCreatedTag);
        expect(mockDb.tag.create).toHaveBeenCalledWith({ data: newTag });
      });

      it("should reject tag with invalid hex color", async () => {
        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        await expect(
          caller.tags.create({
            name: "Test",
            description: "Test",
            color: "invalid-color",
          })
        ).rejects.toThrow();
      });
    });
  });

  describe("Tools", () => {
    describe("listByType", () => {
      it("should return tools filtered by type", async () => {
        const mockDefensiveTools = [
          { id: "1", name: "Splunk", category: "SIEM", type: "DEFENSIVE" },
          { id: "2", name: "CrowdStrike", category: "EDR", type: "DEFENSIVE" },
        ];

        mockDb.tool.findMany.mockResolvedValue(mockDefensiveTools);

        const ctx = createMockContext(UserRole.VIEWER);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.tools.listByType({ type: "DEFENSIVE" });

        expect(result).toEqual(mockDefensiveTools);
        expect(mockDb.tool.findMany).toHaveBeenCalledWith({
          where: { type: "DEFENSIVE" },
          include: { category: true },
          orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
        });
      });
    });

    describe("delete", () => {
      it("should prevent deletion when tool is used in techniques or outcomes", async () => {
        const toolId = "tool-1";

        mockDb.technique.count.mockResolvedValue(3);
        mockDb.outcome.count.mockResolvedValue(2);

        const ctx = createMockContext(UserRole.ADMIN);
        const caller = taxonomyRouter.createCaller(ctx);

        await expect(caller.tools.delete({ id: toolId })).rejects.toThrow(
          new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete tool: 3 technique(s) and 2 outcome(s) are using this tool",
          })
        );

        expect(mockDb.tool.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe("MITRE ATT&CK Data", () => {
    describe("tactics", () => {
      it("should return all MITRE tactics", async () => {
        const mockTactics = [
          { id: "TA0001", name: "Initial Access", description: "Initial Access tactic" },
          { id: "TA0002", name: "Execution", description: "Execution tactic" },
        ];

        mockDb.mitreTactic.findMany.mockResolvedValue(mockTactics);

        const ctx = createMockContext(UserRole.VIEWER);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.mitre.tactics();

        expect(result).toEqual(mockTactics);
        expect(mockDb.mitreTactic.findMany).toHaveBeenCalled();
     });
    });

    describe("techniques", () => {
      it("should return techniques with tactic and sub-techniques", async () => {
        const mockTechniques = [
          {
            id: "T1566",
            name: "Phishing",
            description: "Phishing technique",
            tacticId: "TA0001",
            tactic: { id: "TA0001", name: "Initial Access" },
            subTechniques: [
              { id: "T1566.001", name: "Spearphishing Attachment" },
            ],
          },
        ];

        mockDb.mitreTechnique.findMany.mockResolvedValue(mockTechniques);

        const ctx = createMockContext(UserRole.VIEWER);
        const caller = taxonomyRouter.createCaller(ctx);

        const result = await caller.mitre.techniques({ tacticId: "TA0001" });

        expect(result).toEqual(mockTechniques);
        expect(mockDb.mitreTechnique.findMany).toHaveBeenCalledWith({
          where: { tacticId: "TA0001" },
          include: {
            tactic: true,
            subTechniques: true,
          },
          orderBy: { name: "asc" },
        });
      });
    });
  });

  describe("Role-based Access Control", () => {
    it("should allow all authenticated users to read taxonomy data", async () => {
      mockDb.threatActor.findMany.mockResolvedValue([]);

      const roles = [UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER];

      for (const role of roles) {
        const ctx = createMockContext(role);
        const caller = taxonomyRouter.createCaller(ctx);

        await expect(caller.threatActors.list()).resolves.not.toThrow();
      }
    });

    it("should only allow admins to create, update, and delete taxonomy data", async () => {
      const nonAdminRoles = [UserRole.OPERATOR, UserRole.VIEWER];

      for (const role of nonAdminRoles) {
        const ctx = createMockContext(role);
        const caller = taxonomyRouter.createCaller(ctx);

        // Test create operations
        await expect(
          caller.threatActors.create({ name: "Test", description: "Test", topThreat: false })
        ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }));

        await expect(
          caller.targets.create({ name: "Test", description: "Test" })
        ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }));

        await expect(
          caller.tags.create({ name: "Test", description: "Test", color: "#FF0000" })
        ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }));

        // Test delete operations
        await expect(caller.threatActors.delete({ id: "test" })).rejects.toThrow(
          new TRPCError({ code: "FORBIDDEN", message: "Admin access required" })
        );
      }
    });
  });
});
