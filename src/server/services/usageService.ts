import type { PrismaClient } from "@prisma/client";

export async function getThreatActorUsageCount(db: PrismaClient, threatActorId: string): Promise<number> {
  return db.operation.count({ where: { threatActorId } });
}

export async function getCrownJewelUsageCount(db: PrismaClient, crownJewelId: string): Promise<number> {
  return db.operation.count({ where: { crownJewels: { some: { id: crownJewelId } } } });
}

export async function getTagUsageCount(db: PrismaClient, tagId: string): Promise<number> {
  return db.operation.count({ where: { tags: { some: { id: tagId } } } });
}

export async function getToolCategoryUsageCount(db: PrismaClient, categoryId: string): Promise<number> {
  return db.tool.count({ where: { categoryId } });
}

export async function getToolUsageCount(db: PrismaClient, toolId: string): Promise<number> {
  const [techniquesCount, outcomesCount] = await Promise.all([
    db.technique.count({ where: { tools: { some: { id: toolId } } } }),
    db.outcome.count({ where: { tools: { some: { id: toolId } } } }),
  ]);
  return techniquesCount + outcomesCount;
}
