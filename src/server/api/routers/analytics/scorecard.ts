import { z } from "zod";
import { ToolType, OutcomeType, OutcomeStatus } from "@prisma/client";
import { createTRPCRouter, viewerProcedure } from "@/server/api/trpc";
import { getAccessibleOperationFilter } from "@/server/api/access";
import { tacticOrderIndex } from "@/lib/mitreOrder";

export const scorecardRouter = createTRPCRouter({
  metrics: viewerProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        tagIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const baseOperationFilter = {
        ...accessFilter,
        ...(input.tagIds?.length ? { tags: { some: { id: { in: input.tagIds } } } } : {}),
      };

      const [completedOperations, techniques, offensiveTools, defensiveTools] = await Promise.all([
        ctx.db.operation.findMany({
          where: {
            ...baseOperationFilter,
            endDate: { not: null, gte: input.start, lte: input.end },
          },
          select: { id: true, name: true, threatActorId: true },
        }),
        ctx.db.technique.findMany({
          where: {
            operation: baseOperationFilter,
            OR: [
              { startTime: { not: null, gte: input.start, lte: input.end } },
              { startTime: null, createdAt: { gte: input.start, lte: input.end } },
            ],
          },
          select: {
            id: true,
            startTime: true,
            executedSuccessfully: true,
            operationId: true,
            operation: { select: { id: true, name: true, threatActorId: true } },
            mitreTechnique: { include: { tactic: true } },
            outcomes: {
              where: { status: { not: OutcomeStatus.NOT_APPLICABLE } },
              select: { type: true, status: true, detectionTime: true },
            },
            targets: {
              where: { target: { isCrownJewel: true } },
              select: { wasCompromised: true },
            },
          },
        }),
        ctx.db.tool.findMany({
          where: {
            type: ToolType.OFFENSIVE,
            techniques: {
              some: {
                operation: baseOperationFilter,
                startTime: { not: null, gte: input.start, lte: input.end },
              },
            },
          },
          select: { id: true },
        }),
        ctx.db.tool.findMany({
          where: {
            type: ToolType.DEFENSIVE,
            outcomes: {
              some: {
                technique: {
                  operation: baseOperationFilter,
                  startTime: { not: null, gte: input.start, lte: input.end },
                },
              },
            },
          },
          select: { id: true },
        }),
      ]);

      const plannedCount = techniques.length;

      const operationLookup = new Map<number, { id: number; name: string | null }>();
      const threatActorIds = new Set<string>();
      const crownJewelOperations = new Set<number>();

      const offensiveToolIds = new Set(offensiveTools.map((tool) => tool.id));
      const defensiveToolIds = new Set(defensiveTools.map((tool) => tool.id));

      let detectionAttempts = 0;
      let detectionSuccesses = 0;
      let preventionAttempts = 0;
      let preventionSuccesses = 0;
      let attributionAttempts = 0;
      let attributionSuccesses = 0;
      let cjAttempts = 0;
      let cjSuccesses = 0;
      let executedTotal = 0;
      let executedSuccesses = 0;
      let executedFailures = 0;
      let executedUnknown = 0;

      const executedTacticIds = new Set<string>();
      const tacticExecution = new Map<
        string,
        {
          tacticId: string;
          tacticName: string;
          successes: number;
          failures: number;
          unknown: number;
          operationIds: Set<number>;
        }
      >();

      type TimingBucket =
        | "< 1 min"
        | "1-5 min"
        | "5-15 min"
        | "15-60 min"
        | "1-6 hrs"
        | "6-24 hrs"
        | "> 24 hrs";
      const emptyDistribution = (): Record<TimingBucket, number> => ({
        "< 1 min": 0,
        "1-5 min": 0,
        "5-15 min": 0,
        "15-60 min": 0,
        "1-6 hrs": 0,
        "6-24 hrs": 0,
        "> 24 hrs": 0,
      });

      const detectionDistribution = emptyDistribution();
      const attributionDistribution = emptyDistribution();

      let totalDetectionTime = 0;
      let detectionCount = 0;
      let totalAttributionTime = 0;
      let attributionCount = 0;

      const bucketForMinutes = (minutes: number): TimingBucket => {
        if (minutes < 1) return "< 1 min";
        if (minutes < 5) return "1-5 min";
        if (minutes < 15) return "5-15 min";
        if (minutes < 60) return "15-60 min";
        if (minutes < 360) return "1-6 hrs";
        if (minutes < 1440) return "6-24 hrs";
        return "> 24 hrs";
      };

      techniques.forEach((technique) => {
        const tactic = technique.mitreTechnique?.tactic;
        const start = technique.startTime ? new Date(technique.startTime) : null;

        if (start) {
          executedTotal++;

          if (technique.operation) {
            operationLookup.set(technique.operation.id, {
              id: technique.operation.id,
              name: technique.operation.name ?? null,
            });
            if (technique.operation.threatActorId) {
              threatActorIds.add(technique.operation.threatActorId);
            }
          }

          if (tactic) {
            executedTacticIds.add(tactic.id);
          }

          const entry = tactic
            ? tacticExecution.get(tactic.id) ?? {
                tacticId: tactic.id,
                tacticName: tactic.name,
                successes: 0,
                failures: 0,
                unknown: 0,
                operationIds: new Set<number>(),
              }
            : null;

          if (technique.executedSuccessfully === true) {
            executedSuccesses++;
            if (entry) entry.successes++;
          } else if (technique.executedSuccessfully === false) {
            executedFailures++;
            if (entry) entry.failures++;
          } else {
            executedUnknown++;
            if (entry) entry.unknown++;
          }

          if (entry) {
            entry.operationIds.add(technique.operationId);
            if (!tacticExecution.has(tactic!.id)) {
              tacticExecution.set(tactic!.id, entry);
            }
          }

          if (technique.targets.length > 0) {
            cjAttempts++;
            if (technique.targets.some((assignment) => assignment.wasCompromised)) {
              cjSuccesses++;
            }
            crownJewelOperations.add(technique.operationId);
          }
        }

        technique.outcomes.forEach((outcome) => {
          if (outcome.status === OutcomeStatus.NOT_APPLICABLE) {
            return;
          }

          const detectionTime = outcome.detectionTime ? new Date(outcome.detectionTime) : null;

          if (outcome.type === OutcomeType.DETECTION) {
            detectionAttempts++;
            if (outcome.status === OutcomeStatus.DETECTED) {
              detectionSuccesses++;
              if (start && detectionTime) {
                const diff = Math.max(0, Math.round((detectionTime.getTime() - start.getTime()) / (1000 * 60)));
                totalDetectionTime += diff;
                detectionCount++;
                detectionDistribution[bucketForMinutes(diff)]++;
              }
            }
          } else if (outcome.type === OutcomeType.PREVENTION) {
            preventionAttempts++;
            if (outcome.status === OutcomeStatus.PREVENTED) {
              preventionSuccesses++;
            }
          } else if (outcome.type === OutcomeType.ATTRIBUTION) {
            attributionAttempts++;
            if (outcome.status === OutcomeStatus.ATTRIBUTED) {
              attributionSuccesses++;
              if (start && detectionTime) {
                const diff = Math.max(0, Math.round((detectionTime.getTime() - start.getTime()) / (1000 * 60)));
                totalAttributionTime += diff;
                attributionCount++;
                attributionDistribution[bucketForMinutes(diff)]++;
              }
            }
          }
        });
      });

      const executedByTactic = Array.from(tacticExecution.values())
        .map((entry) => ({
          tacticId: entry.tacticId,
          tacticName: entry.tacticName,
          successes: entry.successes,
          failures: entry.failures,
          unknown: entry.unknown,
          total: entry.successes + entry.failures + entry.unknown,
          operations: Array.from(entry.operationIds)
            .map((id) => operationLookup.get(id))
            .filter((op): op is { id: number; name: string | null } => op !== undefined)
            .map((op) => ({ id: op.id.toString(), name: op.name ?? op.id.toString() })),
        }))
        .sort(
          (a, b) =>
            tacticOrderIndex(a.tacticId) - tacticOrderIndex(b.tacticId) || a.tacticId.localeCompare(b.tacticId)
        );

      const rate = (succ: number, att: number) => (att > 0 ? Math.round((succ / att) * 100) : null);

      return {
        operations: completedOperations.length,
        techniques: {
          planned: plannedCount,
          executed: {
            total: executedTotal,
            successes: executedSuccesses,
            failures: executedFailures,
            unknown: executedUnknown,
            byTactic: executedByTactic,
          },
        },
        tactics: executedTacticIds.size,
        crownJewelCompromises: {
          successes: cjSuccesses,
          attempts: cjAttempts,
          operations: crownJewelOperations.size,
        },
        threatActors: threatActorIds.size,
        offensiveTools: offensiveToolIds.size,
        defensiveTools: defensiveToolIds.size,
        outcomes: {
          detection: {
            attempts: detectionAttempts,
            successes: detectionSuccesses,
            rate: rate(detectionSuccesses, detectionAttempts),
          },
          prevention: {
            attempts: preventionAttempts,
            successes: preventionSuccesses,
            rate: rate(preventionSuccesses, preventionAttempts),
          },
          attribution: {
            attempts: attributionAttempts,
            successes: attributionSuccesses,
            rate: rate(attributionSuccesses, attributionAttempts),
          },
        },
        timing: {
          avgTimeToDetect: detectionCount > 0 ? Math.round(totalDetectionTime / detectionCount) : null,
          avgTimeToAttribute: attributionCount > 0 ? Math.round(totalAttributionTime / attributionCount) : null,
          detectionDistribution,
          attributionDistribution,
          detectionSamples: detectionCount,
          attributionSamples: attributionCount,
        },
      };
    }),
});
