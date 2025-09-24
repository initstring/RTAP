import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole, OutcomeType, OutcomeStatus } from "@prisma/client";
import { analyticsRouter } from "@/server/api/routers/analytics";

vi.mock("@/server/db", () => ({
  db: {
    operation: { findMany: vi.fn() },
    technique: { findMany: vi.fn() },
    tool: { findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createCtx = () => ({
  session: { user: { id: "u1", role: UserRole.ADMIN }, expires: new Date().toISOString() },
  db: mockDb,
  headers: new Headers(),
  requestId: "analytics-scorecard-test",
});

describe("Scorecard metrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("computes summary metrics", async () => {
    mockDb.operation.findMany.mockResolvedValue([
      { id: 1, name: "Operation 1", threatActorId: "ta1" },
      { id: 2, name: "Operation 2", threatActorId: "ta2" },
    ]);
    mockDb.technique.findMany.mockResolvedValue([
      {
        id: "tech1",
        startTime: new Date("2024-01-02T00:00:00Z"),
        executedSuccessfully: true,
        operationId: 1,
        operation: { id: 1, name: "Operation 1", threatActorId: "ta1" },
        mitreTechnique: { tactic: { id: "TA0001", name: "Initial Access" } },
        outcomes: [
          {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detectionTime: new Date("2024-01-02T00:05:00Z"),
          },
          {
            type: OutcomeType.PREVENTION,
            status: OutcomeStatus.PREVENTED,
            detectionTime: null,
          },
        ],
        targetEngagements: [
          {
            targetId: "cj-1",
            wasSuccessful: true,
            target: { id: "cj-1", name: "CJ", isCrownJewel: true },
          },
        ],
      },
      {
        id: "tech2",
        startTime: new Date("2024-01-03T00:00:00Z"),
        executedSuccessfully: false,
        operationId: 2,
        operation: { id: 2, name: "Operation 2", threatActorId: "ta2" },
        mitreTechnique: { tactic: { id: "TA0002", name: "Execution" } },
        outcomes: [
          {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.MISSED,
            detectionTime: null,
          },
          {
            type: OutcomeType.ATTRIBUTION,
            status: OutcomeStatus.ATTRIBUTED,
            detectionTime: new Date("2024-01-03T02:00:00Z"),
          },
        ],
        targetEngagements: [
          {
            targetId: "cj-1",
            wasSuccessful: false,
            target: { id: "cj-1", name: "CJ", isCrownJewel: true },
          },
        ],
      },
      {
        id: "tech3",
        startTime: new Date("2024-01-04T00:00:00Z"),
        executedSuccessfully: null,
        operationId: 1,
        operation: { id: 1, name: "Operation 1", threatActorId: "ta1" },
        mitreTechnique: { tactic: { id: "TA0001", name: "Initial Access" } },
        outcomes: [],
        targetEngagements: [],
      },
      {
        id: "tech4",
        startTime: null,
        executedSuccessfully: null,
        operationId: 1,
        operation: { id: 1, name: "Operation 1", threatActorId: "ta1" },
        mitreTechnique: { tactic: { id: "TA0003", name: "Persistence" } },
        outcomes: [],
        targetEngagements: [],
      },
    ]);
    mockDb.tool.findMany
      .mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]) // offensive
      .mockResolvedValueOnce([{ id: "t3" }]); // defensive

    const caller = analyticsRouter.createCaller(createCtx());
    const res = await caller.scorecard.metrics({ start: new Date("2024-01-01"), end: new Date("2024-01-31") });

    expect(res.operations).toBe(2);
    expect(res.techniques).toEqual({
      planned: 4,
      executed: {
        total: 3,
        successes: 1,
        failures: 1,
        unknown: 1,
        byTactic: [
          {
            tacticId: "TA0001",
            tacticName: "Initial Access",
            successes: 1,
            failures: 0,
            unknown: 1,
            total: 2,
            operations: [{ id: "1", name: "Operation 1" }],
          },
          {
            tacticId: "TA0002",
            tacticName: "Execution",
            successes: 0,
            failures: 1,
            unknown: 0,
            total: 1,
            operations: [{ id: "2", name: "Operation 2" }],
          },
        ],
      },
    });
    expect(res.tactics).toBe(2);
    expect(res.crownJewelCompromises).toEqual({ successes: 1, attempts: 2, operations: 2 });
    expect(res.threatActors).toBe(2);
    expect(res.offensiveTools).toBe(2);
    expect(res.defensiveTools).toBe(1);
    expect(res.outcomes.detection.rate).toBe(50);
    expect(res.outcomes.prevention.rate).toBe(100);
    expect(res.outcomes.attribution.rate).toBe(100);
    expect(res.timing.avgTimeToDetect).toBe(5);
    expect(res.timing.avgTimeToAttribute).toBe(120);
    expect(res.timing.detectionDistribution).toMatchObject({ "5-15 min": 1 });
    expect(res.timing.attributionDistribution).toMatchObject({ "1-6 hrs": 1 });
    expect(res.timing.detectionSamples).toBe(1);
    expect(res.timing.attributionSamples).toBe(1);
  });

  it("counts outcomes even when techniques lack a start time", async () => {
    mockDb.operation.findMany.mockResolvedValue([{ id: 1, name: "Operation 1", threatActorId: null }]);
    mockDb.technique.findMany.mockResolvedValue([
      {
        id: "tech1",
        startTime: null,
        executedSuccessfully: null,
        operationId: 1,
        operation: { id: 1, name: "Operation 1", threatActorId: null },
        mitreTechnique: { tactic: { id: "TA0001", name: "Initial Access" } },
        outcomes: [
          {
            type: OutcomeType.DETECTION,
            status: OutcomeStatus.DETECTED,
            detectionTime: new Date("2024-01-02T00:05:00Z"),
          },
          {
            type: OutcomeType.PREVENTION,
            status: OutcomeStatus.PREVENTED,
            detectionTime: null,
          },
        ],
        targetEngagements: [],
      },
    ]);
    mockDb.tool.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const caller = analyticsRouter.createCaller(createCtx());
    const res = await caller.scorecard.metrics({
      start: new Date("2024-01-01"),
      end: new Date("2024-01-31"),
    });

    expect(res.techniques.executed.total).toBe(0);
    expect(res.outcomes.detection).toEqual({ attempts: 1, successes: 1, rate: 100 });
    expect(res.outcomes.prevention).toEqual({ attempts: 1, successes: 1, rate: 100 });
    expect(res.timing.avgTimeToDetect).toBeNull();
    expect(res.timing.detectionSamples).toBe(0);
  });
});
