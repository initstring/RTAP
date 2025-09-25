import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createTechniqueWithValidations,
  getNextTechniqueSortOrder,
} from "@/server/services/techniqueService";
import type { PrismaClient } from "@prisma/client";

const techniqueFindFirst = vi.fn();
const operationFindUnique = vi.fn();
const mitreTechniqueFindUnique = vi.fn();
const mitreSubTechniqueFindUnique = vi.fn();
const toolFindMany = vi.fn();
const techniqueCreate = vi.fn();

const mockDb = {
  technique: { findFirst: techniqueFindFirst, create: techniqueCreate },
  operation: { findUnique: operationFindUnique },
  mitreTechnique: { findUnique: mitreTechniqueFindUnique },
  mitreSubTechnique: { findUnique: mitreSubTechniqueFindUnique },
  tool: { findMany: toolFindMany },
} as unknown as PrismaClient;

describe("getNextTechniqueSortOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when no techniques exist", async () => {
    techniqueFindFirst.mockResolvedValue(null);
    await expect(getNextTechniqueSortOrder(mockDb, 1)).resolves.toBe(0);
  });

  it("increments based on last sort order", async () => {
    techniqueFindFirst.mockResolvedValue({ sortOrder: 5 });
    await expect(getNextTechniqueSortOrder(mockDb, 2)).resolves.toBe(6);
  });
});

describe("createTechniqueWithValidations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when operation missing", async () => {
    operationFindUnique.mockResolvedValue(null);
    await expect(
      createTechniqueWithValidations(mockDb, {
        operationId: 1,
        description: "desc",
      })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Operation not found" })
    );
  });

  it("throws when end time before start", async () => {
    operationFindUnique.mockResolvedValue({ id: 1, targets: [] });
    await expect(
      createTechniqueWithValidations(mockDb, {
        operationId: 1,
        description: "desc",
        startTime: new Date("2023-01-02"),
        endTime: new Date("2023-01-01"),
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "End time cannot be before start time",
      })
    );
  });

  it("creates technique with next sort order", async () => {
    operationFindUnique.mockResolvedValue({ id: 1, targets: [] });
    techniqueFindFirst.mockResolvedValue(null);
    toolFindMany.mockResolvedValue([{ id: "tool-1" }]);
    const result = { id: "tech-1" } as any;
    techniqueCreate.mockResolvedValue(result);

    const res = await createTechniqueWithValidations(mockDb, {
      operationId: 1,
      description: "desc",
      toolIds: ["tool-1"],
    });

    expect(techniqueCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operationId: 1,
          sortOrder: 0,
          description: "desc",
        }),
      })
    );
    expect(res).toBe(result);
  });
});
