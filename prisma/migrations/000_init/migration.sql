-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."ToolType" AS ENUM ('DEFENSIVE', 'OFFENSIVE');

-- CreateEnum
CREATE TYPE "public"."OperationStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."OperationVisibility" AS ENUM ('EVERYONE', 'GROUPS_ONLY');

-- CreateEnum
CREATE TYPE "public"."OutcomeType" AS ENUM ('DETECTION', 'PREVENTION', 'ATTRIBUTION');

-- CreateEnum
CREATE TYPE "public"."OutcomeStatus" AS ENUM ('NOT_APPLICABLE', 'MISSED', 'DETECTED', 'PREVENTED', 'ATTRIBUTED');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "lastLogin" TIMESTAMP(3),
    "role" "public"."UserRole" NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Authenticator" (
    "id" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MitreTactic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MitreTactic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MitreTechnique" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "tacticId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MitreTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MitreSubTechnique" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "techniqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MitreSubTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreatActor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "topThreat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatActor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CrownJewel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrownJewel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#00ff41',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ToolType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "public"."ToolType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LogSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Operation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."OperationStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "threatActorId" TEXT,
    "visibility" "public"."OperationVisibility" NOT NULL DEFAULT 'EVERYONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OperationAccessGroup" (
    "id" TEXT NOT NULL,
    "operationId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationAccessGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Technique" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "sourceIp" TEXT,
    "targetSystem" TEXT,
    "crownJewelTargeted" BOOLEAN NOT NULL DEFAULT false,
    "crownJewelCompromised" BOOLEAN NOT NULL DEFAULT false,
    "executedSuccessfully" BOOLEAN,
    "operationId" INTEGER NOT NULL,
    "mitreTechniqueId" TEXT,
    "mitreSubTechniqueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Outcome" (
    "id" TEXT NOT NULL,
    "type" "public"."OutcomeType" NOT NULL,
    "status" "public"."OutcomeStatus" NOT NULL,
    "detectionTime" TIMESTAMP(3),
    "notes" TEXT,
    "screenshotUrl" TEXT,
    "logData" TEXT,
    "techniqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttackFlowLayout" (
    "id" TEXT NOT NULL,
    "operationId" INTEGER NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttackFlowLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_MitreTechniqueToThreatActor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MitreTechniqueToThreatActor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_OperationCrownJewels" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_OperationCrownJewels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_OutcomeLogSources" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OutcomeLogSources_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_OperationTags" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OperationTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_TechniqueTools" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TechniqueTools_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_OutcomeTools" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OutcomeTools_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "public"."Authenticator"("credentialID");

-- CreateIndex
CREATE INDEX "MitreTactic_name_idx" ON "public"."MitreTactic"("name");

-- CreateIndex
CREATE INDEX "MitreTechnique_tacticId_idx" ON "public"."MitreTechnique"("tacticId");

-- CreateIndex
CREATE INDEX "MitreTechnique_name_idx" ON "public"."MitreTechnique"("name");

-- CreateIndex
CREATE INDEX "MitreSubTechnique_techniqueId_idx" ON "public"."MitreSubTechnique"("techniqueId");

-- CreateIndex
CREATE INDEX "MitreSubTechnique_name_idx" ON "public"."MitreSubTechnique"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatActor_name_key" ON "public"."ThreatActor"("name");

-- CreateIndex
CREATE INDEX "ThreatActor_name_idx" ON "public"."ThreatActor"("name");

-- CreateIndex
CREATE INDEX "ThreatActor_topThreat_idx" ON "public"."ThreatActor"("topThreat");

-- CreateIndex
CREATE UNIQUE INDEX "CrownJewel_name_key" ON "public"."CrownJewel"("name");

-- CreateIndex
CREATE INDEX "CrownJewel_name_idx" ON "public"."CrownJewel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "public"."Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "public"."Group"("name");

-- CreateIndex
CREATE INDEX "Group_name_idx" ON "public"."Group"("name");

-- CreateIndex
CREATE INDEX "UserGroup_userId_idx" ON "public"."UserGroup"("userId");

-- CreateIndex
CREATE INDEX "UserGroup_groupId_idx" ON "public"."UserGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_userId_groupId_key" ON "public"."UserGroup"("userId", "groupId");

-- CreateIndex
CREATE INDEX "ToolCategory_type_idx" ON "public"."ToolCategory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ToolCategory_name_type_key" ON "public"."ToolCategory"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "public"."Tool"("name");

-- CreateIndex
CREATE INDEX "Tool_type_categoryId_idx" ON "public"."Tool"("type", "categoryId");

-- CreateIndex
CREATE INDEX "Tool_name_idx" ON "public"."Tool"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LogSource_name_key" ON "public"."LogSource"("name");

-- CreateIndex
CREATE INDEX "LogSource_name_idx" ON "public"."LogSource"("name");

-- CreateIndex
CREATE INDEX "Operation_status_idx" ON "public"."Operation"("status");

-- CreateIndex
CREATE INDEX "Operation_createdById_idx" ON "public"."Operation"("createdById");

-- CreateIndex
CREATE INDEX "Operation_threatActorId_idx" ON "public"."Operation"("threatActorId");

-- CreateIndex
CREATE INDEX "Operation_name_idx" ON "public"."Operation"("name");

-- CreateIndex
CREATE INDEX "OperationAccessGroup_operationId_idx" ON "public"."OperationAccessGroup"("operationId");

-- CreateIndex
CREATE INDEX "OperationAccessGroup_groupId_idx" ON "public"."OperationAccessGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationAccessGroup_operationId_groupId_key" ON "public"."OperationAccessGroup"("operationId", "groupId");

-- CreateIndex
CREATE INDEX "Technique_operationId_idx" ON "public"."Technique"("operationId");

-- CreateIndex
CREATE INDEX "Technique_mitreTechniqueId_idx" ON "public"."Technique"("mitreTechniqueId");

-- CreateIndex
CREATE INDEX "Technique_mitreSubTechniqueId_idx" ON "public"."Technique"("mitreSubTechniqueId");

-- CreateIndex
CREATE INDEX "Outcome_techniqueId_idx" ON "public"."Outcome"("techniqueId");

-- CreateIndex
CREATE INDEX "Outcome_type_status_idx" ON "public"."Outcome"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttackFlowLayout_operationId_key" ON "public"."AttackFlowLayout"("operationId");

-- CreateIndex
CREATE INDEX "AttackFlowLayout_operationId_idx" ON "public"."AttackFlowLayout"("operationId");

-- CreateIndex
CREATE INDEX "_MitreTechniqueToThreatActor_B_index" ON "public"."_MitreTechniqueToThreatActor"("B");

-- CreateIndex
CREATE INDEX "_OperationCrownJewels_B_index" ON "public"."_OperationCrownJewels"("B");

-- CreateIndex
CREATE INDEX "_OutcomeLogSources_B_index" ON "public"."_OutcomeLogSources"("B");

-- CreateIndex
CREATE INDEX "_OperationTags_B_index" ON "public"."_OperationTags"("B");

-- CreateIndex
CREATE INDEX "_TechniqueTools_B_index" ON "public"."_TechniqueTools"("B");

-- CreateIndex
CREATE INDEX "_OutcomeTools_B_index" ON "public"."_OutcomeTools"("B");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MitreTechnique" ADD CONSTRAINT "MitreTechnique_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "public"."MitreTactic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MitreSubTechnique" ADD CONSTRAINT "MitreSubTechnique_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "public"."MitreTechnique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tool" ADD CONSTRAINT "Tool_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ToolCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Operation" ADD CONSTRAINT "Operation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Operation" ADD CONSTRAINT "Operation_threatActorId_fkey" FOREIGN KEY ("threatActorId") REFERENCES "public"."ThreatActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OperationAccessGroup" ADD CONSTRAINT "OperationAccessGroup_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OperationAccessGroup" ADD CONSTRAINT "OperationAccessGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Technique" ADD CONSTRAINT "Technique_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Technique" ADD CONSTRAINT "Technique_mitreTechniqueId_fkey" FOREIGN KEY ("mitreTechniqueId") REFERENCES "public"."MitreTechnique"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Technique" ADD CONSTRAINT "Technique_mitreSubTechniqueId_fkey" FOREIGN KEY ("mitreSubTechniqueId") REFERENCES "public"."MitreSubTechnique"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Outcome" ADD CONSTRAINT "Outcome_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "public"."Technique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttackFlowLayout" ADD CONSTRAINT "AttackFlowLayout_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MitreTechniqueToThreatActor" ADD CONSTRAINT "_MitreTechniqueToThreatActor_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."MitreTechnique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MitreTechniqueToThreatActor" ADD CONSTRAINT "_MitreTechniqueToThreatActor_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."ThreatActor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OperationCrownJewels" ADD CONSTRAINT "_OperationCrownJewels_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."CrownJewel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OperationCrownJewels" ADD CONSTRAINT "_OperationCrownJewels_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OutcomeLogSources" ADD CONSTRAINT "_OutcomeLogSources_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."LogSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OutcomeLogSources" ADD CONSTRAINT "_OutcomeLogSources_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Outcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OperationTags" ADD CONSTRAINT "_OperationTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OperationTags" ADD CONSTRAINT "_OperationTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TechniqueTools" ADD CONSTRAINT "_TechniqueTools_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Technique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TechniqueTools" ADD CONSTRAINT "_TechniqueTools_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OutcomeTools" ADD CONSTRAINT "_OutcomeTools_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Outcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OutcomeTools" ADD CONSTRAINT "_OutcomeTools_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

