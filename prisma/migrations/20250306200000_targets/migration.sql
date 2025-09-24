-- Rename CrownJewel table to Target and preserve existing data
ALTER TABLE "CrownJewel" RENAME TO "Target";

-- Add crown jewel flag (defaults to false for legacy records)
ALTER TABLE "Target" ADD COLUMN "isCrownJewel" BOOLEAN NOT NULL DEFAULT false;

-- Drop legacy indexes before recreating them with the new names
DROP INDEX IF EXISTS "CrownJewel_name_key";
DROP INDEX IF EXISTS "CrownJewel_name_idx";

-- Recreate indexes with the expected Target names
CREATE UNIQUE INDEX IF NOT EXISTS "Target_name_key" ON "Target"("name");
CREATE INDEX IF NOT EXISTS "Target_name_idx" ON "Target"("name");
CREATE INDEX IF NOT EXISTS "Target_isCrownJewel_idx" ON "Target"("isCrownJewel");

-- Rename the join table that connects operations and targets
ALTER TABLE "_OperationCrownJewels" RENAME TO "_OperationTargets";

-- Drop the legacy join table indexes before recreating them
DROP INDEX IF EXISTS "_OperationCrownJewels_AB_unique";
DROP INDEX IF EXISTS "_OperationCrownJewels_B_index";

-- Recreate join table indexes under the new name
CREATE UNIQUE INDEX IF NOT EXISTS "_OperationTargets_AB_unique" ON "_OperationTargets"("A", "B");
CREATE INDEX IF NOT EXISTS "_OperationTargets_B_index" ON "_OperationTargets"("B");
