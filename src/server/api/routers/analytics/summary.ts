import { z } from "zod";
import { OutcomeType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getAccessibleOperationFilter } from "@/server/api/access";
import { createTRPCRouter, viewerProcedure } from "@/server/api/trpc";

export const summaryRouter = createTRPCRouter({
  // Operation summary statistics
  operations: viewerProcedure.query(async ({ ctx }) => {
    const accessFilter = getAccessibleOperationFilter(ctx);

    const [
      total,
      active,
      completed,
      planning,
      cancelled,
      techniqueCount,
    ] = await Promise.all([
      ctx.db.operation.count({ where: accessFilter }),
      ctx.db.operation.count({ where: { ...accessFilter, status: "ACTIVE" } }),
      ctx.db.operation.count({ where: { ...accessFilter, status: "COMPLETED" } }),
      ctx.db.operation.count({ where: { ...accessFilter, status: "PLANNING" } }),
      ctx.db.operation.count({ where: { ...accessFilter, status: "CANCELLED" } }),
      ctx.db.technique.count({
        where: {
          operation: accessFilter,
        },
      }),
    ]);

    // Calculate average duration for completed operations
    const completedOps = await ctx.db.operation.findMany({
      where: {
        ...accessFilter,
        status: "COMPLETED",
        startDate: { not: null },
        endDate: { not: null },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    let avgDuration = 0;
    if (completedOps.length > 0) {
      const totalDuration = completedOps.reduce((sum, op) => {
        if (op.startDate && op.endDate) {
          const duration = new Date(op.endDate).getTime() - new Date(op.startDate).getTime();
          return sum + duration / (1000 * 60 * 60 * 24); // Convert to days
        }
        return sum;
      }, 0);
      avgDuration = Math.round(totalDuration / completedOps.length);
    }

    return {
      total,
      active,
      completed,
      planning,
      cancelled,
      totalTechniques: techniqueCount,
      avgTechniquesPerOperation: total > 0 ? Math.round(techniqueCount / total) : 0,
      avgDurationDays: avgDuration,
    };
  }),

  // Outcome summary statistics
  outcomes: viewerProcedure.query(async ({ ctx }) => {
    const accessFilter = getAccessibleOperationFilter(ctx);

    // Get all outcomes from accessible operations
    const outcomes = await ctx.db.outcome.findMany({
      where: {
        technique: {
          operation: accessFilter,
        },
      },
      select: {
        type: true,
      },
    });

    const total = outcomes.length;
    const byType = outcomes.reduce((acc, outcome) => {
      acc[outcome.type] = (acc[outcome.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      detected: byType[OutcomeType.DETECTION] ?? 0,
      prevented: byType[OutcomeType.PREVENTION] ?? 0,
      attributed: byType[OutcomeType.ATTRIBUTION] ?? 0,
      // For now, we'll report 0 for negative outcomes since they don't exist in the enum
      notDetected: 0,
      notPrevented: 0,
      notAttributed: 0,
      detectionRate: total > 0 ? Math.round(((byType[OutcomeType.DETECTION] ?? 0) / total) * 100) : 0,
      preventionRate: total > 0 ? Math.round(((byType[OutcomeType.PREVENTION] ?? 0) / total) * 100) : 0,
      attributionRate: total > 0 ? Math.round(((byType[OutcomeType.ATTRIBUTION] ?? 0) / total) * 100) : 0,
    };
  }),

  // Dashboard summary (combines key metrics)
  dashboard: viewerProcedure
    .input(
      z
        .object({
          start: z.date(),
          end: z.date(),
          tagIds: z.array(z.string()).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const operationWhere: Prisma.OperationWhereInput = input
        ? {
            ...accessFilter,
            ...(input.tagIds?.length
              ? { tags: { some: { id: { in: input.tagIds } } } }
              : {}),
            OR: [
              { startDate: { gte: input.start, lte: input.end } },
              { startDate: null, createdAt: { gte: input.start, lte: input.end } },
            ],
          }
        : accessFilter;

      const [total, active, completed, planning, cancelled, techniqueCount] = await Promise.all([
        ctx.db.operation.count({ where: operationWhere }),
        ctx.db.operation.count({ where: { ...operationWhere, status: "ACTIVE" } }),
        ctx.db.operation.count({ where: { ...operationWhere, status: "COMPLETED" } }),
        ctx.db.operation.count({ where: { ...operationWhere, status: "PLANNING" } }),
        ctx.db.operation.count({ where: { ...operationWhere, status: "CANCELLED" } }),
        ctx.db.technique.count({ where: { operation: operationWhere } }),
      ]);

      const completedOps = await ctx.db.operation.findMany({
        where: {
          ...operationWhere,
          status: "COMPLETED",
          startDate: { not: null },
          endDate: { not: null },
        },
        select: { startDate: true, endDate: true },
      });

      let avgDuration = 0;
      if (completedOps.length > 0) {
        const totalDuration = completedOps.reduce((sum, op) => {
          if (op.startDate && op.endDate) {
            const duration = new Date(op.endDate).getTime() - new Date(op.startDate).getTime();
            return sum + duration / (1000 * 60 * 60 * 24);
          }
          return sum;
        }, 0);
        avgDuration = Math.round(totalDuration / completedOps.length);
      }

      const outcomesList = await ctx.db.outcome.findMany({
        where: { technique: { operation: operationWhere } },
        select: { type: true, status: true },
      });

    // Count successful outcomes by type (only where status is the success state)
    let detectionSuccesses = 0;
    let detectionAttempts = 0;
    let preventionSuccesses = 0;
    let preventionAttempts = 0;
    let attributionSuccesses = 0;
    let attributionAttempts = 0;

    outcomesList.forEach((outcome) => {
      // Skip N/A outcomes entirely - they don't count as attempts
      if (outcome.status === "NOT_APPLICABLE") return;

      switch (outcome.type) {
        case OutcomeType.DETECTION:
          detectionAttempts++;
          if (outcome.status === "DETECTED") detectionSuccesses++;
          break;
        case OutcomeType.PREVENTION:
          preventionAttempts++;
          if (outcome.status === "PREVENTED") preventionSuccesses++;
          break;
        case OutcomeType.ATTRIBUTION:
          attributionAttempts++;
          if (outcome.status === "ATTRIBUTED") attributionSuccesses++;
          break;
      }
    });

    const operations = {
      total,
      active,
      completed,
      planning,
      cancelled,
      totalTechniques: techniqueCount,
      avgTechniquesPerOperation: total > 0 ? Math.round(techniqueCount / total) : 0,
      avgDurationDays: avgDuration,
    };

    const outcomes = {
      total: outcomesList.length,
      detected: detectionSuccesses,
      prevented: preventionSuccesses,
      attributed: attributionSuccesses,
      notDetected: detectionAttempts - detectionSuccesses,
      notPrevented: preventionAttempts - preventionSuccesses,
      notAttributed: attributionAttempts - attributionSuccesses,
      // Calculate rates based on actual attempts (excluding N/A)
      detectionRate: detectionAttempts > 0 ? Math.round((detectionSuccesses / detectionAttempts) * 100) : null,
      preventionRate: preventionAttempts > 0 ? Math.round((preventionSuccesses / preventionAttempts) * 100) : null,
      attributionRate: attributionAttempts > 0 ? Math.round((attributionSuccesses / attributionAttempts) * 100) : null,
      // Track attempt counts for frontend to know when to show N/A
      detectionAttempts,
      preventionAttempts,
      attributionAttempts,
    };

    // Get timing analytics using actual timestamps
    const techniquesList = await ctx.db.technique.findMany({
      where: {
        AND: [
          { startTime: { not: null } },
          {
            outcomes: {
              some: {
                AND: [
                  {
                    OR: [
                      { type: OutcomeType.DETECTION, status: "DETECTED" },
                      { type: OutcomeType.ATTRIBUTION, status: "ATTRIBUTED" },
                    ],
                  },
                  { detectionTime: { not: null } },
                ],
              },
            },
          },
          { operation: operationWhere },
        ],
      },
      select: {
        startTime: true,
        outcomes: {
          where: {
            AND: [
              {
                OR: [
                  { type: OutcomeType.DETECTION, status: "DETECTED" },
                  { type: OutcomeType.ATTRIBUTION, status: "ATTRIBUTED" },
                ],
              },
              { detectionTime: { not: null } },
            ],
          },
          select: {
            type: true,
            status: true,
            detectionTime: true,
          },
        },
      },
    });

    // Calculate average detection and attribution times using actual timestamps
    let totalDetectionTime = 0;
    let detectionCount = 0;
    let totalAttributionTime = 0;
    let attributionCount = 0;

    techniquesList.forEach((technique) => {
      if (!technique.startTime) return;

      technique.outcomes.forEach((outcome) => {
        if (!outcome.detectionTime) return;

        // Calculate time difference in minutes
        const startTime = new Date(technique.startTime!);
        const detectionTime = new Date(outcome.detectionTime);
        const timeDiffMinutes = Math.round((detectionTime.getTime() - startTime.getTime()) / (1000 * 60));

        // Only count successful outcomes with valid timing
        if (outcome.type === OutcomeType.DETECTION && outcome.status === "DETECTED") {
          totalDetectionTime += timeDiffMinutes;
          detectionCount++;
        } else if (outcome.type === OutcomeType.ATTRIBUTION && outcome.status === "ATTRIBUTED") {
          totalAttributionTime += timeDiffMinutes;
          attributionCount++;
        }
      });
    });

    return {
      operations,
      outcomes,
      timing: {
        avgTimeToDetect: detectionCount > 0 ? Math.round(totalDetectionTime / detectionCount) : null,
        avgTimeToAttribute: attributionCount > 0 ? Math.round(totalAttributionTime / attributionCount) : null,
      },
    };
  }),

  // Crown Jewel targeting trends over time
  crownJewels: viewerProcedure
    .input(
      z
        .object({
          period: z.enum(["7d", "30d", "90d", "1y"]),
          groupBy: z.enum(["day", "week", "month"]).optional(),
          tagIds: z.array(z.string()).optional().describe("Filter to operations that have any of these tag IDs"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      // Default to a reasonable window if input is missing (defensive for callers)
      const effectiveInput = input ?? { period: "1y" as const, groupBy: undefined, tagIds: undefined };
      const periodDays = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[effectiveInput.period];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Get techniques scoped by operations in range; we only need CJ flags + operation dates
      const techniques = await ctx.db.technique.findMany({
        where: {
          operation: {
            ...accessFilter,
            ...(effectiveInput.tagIds?.length
              ? { tags: { some: { id: { in: effectiveInput.tagIds } } } }
              : {}),
            OR: [
              { startDate: { gte: startDate } },
              { startDate: null, createdAt: { gte: startDate } },
            ],
          },
        },
        select: {
          operation: { select: { id: true, createdAt: true, startDate: true } },
          targetEngagements: {
            include: {
              target: true,
            },
          },
        },
      });

      const grouping = effectiveInput.groupBy ?? (periodDays <= 30 ? "day" : periodDays <= 90 ? "week" : "month");
      const groups = new Map<string, { date: string; attempts: number; successes: number; targetedOps: Set<number> }>();

      const makeKey = (d: Date) => {
        if (grouping === "day") return d.toISOString().split("T")[0] ?? "";
        if (grouping === "week") {
          const s = new Date(d);
          s.setDate(d.getDate() - d.getDay());
          return s.toISOString().split("T")[0] ?? "";
        }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };

      techniques.forEach((t) => {
        const baseDate = new Date(t.operation.startDate ?? t.operation.createdAt);
        const key = makeKey(baseDate);
        if (!groups.has(key)) groups.set(key, { date: key, attempts: 0, successes: 0, targetedOps: new Set<number>() });
        const g = groups.get(key)!;
        const crownTargets = t.targetEngagements?.filter((engagement) => engagement.target?.isCrownJewel) ?? [];
        if (crownTargets.length > 0) {
          g.attempts++;
          g.targetedOps.add(t.operation.id);
          if (crownTargets.some((engagement) => engagement.wasSuccessful === true)) g.successes++;
        }
      });

      return Array.from(groups.values()).map((g) => ({
        date: g.date,
        attempts: g.attempts,
        successes: g.successes,
        targetedOps: g.targetedOps.size,
        successRate: g.attempts > 0 ? Math.round((g.successes / g.attempts) * 100) : 0,
      }));
    }),
});

