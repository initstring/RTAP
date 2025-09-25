import { z } from "zod";
import { createTRPCRouter, protectedProcedure, viewerProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { checkOperationAccess, getAccessibleOperationFilter } from "@/server/api/access";
import {
  createTechniqueWithValidations,
  ensureTargetsAssignableToOperation,
  normalizeTechniqueTargetAssignments,
} from "@/server/services/techniqueService";
import { auditEvent, logger } from "@/server/logger";
import type { Prisma } from "@prisma/client";

// Input validation schemas
const targetAssignmentSchema = z.object({
  targetId: z.string(),
  wasCompromised: z.boolean().optional(),
});

const createTechniqueSchema = z.object({
  operationId: z.number(),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? ""),
  mitreTechniqueId: z.string().optional(),
  mitreSubTechniqueId: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  sourceIp: z.string().optional(),
  targetSystem: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  executedSuccessfully: z.boolean().optional(),
  targets: z.array(targetAssignmentSchema).optional(),
});

const updateTechniqueSchema = z.object({
  id: z.string(),
  description: z.string().trim().optional(),
  mitreTechniqueId: z.string().optional(),
  mitreSubTechniqueId: z.string().nullable().optional(),
  // Allow nulls to explicitly clear times during update
  startTime: z.date().nullable().optional(),
  endTime: z.date().nullable().optional(),
  sourceIp: z.string().optional(),
  targetSystem: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  executedSuccessfully: z.boolean().nullable().optional(),
  targets: z.array(targetAssignmentSchema).optional(),
});

const getTechniqueSchema = z.object({
  id: z.string(),
});

const listTechniquesSchema = z.object({
  operationId: z.number().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// Access filter centralized in @/server/api/access

export const techniquesRouter = createTRPCRouter({
  // Create a new technique within an operation
  create: protectedProcedure
    .input(createTechniqueSchema)
    .mutation(async ({ ctx, input }) => {
      const hasAccess = await checkOperationAccess(ctx, input.operationId, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }

      const { toolIds, targets, ...rest } = input;
      const created = await createTechniqueWithValidations(ctx.db, { ...rest, toolIds, targets });
      logger.info(
        auditEvent(ctx, "sec.technique.create", {
          techniqueId: created.id,
          techniqueDescription: created.description,
          operationId: created.operationId,
          operationName: created.operation?.name,
        }),
        "Technique created",
      );
      return created;
    }),


  // Update technique
  update: protectedProcedure
    .input(updateTechniqueSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, toolIds, targets, ...updateData } = input;

      // Check if technique exists
      const existingTechnique = await ctx.db.technique.findUnique({
        where: { id },
        include: { operation: { include: { targets: { select: { id: true } } } } },
      });

      if (!existingTechnique) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Technique not found",
        });
      }

      const hasAccess = await checkOperationAccess(ctx, existingTechnique.operationId, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }

      // Verify MITRE technique exists if provided
      if (input.mitreTechniqueId) {
        const mitreTechnique = await ctx.db.mitreTechnique.findUnique({
          where: { id: input.mitreTechniqueId },
        });
        if (!mitreTechnique) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "MITRE technique not found",
          });
        }
      }

      // Verify MITRE sub-technique exists if provided
      if (input.mitreSubTechniqueId) {
        const mitreSubTechnique = await ctx.db.mitreSubTechnique.findUnique({
          where: { id: input.mitreSubTechniqueId },
        });
        if (!mitreSubTechnique) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "MITRE sub-technique not found",
          });
        }

        // Verify sub-technique belongs to the specified technique
        if (
          input.mitreTechniqueId &&
          mitreSubTechnique.techniqueId !== input.mitreTechniqueId
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Sub-technique does not belong to the specified technique",
          });
        }
      }

      // Verify tools exist if provided
      if (toolIds && toolIds.length > 0) {
        const existingTools = await ctx.db.tool.findMany({
          where: { id: { in: toolIds } },
        });
        if (existingTools.length !== toolIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more tools not found",
          });
        }
      }

      // Validate end time is not before start time
      if (input.startTime && input.endTime && input.endTime < input.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time cannot be before start time",
        });
      }

      // Prepare update data with relationship updates
      const updatePayload: typeof updateData & {
        tools?: { set: { id: string }[] };
        targets?: {
          deleteMany: Prisma.TechniqueTargetScalarWhereInput;
          create?: { targetId: string; wasCompromised: boolean }[];
        };
      } = { ...updateData };

      if (targets !== undefined) {
        const normalizedAssignments = normalizeTechniqueTargetAssignments(targets);
        await ensureTargetsAssignableToOperation(
          ctx.db,
          existingTechnique.operationId,
          normalizedAssignments,
          existingTechnique.operation.targets.map((t) => t.id),
        );

        updatePayload.targets = {
          deleteMany: {},
          ...(normalizedAssignments.length
            ? {
                create: normalizedAssignments.map(({ targetId, wasCompromised }) => ({
                  targetId,
                  wasCompromised: wasCompromised ?? false,
                })),
              }
            : {}),
        };
      }

      if (toolIds !== undefined) {
        updatePayload.tools = {
          set: toolIds.map((id) => ({ id })),
        };
      }

      const updated = await ctx.db.technique.update({
        where: { id },
        data: updatePayload,
        include: {
          operation: { select: { id: true, name: true } },
          mitreTechnique: {
            include: {
              tactic: true,
            },
          },
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
      logger.info(
        auditEvent(ctx, "sec.technique.update", {
          techniqueId: id,
          techniqueDescription: updated.description,
          operationId: updated.operation?.id,
          operationName: updated.operation?.name,
        }),
        "Technique updated",
      );
      return updated;
    }),

  // Delete technique
  delete: protectedProcedure
    .input(getTechniqueSchema)
    .mutation(async ({ ctx, input }) => {
      const technique = await ctx.db.technique.findUnique({
        where: { id: input.id },
        include: { operation: true },
      });

      if (!technique) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Technique not found",
        });
      }

      const hasAccess = await checkOperationAccess(ctx, technique.operationId, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this technique",
        });
      }

      const deleted = await ctx.db.technique.delete({
        where: { id: input.id },
      });
      logger.info(
        auditEvent(ctx, "sec.technique.delete", {
          techniqueId: input.id,
          techniqueDescription: technique.description,
          operationId: technique.operation.id,
          operationName: technique.operation.name,
        }),
        "Technique deleted",
      );
      return deleted;
    }),


  // Reorder techniques within an operation
  reorder: protectedProcedure
    .input(z.object({
      operationId: z.number(),
      techniqueIds: z.array(z.string()), // Array of technique IDs in new order
    }))
    .mutation(async ({ ctx, input }) => {
      const { operationId, techniqueIds } = input;

      // Verify operation exists and user has access
      const operation = await ctx.db.operation.findUnique({
        where: { id: operationId },
        include: { techniques: { select: { id: true } } },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      const hasAccess = await checkOperationAccess(ctx, operationId, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }

      // Verify all technique IDs belong to this operation
      const existingTechniqueIds = operation.techniques.map(t => t.id);
      const invalidIds = techniqueIds.filter(id => !existingTechniqueIds.includes(id));
      
      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some technique IDs don't belong to this operation",
        });
      }

      // Update sort orders in a transaction
      await ctx.db.$transaction(
        techniqueIds.map((techniqueId, index) =>
          ctx.db.technique.update({
            where: { id: techniqueId },
            data: { sortOrder: index },
          })
        )
      );
      logger.info(
        auditEvent(ctx, "sec.technique.reorder", {
          operationId,
          operationName: operation.name,
          techniqueIds,
        }),
        "Techniques reordered",
      );
      return { success: true };
    }),

  // List techniques (with access control)
  list: viewerProcedure
    .input(listTechniquesSchema)
    .query(async ({ ctx, input }) => {
      const { operationId, limit, cursor } = input;
      const accessFilter = getAccessibleOperationFilter(ctx);

      // Build where clause
      const where = {
        operation: accessFilter,
        ...(operationId ? { operationId } : {}),
      };

      // Get techniques with cursor-based pagination
      const techniques = await ctx.db.technique.findMany({
        where,
        take: limit + 1, // Take one extra to determine if there are more
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          operation: { select: { id: true, name: true } },
          mitreTechnique: {
            include: { tactic: true },
          },
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

      // Handle pagination
      let nextCursor: string | undefined = undefined;
      if (techniques.length > limit) {
        const nextItem = techniques.pop(); // Remove the extra item
        nextCursor = nextItem!.id;
      }

      return {
        techniques,
        nextCursor,
      };
    }),

  // Get technique by ID (with access control)
  getById: viewerProcedure
    .input(getTechniqueSchema)
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const technique = await ctx.db.technique.findFirst({
        where: {
          id: input.id,
          operation: accessFilter,
        },
        include: {
          operation: { select: { id: true, name: true } },
          mitreTechnique: {
            include: { tactic: true },
          },
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

      if (!technique) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Technique not found",
        });
      }

      return technique;
    }),
});
