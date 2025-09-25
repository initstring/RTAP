import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  getTargetUsageCount,
  getTagUsageCount,
  getThreatActorUsageCount,
  getToolCategoryUsageCount,
  getToolUsageCount,
} from "@/server/services/usageService";

describe("usageService", () => {
  it("counts threat actor usage via operations", async () => {
    const count = vi.fn().mockResolvedValue(4);
    const db = { operation: { count } } as unknown as PrismaClient;

    await expect(getThreatActorUsageCount(db, "actor-1")).resolves.toBe(4);
    expect(count).toHaveBeenCalledWith({ where: { threatActorId: "actor-1" } });
  });

  it("counts target usage via operations and techniques", async () => {
    const operationCount = vi.fn().mockResolvedValue(2);
    const techniqueCount = vi.fn().mockResolvedValue(3);
    const db = {
      operation: { count: operationCount },
      techniqueTarget: { count: techniqueCount },
    } as unknown as PrismaClient;

    await expect(getTargetUsageCount(db, "target-1")).resolves.toBe(5);
    expect(operationCount).toHaveBeenCalledWith({ where: { targets: { some: { id: "target-1" } } } });
    expect(techniqueCount).toHaveBeenCalledWith({ where: { targetId: "target-1" } });
  });

  it("counts tag usage via operations", async () => {
    const count = vi.fn().mockResolvedValue(6);
    const db = { operation: { count } } as unknown as PrismaClient;

    await expect(getTagUsageCount(db, "tag-1")).resolves.toBe(6);
    expect(count).toHaveBeenCalledWith({ where: { tags: { some: { id: "tag-1" } } } });
  });

  it("counts tool category usage via tools", async () => {
    const count = vi.fn().mockResolvedValue(5);
    const db = { tool: { count } } as unknown as PrismaClient;

    await expect(getToolCategoryUsageCount(db, "cat-1")).resolves.toBe(5);
    expect(count).toHaveBeenCalledWith({ where: { categoryId: "cat-1" } });
  });

  it("sums offensive and defensive tool usage", async () => {
    const techniqueCount = vi.fn().mockResolvedValue(3);
    const outcomeCount = vi.fn().mockResolvedValue(7);
    const db = { technique: { count: techniqueCount }, outcome: { count: outcomeCount } } as unknown as PrismaClient;

    await expect(getToolUsageCount(db, "tool-1")).resolves.toBe(10);
    expect(techniqueCount).toHaveBeenCalledWith({ where: { tools: { some: { id: "tool-1" } } } });
    expect(outcomeCount).toHaveBeenCalledWith({ where: { tools: { some: { id: "tool-1" } } } });
  });
});
