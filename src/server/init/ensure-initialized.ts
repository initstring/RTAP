import type { PrismaClient } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { logger } from "@/server/logger";
import {
  getMitreMetadata,
  getMitreTactics,
  getMitreTechniques,
  getMitreSubTechniques,
} from "@/lib/mitreStix";

let initPromise: Promise<void> | null = null;

export function ensureInitialized(db: PrismaClient): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1) Ensure the bootstrap admin exists (every init, no auto-provisioning outside env)
    const defaultEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? "admin@example.com";
    await db.user.upsert({
      where: { email: defaultEmail },
      update: { role: UserRole.ADMIN },
      create: {
        email: defaultEmail,
        name: "Admin User",
        role: UserRole.ADMIN,
      },
    });

    // 2) Ensure MITRE data exists
    const tacticCount = await db.mitreTactic.count();
    if (tacticCount === 0) {
      const meta = getMitreMetadata();
      logger.info(`[init] Seeding MITRE ATT&CK ${meta.name} v${meta.version}`);

      const tactics = getMitreTactics();
      const techniques = getMitreTechniques();
      const subTechniques = getMitreSubTechniques();

      // Upsert tactics
      for (const t of tactics) {
        await db.mitreTactic.upsert({ where: { id: t.id }, update: {}, create: t });
      }

      // Upsert techniques (validate tactic exists from above)
      const validTacticIds = new Set(tactics.map((t) => t.id));
      const insertedTechniqueIds = new Set<string>();
      for (const tech of techniques) {
        if (!validTacticIds.has(tech.tacticId)) continue;
        await db.mitreTechnique.upsert({ where: { id: tech.id }, update: {}, create: tech });
        insertedTechniqueIds.add(tech.id);
      }

      // Upsert sub-techniques
      for (const st of subTechniques) {
        if (!insertedTechniqueIds.has(st.techniqueId)) continue;
        await db.mitreSubTechnique.upsert({ where: { id: st.id }, update: {}, create: st });
      }

      logger.info(
        `[init] Seeded ${tactics.length} tactics, ${insertedTechniqueIds.size} techniques, ` +
        `${subTechniques.filter(st => insertedTechniqueIds.has(st.techniqueId)).length} sub-techniques`
      );
    }
  })();

  return initPromise;
}
