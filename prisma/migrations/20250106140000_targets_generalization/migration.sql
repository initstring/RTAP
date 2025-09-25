-- Convert crown jewels to general targets and introduce per-technique target tracking

-- 1. Extend CrownJewel with crown flag, then rename to Target
ALTER TABLE "CrownJewel" ADD COLUMN "isCrownJewel" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CrownJewel" RENAME TO "Target";

ALTER TABLE "Target" RENAME CONSTRAINT "CrownJewel_pkey" TO "Target_pkey";
ALTER INDEX "CrownJewel_name_key" RENAME TO "Target_name_key";
ALTER INDEX "CrownJewel_name_idx" RENAME TO "Target_name_idx";

-- Preserve existing crown jewels as marked assets
UPDATE "Target" SET "isCrownJewel" = true;

-- Future inserts default to non-crown jewel, matching new schema defaults
ALTER TABLE "Target" ALTER COLUMN "isCrownJewel" SET DEFAULT false;

-- Add helper index for filtering crown jewels
CREATE INDEX IF NOT EXISTS "Target_isCrownJewel_idx" ON "Target" ("isCrownJewel");

-- 2. Rename the join table linking operations and crown jewels
ALTER TABLE "_OperationCrownJewels" RENAME TO "_OperationTargets";
ALTER TABLE "_OperationTargets" RENAME CONSTRAINT "_OperationCrownJewels_AB_pkey" TO "_OperationTargets_AB_pkey";
ALTER INDEX "_OperationCrownJewels_B_index" RENAME TO "_OperationTargets_B_index";

-- Flip join table column orientation so column "A" stores operation ids (int) and "B" stores target ids (text)
ALTER TABLE "_OperationTargets" DROP CONSTRAINT IF EXISTS "_OperationTargets_A_fkey";
ALTER TABLE "_OperationTargets" DROP CONSTRAINT IF EXISTS "_OperationTargets_B_fkey";

ALTER TABLE "_OperationTargets" ADD COLUMN "operation_id_tmp" INTEGER;
ALTER TABLE "_OperationTargets" ADD COLUMN "target_id_tmp" TEXT;

UPDATE "_OperationTargets"
SET
  "operation_id_tmp" = "B",
  "target_id_tmp" = "A";

ALTER TABLE "_OperationTargets" DROP CONSTRAINT "_OperationTargets_AB_pkey";
ALTER TABLE "_OperationTargets" DROP COLUMN "A";
ALTER TABLE "_OperationTargets" DROP COLUMN "B";

ALTER TABLE "_OperationTargets" ADD COLUMN "A" INTEGER;
ALTER TABLE "_OperationTargets" ADD COLUMN "B" TEXT;

UPDATE "_OperationTargets"
SET
  "A" = "operation_id_tmp",
  "B" = "target_id_tmp";

ALTER TABLE "_OperationTargets" ALTER COLUMN "A" SET NOT NULL;
ALTER TABLE "_OperationTargets" ALTER COLUMN "B" SET NOT NULL;

ALTER TABLE "_OperationTargets" DROP COLUMN "operation_id_tmp";
ALTER TABLE "_OperationTargets" DROP COLUMN "target_id_tmp";

ALTER TABLE "_OperationTargets"
  ADD CONSTRAINT "_OperationTargets_AB_pkey" PRIMARY KEY ("A", "B");

ALTER TABLE "_OperationTargets"
  ADD CONSTRAINT "_OperationTargets_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Operation" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_OperationTargets"
  ADD CONSTRAINT "_OperationTargets_B_fkey"
  FOREIGN KEY ("B") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Create the new TechniqueTarget bridge table
CREATE TABLE "TechniqueTarget" (
  "techniqueId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "wasCompromised" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechniqueTarget_pkey" PRIMARY KEY ("techniqueId", "targetId")
);

CREATE INDEX "TechniqueTarget_targetId_idx" ON "TechniqueTarget" ("targetId");

ALTER TABLE "TechniqueTarget"
  ADD CONSTRAINT "TechniqueTarget_techniqueId_fkey"
  FOREIGN KEY ("techniqueId") REFERENCES "Technique" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechniqueTarget"
  ADD CONSTRAINT "TechniqueTarget_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restore index on target column for many-to-many lookup parity
CREATE INDEX IF NOT EXISTS "_OperationTargets_B_index" ON "_OperationTargets" ("B");

-- 4. Migrate legacy technique crown jewel flags into per-target assignments
INSERT INTO "TechniqueTarget" ("techniqueId", "targetId", "wasCompromised", "createdAt", "updatedAt")
SELECT
  t."id" AS "techniqueId",
  ot."B" AS "targetId",
  COALESCE(t."crownJewelCompromised", false) AS "wasCompromised",
  t."createdAt",
  t."updatedAt"
FROM "Technique" t
JOIN "_OperationTargets" ot ON ot."A" = t."operationId"
WHERE t."crownJewelTargeted" = true;

-- 5. Drop legacy crown jewel boolean flags from Technique
ALTER TABLE "Technique" DROP COLUMN IF EXISTS "crownJewelTargeted";
ALTER TABLE "Technique" DROP COLUMN IF EXISTS "crownJewelCompromised";

-- 6. Ensure updatedAt columns align with Prisma expectations
