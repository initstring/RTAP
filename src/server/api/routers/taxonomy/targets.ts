import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createTarget, updateTarget, deleteTarget } from "@/server/services/taxonomyService";
import { getTargetUsageCount } from "@/server/services/usageService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const targetsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.target.findMany({ orderBy: { name: "asc" } });
    const withUsage = await Promise.all(
      items.map(async (item) => ({
        ...item,
        usageCount: await getTargetUsageCount(ctx.db, item.id),
      })),
    );
    return withUsage;
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string(), isCrownJewel: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const target = await createTarget(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.target.create", { id: target.id, name: target.name, isCrownJewel: target.isCrownJewel }),
        "Target created",
      );
      return target;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), description: z.string().optional(), isCrownJewel: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await updateTarget(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.target.update", { id: input.id, name: updated.name, isCrownJewel: updated.isCrownJewel }),
        "Target updated",
      );
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteTarget(ctx.db, input.id);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.target.delete", { id: input.id, name: res.name }),
        "Target deleted",
      );
      return res;
    }),
});
