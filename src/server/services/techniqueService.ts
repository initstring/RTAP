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

export interface TechniqueTargetAssignment {
  targetId: string;
  wasCompromised?: boolean;
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
  targets?: TechniqueTargetAssignment[];
}

export function normalizeTechniqueTargetAssignments(assignments?: TechniqueTargetAssignment[]): TechniqueTargetAssignment[] {
  if (!assignments || assignments.length === 0) return [];

  const unique = new Map<string, TechniqueTargetAssignment>();
  for (const assignment of assignments) {
    const trimmedId = assignment.targetId.trim();
    if (!trimmedId) continue;
    if (!unique.has(trimmedId)) {
      unique.set(trimmedId, { targetId: trimmedId, wasCompromised: assignment.wasCompromised ?? false });
    } else {
      // If duplicate provided, retain a true compromised flag when any assignment reports it
      const existing = unique.get(trimmedId)!;
      if (assignment.wasCompromised) {
        existing.wasCompromised = true;
      }
    }
  }
  return Array.from(unique.values());
}

export async function ensureTargetsAssignableToOperation(
  db: PrismaClient,
  operationId: number,
  assignments: TechniqueTargetAssignment[],
  existingOperationTargetIds?: string[],
) {
  if (assignments.length === 0) {
    return;
  }

  const allowedIds = new Set(existingOperationTargetIds ?? []);
  if (allowedIds.size === 0) {
    const operationTargets = await db.operation.findUnique({
      where: { id: operationId },
      select: { targets: { select: { id: true } } },
    });
    for (const target of operationTargets?.targets ?? []) {
      allowedIds.add(target.id);
    }
  }

  const disallowed = assignments.filter((assignment) => !allowedIds.has(assignment.targetId));
  if (disallowed.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Targets must be associated to the operation before assigning them to a technique",
    });
  }
}

export async function createTechniqueWithValidations(db: PrismaClient, input: TechniqueCreateInput) {
  // Verify operation exists
  const operation = await db.operation.findUnique({
    where: { id: input.operationId },
    include: { targets: { select: { id: true } } },
  });
  if (!operation) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Operation not found" });
  }

  const normalizedAssignments = normalizeTechniqueTargetAssignments(input.targets);
  await ensureTargetsAssignableToOperation(db, input.operationId, normalizedAssignments, operation.targets.map((t) => t.id));

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

  // Compute next sort order
  const nextSort = await getNextTechniqueSortOrder(db, input.operationId);

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
      targets: normalizedAssignments.length
        ? {
            create: normalizedAssignments.map(({ targetId, wasCompromised }) => ({
              targetId,
              wasCompromised: wasCompromised ?? false,
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
      targets: {
        include: {
          target: true,
        },
      },
    },
  });
}
