import { TRPCError } from "@trpc/server";
import type { PrismaClient, ToolType } from "@prisma/client";

// Targets
export type CreateTargetDTO = { name: string; description: string; isCrownJewel?: boolean };
export type UpdateTargetDTO = { id: string; name?: string; description?: string; isCrownJewel?: boolean };

export async function createTarget(db: PrismaClient, dto: CreateTargetDTO) {
  return db.target.create({ data: { ...dto, isCrownJewel: dto.isCrownJewel ?? false } });
}

export async function updateTarget(db: PrismaClient, dto: UpdateTargetDTO) {
  const { id, isCrownJewel, ...data } = dto;
  return db.target.update({ where: { id }, data: { ...data, ...(isCrownJewel !== undefined ? { isCrownJewel } : {}) } });
}

export async function deleteTarget(db: PrismaClient, id: string) {
  const operationsCount = await db.operation.count({ where: { targets: { some: { id } } } });
  if (operationsCount > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot delete target: ${operationsCount} operation(s) are using this target` });
  }
  return db.target.delete({ where: { id } });
}

// Tags
export type CreateTagDTO = { name: string; description: string; color: string };
export type UpdateTagDTO = { id: string; name?: string; description?: string; color?: string };

export async function createTag(db: PrismaClient, dto: CreateTagDTO) {
  return db.tag.create({ data: dto });
}

export async function updateTag(db: PrismaClient, dto: UpdateTagDTO) {
  const { id, ...data } = dto;
  return db.tag.update({ where: { id }, data });
}

export async function deleteTag(db: PrismaClient, id: string) {
  const operationsCount = await db.operation.count({ where: { tags: { some: { id } } } });
  if (operationsCount > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot delete tag: ${operationsCount} operation(s) are using this tag` });
  }
  return db.tag.delete({ where: { id } });
}

// Tool Categories
export type CreateToolCategoryDTO = { name: string; type: ToolType };
export type UpdateToolCategoryDTO = { id: string; name?: string };

export async function createToolCategory(db: PrismaClient, dto: CreateToolCategoryDTO) {
  return db.toolCategory.create({ data: dto });
}

export async function updateToolCategory(db: PrismaClient, dto: UpdateToolCategoryDTO) {
  const { id, ...data } = dto;
  return db.toolCategory.update({ where: { id }, data });
}

export async function deleteToolCategory(db: PrismaClient, id: string) {
  const toolsCount = await db.tool.count({ where: { categoryId: id } });
  if (toolsCount > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot delete category: ${toolsCount} tool(s) are using this category` });
  }
  return db.toolCategory.delete({ where: { id } });
}

// Tools
export type CreateToolDTO = { name: string; categoryId: string; type: ToolType };
export type UpdateToolDTO = { id: string; name?: string; categoryId?: string; type?: ToolType };

export async function createTool(db: PrismaClient, dto: CreateToolDTO) {
  const category = await db.toolCategory.findFirst({ where: { id: dto.categoryId, type: dto.type } });
  if (!category) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid category for tool type" });
  return db.tool.create({ data: dto, include: { category: true } });
}

export async function updateTool(db: PrismaClient, dto: UpdateToolDTO) {
  const { id, categoryId, type, ...updateData } = dto;
  if (categoryId || type) {
    const tool = await db.tool.findUnique({ where: { id }, include: { category: true } });
    if (!tool) throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found" });
    const newType = type ?? tool.type;
    const newCategoryId = categoryId ?? tool.categoryId;
    const category = await db.toolCategory.findFirst({ where: { id: newCategoryId, type: newType } });
    if (!category) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid category for tool type" });
  }
  return db.tool.update({ where: { id }, data: { ...updateData, ...(categoryId && { categoryId }), ...(type && { type }) }, include: { category: true } });
}

export async function deleteTool(db: PrismaClient, id: string) {
  const [techniquesCount, outcomesCount] = await Promise.all([
    db.technique.count({ where: { tools: { some: { id } } } }),
    db.outcome.count({ where: { tools: { some: { id } } } }),
  ]);
  if (techniquesCount + outcomesCount > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot delete tool: ${techniquesCount} technique(s) and ${outcomesCount} outcome(s) are using this tool` });
  }
  return db.tool.delete({ where: { id } });
}

// Log Sources
export type CreateLogSourceDTO = { name: string; description: string };
export type UpdateLogSourceDTO = { id: string; name?: string; description?: string };

export async function createLogSource(db: PrismaClient, dto: CreateLogSourceDTO) {
  return db.logSource.create({ data: dto });
}

export async function updateLogSource(db: PrismaClient, dto: UpdateLogSourceDTO) {
  const { id, ...data } = dto;
  return db.logSource.update({ where: { id }, data });
}

export async function deleteLogSource(db: PrismaClient, id: string) {
  const outcomesCount = await db.outcome.count({ where: { logSources: { some: { id } } } });
  if (outcomesCount > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot delete log source: ${outcomesCount} outcome(s) are using this log source` });
  }
  return db.logSource.delete({ where: { id } });
}

