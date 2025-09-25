import { z } from "zod";
import { createTRPCRouter, operatorProcedure, viewerProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OperationStatus, OperationVisibility } from "@prisma/client";
import { checkOperationAccess, getAccessibleOperationFilter } from "@/server/api/access";
import { createOperationWithValidations, updateOperationWithValidations } from "@/server/services/operationService";
import { auditEvent, logger } from "@/server/logger";
import { summarizeOutcomeMetrics } from "@/lib/outcomeMetrics";

// Input validation schemas
const createOperationSchema = z.object({
  name: z.string().min(1, "Operation name is required"),
  description: z.string().min(1, "Description is required"),
  threatActorId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  targetIds: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  visibility: z.nativeEnum(OperationVisibility).optional(),
  accessGroupIds: z.array(z.string()).optional(),
});

const updateOperationSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Operation name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  status: z.nativeEnum(OperationStatus).optional(),
  threatActorId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  targetIds: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  visibility: z.nativeEnum(OperationVisibility).optional(),
  accessGroupIds: z.array(z.string()).optional(),
});

const getOperationSchema = z.object({
  id: z.number(),
});

const listOperationsSchema = z.object({
  status: z.nativeEnum(OperationStatus).optional(),
  threatActorId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

// Access helpers centralized in @/server/api/access

export const operationsRouter = createTRPCRouter({
  // Create a new operation (Operators and Admins only)
  create: operatorProcedure
    .input(createOperationSchema)
    .mutation(async ({ ctx, input }) => {
      const op = await createOperationWithValidations({ db: ctx.db, user: ctx.session.user, input });
      logger.info(
        auditEvent(ctx, "sec.operation.create", { operationId: op.id, operationName: op.name }),
        "Operation created",
      );
      return op;
    }),

  // Get operation by ID (all authenticated users, with access check)
  getById: viewerProcedure
    .input(getOperationSchema)
    .query(async ({ ctx, input }) => {
      // Check access first
      const hasAccess = await checkOperationAccess(ctx, input.id, "view");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this operation",
        });
      }
      
      const operation = await ctx.db.operation.findUnique({
        where: { id: input.id },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          threatActor: true,
          tags: true,
          targets: true,
          accessGroups: { include: { group: true } },
          techniques: {
            include: {
              mitreTechnique: { include: { tactic: true } },
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
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      return operation;
    }),

  // List operations with filtering and pagination (all authenticated users, filtered by access)
  list: viewerProcedure
    .input(listOperationsSchema)
    .query(async ({ ctx, input }) => {
      const { status, threatActorId, tagIds, limit, cursor } = input;

      // Get access filter based on user's groups
      const accessFilter = getAccessibleOperationFilter(ctx);
      
      const where: Record<string, unknown> = {
        ...accessFilter,
      };

      if (status) {
        where.status = status;
      }

      if (threatActorId) {
        where.threatActorId = threatActorId;
      }

      if (tagIds && tagIds.length > 0) {
        where.tags = {
          some: {
            id: { in: tagIds },
          },
        };
      }

      if (cursor) {
        where.id = { lt: cursor };
      }

      const operations = await ctx.db.operation.findMany({
        where,
        take: limit + 1,
        orderBy: [
          { startDate: "desc" },
          { createdAt: "desc" } // Fallback for operations without startDate
        ],
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
              targets: {
                include: {
                  target: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (operations.length > limit) {
        const nextItem = operations.pop();
        nextCursor = nextItem!.id;
      }

      return {
        operations: operations.map((op) => ({
          ...op,
          techniqueCount: op.techniques.length,
        })),
        nextCursor,
      };
    }),

  // Update operation (Operators and Admins only, with access check)
  update: operatorProcedure
    .input(updateOperationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if operation exists and user has modify access
      const hasAccess = await checkOperationAccess(ctx, input.id, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }
      const updated = await updateOperationWithValidations({ db: ctx.db, user: ctx.session.user, input });
      logger.info(
        auditEvent(ctx, "sec.operation.update", { operationId: updated.id, operationName: updated.name }),
        "Operation updated",
      );
      return updated;
    }),

  // Delete operation (Operators and Admins only, with access check)
  delete: operatorProcedure
    .input(getOperationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if operation exists and user has modify access
      const hasAccess = await checkOperationAccess(ctx, input.id, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this operation",
        });
      }
      
      const operation = await ctx.db.operation.findUnique({
        where: { id: input.id },
        select: { id: true, name: true },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      const deleted = await ctx.db.operation.delete({
        where: { id: input.id },
      });
      logger.info(
        auditEvent(ctx, "sec.operation.delete", { operationId: input.id, operationName: operation.name }),
        "Operation deleted",
      );
      return deleted;
    }),



  // Get aggregated defensive effectiveness metrics (filtered by user access)
  getDefensiveMetrics: viewerProcedure.query(async ({ ctx }) => {
    const accessFilter = getAccessibleOperationFilter(ctx);
    
    // Get outcomes from techniques in accessible operations only
    const outcomes = await ctx.db.outcome.findMany({
      include: {
        technique: {
          include: {
            operation: { select: { id: true, status: true } },
          },
        },
      },
      where: {
        technique: {
          operation: accessFilter,
        },
      },
    });

    const metrics = summarizeOutcomeMetrics(outcomes);

    return {
      detection: metrics.DETECTION.successRate,
      prevention: metrics.PREVENTION.successRate,
      attribution: metrics.ATTRIBUTION.successRate,
      totalOutcomes: outcomes.length,
    };
  }),

  

  // Get attack flow layout
  getAttackFlowLayout: viewerProcedure
    .input(getOperationSchema)
    .query(async ({ ctx, input }) => {
      // Verify user has access to this operation
      const hasAccess = await checkOperationAccess(ctx, input.id, "view");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this operation",
        });
      }
      const layout = await ctx.db.attackFlowLayout.findUnique({
        where: { operationId: input.id },
      });
      
      return layout;
    }),

  // Save attack flow layout (Operators and Admins only)
  saveAttackFlowLayout: operatorProcedure
    .input(
      z.object({
        operationId: z.number(),
        nodes: z.array(
          z.object({
            id: z.string(),
            position: z.object({
              x: z.number(),
              y: z.number(),
            }),
          })
        ),
        edges: z.array(
          z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().optional(),
            targetHandle: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { operationId, nodes, edges } = input;

      const hasAccess = await checkOperationAccess(ctx, operationId, "modify");
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }

      // Check if operation exists
      const operation = await ctx.db.operation.findUnique({
        where: { id: operationId },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      // Upsert the layout (create if doesn't exist, update if exists)
      const layout = await ctx.db.attackFlowLayout.upsert({
        where: { operationId },
        create: {
          operationId,
          nodes,
          edges,
        },
        update: {
          nodes,
          edges,
        },
      });

      return layout;
    }),
});
