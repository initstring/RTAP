import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export async function getNextTechniqueSortOrder(db: PrismaClient, operationId: number): Promise<number> {
  const last = await db.technique.findFirst({
    where: { operationId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

export interface TechniqueCreateInput {
  operationId: number;
  description: string;
  mitreTechniqueId?: string;
  mitreSubTechniqueId?: string;
  startTime?: Date | null;
  endTime?: Date | null;
  sourceIp?: string;
  targetSystem?: string;
  executedSuccessfully?: boolean | null;
  toolIds?: string[];
  targetEngagements?: Array<{
    targetId: string;
    status: "succeeded" | "failed" | "unknown";
  }>;
}

export async function createTechniqueWithValidations(db: PrismaClient, input: TechniqueCreateInput) {
  // Verify operation exists
  const operation = await db.operation.findUnique({ where: { id: input.operationId } });
  if (!operation) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Operation not found" });
  }

  // Validate times
  if (input.startTime && input.endTime && input.endTime < input.startTime) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "End time cannot be before start time" });
  }

  // Verify MITRE technique exists if provided
  if (input.mitreTechniqueId) {
    const mitreTechnique = await db.mitreTechnique.findUnique({ where: { id: input.mitreTechniqueId } });
    if (!mitreTechnique) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "MITRE technique not found" });
    }
  }

  // Verify MITRE sub-technique exists and belongs if provided
  if (input.mitreSubTechniqueId) {
    const mitreSubTechnique = await db.mitreSubTechnique.findUnique({ where: { id: input.mitreSubTechniqueId } });
    if (!mitreSubTechnique) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "MITRE sub-technique not found" });
    }
    if (input.mitreTechniqueId && mitreSubTechnique.techniqueId !== input.mitreTechniqueId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Sub-technique does not belong to the specified technique" });
    }
  }

  // Verify tools exist if provided
  if (input.toolIds && input.toolIds.length > 0) {
    const existingTools = await db.tool.findMany({ where: { id: { in: input.toolIds } } });
    if (existingTools.length !== input.toolIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tools not found" });
    }
  }

  if (input.targetEngagements && input.targetEngagements.length > 0) {
    const targetIds = input.targetEngagements.map((engagement) => engagement.targetId);
    if (new Set(targetIds).size !== targetIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Duplicate targets are not allowed" });
    }
    const existingTargets = await db.target.findMany({ where: { id: { in: targetIds } }, select: { id: true } });
    if (existingTargets.length !== targetIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more targets not found" });
    }
  }

  // Compute next sort order
  const nextSort = await getNextTechniqueSortOrder(db, input.operationId);

  const formatStatus = (status: "succeeded" | "failed" | "unknown") => {
    if (status === "unknown") return null;
    return status === "succeeded";
  };

  return db.technique.create({
    data: {
      operationId: input.operationId,
      description: input.description,
      sortOrder: nextSort,
      startTime: input.startTime ?? undefined,
      endTime: input.endTime ?? undefined,
      sourceIp: input.sourceIp,
      targetSystem: input.targetSystem,
      executedSuccessfully: input.executedSuccessfully ?? undefined,
      mitreTechniqueId: input.mitreTechniqueId,
      mitreSubTechniqueId: input.mitreSubTechniqueId,
      tools: input.toolIds ? { connect: input.toolIds.map((id) => ({ id })) } : undefined,
      targetEngagements: input.targetEngagements?.length
        ? {
            create: input.targetEngagements.map((engagement) => ({
              target: { connect: { id: engagement.targetId } },
              wasSuccessful: formatStatus(engagement.status),
            })),
          }
        : undefined,
    },
    include: {
      operation: { select: { id: true, name: true } },
      mitreTechnique: true,
      mitreSubTechnique: true,
      tools: true,
      outcomes: {
        include: {
          tools: true,
          logSources: true,
        },
      },
      targetEngagements: {
        include: {
          target: true,
        },
      },
    },
  });
}
