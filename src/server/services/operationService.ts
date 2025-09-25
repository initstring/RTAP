import type { Prisma, PrismaClient, UserRole, OperationStatus, OperationVisibility } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface OperationCreateInput {
  name: string;
  description: string;
  threatActorId?: string;
  tagIds?: string[];
  targetIds?: string[];
  startDate?: Date;
  endDate?: Date;
  visibility?: OperationVisibility;
  accessGroupIds?: string[]; // applicable when visibility = GROUPS_ONLY
}

export async function createOperationWithValidations(params: {
  db: PrismaClient;
  user: { id: string; role: UserRole };
  input: OperationCreateInput;
}) {
  const { db, user, input } = params;
  const { tagIds, targetIds, accessGroupIds, visibility, ...operationData } = input;

  // Verify threat actor exists if provided
  if (input.threatActorId) {
    const threatActor = await db.threatActor.findUnique({ where: { id: input.threatActorId } });
    if (!threatActor) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Threat actor not found" });
    }
  }

  // Verify tags exist (tags are metadata only; no access coupling)
  if (tagIds && tagIds.length > 0) {
    const existingTags = await db.tag.findMany({
      where: { id: { in: tagIds } },
    });
    if (existingTags.length !== tagIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" });
    }
  }

  // Verify targets exist if provided
  if (targetIds && targetIds.length > 0) {
    const existingTargets = await db.target.findMany({ where: { id: { in: targetIds } } });
    if (existingTargets.length !== targetIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more targets not found" });
    }
  }

  // Validate access group IDs if provided
  let accessGroupsCreate: { groupId: string }[] | undefined = undefined;
  const effectiveVisibility: OperationVisibility = visibility ?? "EVERYONE";
  if (effectiveVisibility === "GROUPS_ONLY") {
    if (!accessGroupIds || accessGroupIds.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "At least one group must be provided when visibility is GROUPS_ONLY" });
    }
    const groups = await db.group.findMany({ where: { id: { in: accessGroupIds } } });
    if (groups.length !== accessGroupIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more groups not found" });
    }

    if (user.role !== "ADMIN") {
      const membershipCount = await db.userGroup.count({
        where: {
          userId: user.id,
          groupId: { in: accessGroupIds },
        },
      });
      if (membershipCount === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to at least one selected group to restrict visibility",
        });
      }
    }
    accessGroupsCreate = accessGroupIds.map((groupId) => ({ groupId }));
  }

  return db.operation.create({
    data: {
      ...operationData,
      createdById: user.id,
      visibility: effectiveVisibility,
      accessGroups: accessGroupsCreate ? { create: accessGroupsCreate } : undefined,
      tags: tagIds ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      targets: targetIds ? { connect: targetIds.map((id) => ({ id })) } : undefined,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      threatActor: true,
      tags: true,
      targets: true,
      accessGroups: { include: { group: true } },
      techniques: {
        include: {
          mitreTechnique: true,
          mitreSubTechnique: true,
          outcomes: true,
        },
      },
    },
  });
}

export interface OperationUpdateDTO {
  id: number;
  name?: string;
  description?: string;
  status?: OperationStatus;
  threatActorId?: string;
  tagIds?: string[];
  targetIds?: string[];
  startDate?: Date;
  endDate?: Date;
  visibility?: OperationVisibility;
  accessGroupIds?: string[]; // when provided, replaces the set
}

export async function updateOperationWithValidations(params: {
  db: PrismaClient;
  user: { id: string; role: UserRole };
  input: OperationUpdateDTO;
}) {
  const { db, user, input } = params;
  const { id, tagIds, targetIds, accessGroupIds, visibility, ...updateData } = input;

  const existingOperation = await db.operation.findUnique({
    where: { id },
    include: { accessGroups: true },
  });
  if (!existingOperation) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Operation not found" });
  }

  if (input.threatActorId) {
    const threatActor = await db.threatActor.findUnique({ where: { id: input.threatActorId } });
    if (!threatActor) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Threat actor not found" });
    }
  }

  if (tagIds && tagIds.length > 0) {
    const existingTags = await db.tag.findMany({
      where: { id: { in: tagIds } },
    });
    if (existingTags.length !== tagIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" });
    }
  }

  if (targetIds && targetIds.length > 0) {
    const existingTargets = await db.target.findMany({ where: { id: { in: targetIds } } });
    if (existingTargets.length !== targetIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more targets not found" });
    }
  }

  const updatePayload: Prisma.OperationUpdateInput = {};
  if (updateData.name !== undefined) updatePayload.name = updateData.name;
  if (updateData.description !== undefined) updatePayload.description = updateData.description;
  if (updateData.status !== undefined) updatePayload.status = updateData.status;
  if (updateData.threatActorId !== undefined) updatePayload.threatActor = { connect: { id: updateData.threatActorId } };
  if (updateData.startDate !== undefined) updatePayload.startDate = updateData.startDate;
  if (updateData.endDate !== undefined) updatePayload.endDate = updateData.endDate;
  if (tagIds !== undefined) updatePayload.tags = { set: tagIds.map((id) => ({ id })) };
  if (targetIds !== undefined) updatePayload.targets = { set: targetIds.map((id) => ({ id })) };
  const nextVisibility = visibility ?? existingOperation.visibility;
  let resultingGroupIds: string[] = existingOperation.accessGroups.map((ag) => ag.groupId);

  if (accessGroupIds !== undefined) {
    resultingGroupIds = accessGroupIds;

    if (accessGroupIds.length > 0) {
      const groups = await db.group.findMany({ where: { id: { in: accessGroupIds } } });
      if (groups.length !== accessGroupIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more groups not found" });
      }
    }

    updatePayload.accessGroups = {
      deleteMany: {},
      create: accessGroupIds.map((groupId) => ({ groupId })),
    };
  }

  if (nextVisibility === "GROUPS_ONLY" && resultingGroupIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one group must be provided when visibility is GROUPS_ONLY",
    });
  }

  if (nextVisibility === "GROUPS_ONLY" && user.role !== "ADMIN") {
    const membershipCount = await db.userGroup.count({
      where: {
        userId: user.id,
        groupId: { in: resultingGroupIds },
      },
    });
    if (membershipCount === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must belong to at least one selected group to restrict visibility",
      });
    }
  }

  if (visibility !== undefined) updatePayload.visibility = visibility;

  return db.operation.update({
    where: { id },
    data: updatePayload,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      threatActor: true,
      tags: true,
      targets: true,
      accessGroups: { include: { group: true } },
      techniques: { include: { mitreTechnique: true, mitreSubTechnique: true, outcomes: true } },
    },
  });
}
