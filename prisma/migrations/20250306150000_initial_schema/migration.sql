-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "lastLogin" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'VIEWER'
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MitreTactic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MitreTechnique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "tacticId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MitreTechnique_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "MitreTactic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MitreSubTechnique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "techniqueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MitreSubTechnique_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "MitreTechnique" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThreatActor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "topThreat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrownJewel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#00ff41',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToolCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tool_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ToolCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "threatActorId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'EVERYONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Operation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Operation_threatActorId_fkey" FOREIGN KEY ("threatActorId") REFERENCES "ThreatActor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationAccessGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationAccessGroup_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OperationAccessGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "sourceIp" TEXT,
    "targetSystem" TEXT,
    "crownJewelTargeted" BOOLEAN NOT NULL DEFAULT false,
    "crownJewelCompromised" BOOLEAN NOT NULL DEFAULT false,
    "executedSuccessfully" BOOLEAN,
    "operationId" INTEGER NOT NULL,
    "mitreTechniqueId" TEXT,
    "mitreSubTechniqueId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Technique_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Technique_mitreTechniqueId_fkey" FOREIGN KEY ("mitreTechniqueId") REFERENCES "MitreTechnique" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Technique_mitreSubTechniqueId_fkey" FOREIGN KEY ("mitreSubTechniqueId") REFERENCES "MitreSubTechnique" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detectionTime" DATETIME,
    "notes" TEXT,
    "screenshotUrl" TEXT,
    "logData" TEXT,
    "techniqueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Outcome_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttackFlowLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" INTEGER NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttackFlowLayout_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MitreTechniqueToThreatActor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MitreTechniqueToThreatActor_A_fkey" FOREIGN KEY ("A") REFERENCES "MitreTechnique" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MitreTechniqueToThreatActor_B_fkey" FOREIGN KEY ("B") REFERENCES "ThreatActor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_OperationCrownJewels" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_OperationCrownJewels_A_fkey" FOREIGN KEY ("A") REFERENCES "CrownJewel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OperationCrownJewels_B_fkey" FOREIGN KEY ("B") REFERENCES "Operation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_OutcomeLogSources" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OutcomeLogSources_A_fkey" FOREIGN KEY ("A") REFERENCES "LogSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OutcomeLogSources_B_fkey" FOREIGN KEY ("B") REFERENCES "Outcome" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_OperationTags" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OperationTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Operation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OperationTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TechniqueTools" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TechniqueTools_A_fkey" FOREIGN KEY ("A") REFERENCES "Technique" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TechniqueTools_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_OutcomeTools" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OutcomeTools_A_fkey" FOREIGN KEY ("A") REFERENCES "Outcome" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OutcomeTools_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE INDEX "MitreTactic_name_idx" ON "MitreTactic"("name");

-- CreateIndex
CREATE INDEX "MitreTechnique_tacticId_idx" ON "MitreTechnique"("tacticId");

-- CreateIndex
CREATE INDEX "MitreTechnique_name_idx" ON "MitreTechnique"("name");

-- CreateIndex
CREATE INDEX "MitreSubTechnique_techniqueId_idx" ON "MitreSubTechnique"("techniqueId");

-- CreateIndex
CREATE INDEX "MitreSubTechnique_name_idx" ON "MitreSubTechnique"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatActor_name_key" ON "ThreatActor"("name");

-- CreateIndex
CREATE INDEX "ThreatActor_name_idx" ON "ThreatActor"("name");

-- CreateIndex
CREATE INDEX "ThreatActor_topThreat_idx" ON "ThreatActor"("topThreat");

-- CreateIndex
CREATE UNIQUE INDEX "CrownJewel_name_key" ON "CrownJewel"("name");

-- CreateIndex
CREATE INDEX "CrownJewel_name_idx" ON "CrownJewel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE INDEX "Group_name_idx" ON "Group"("name");

-- CreateIndex
CREATE INDEX "UserGroup_userId_idx" ON "UserGroup"("userId");

-- CreateIndex
CREATE INDEX "UserGroup_groupId_idx" ON "UserGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_userId_groupId_key" ON "UserGroup"("userId", "groupId");

-- CreateIndex
CREATE INDEX "ToolCategory_type_idx" ON "ToolCategory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ToolCategory_name_type_key" ON "ToolCategory"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "Tool"("name");

-- CreateIndex
CREATE INDEX "Tool_type_categoryId_idx" ON "Tool"("type", "categoryId");

-- CreateIndex
CREATE INDEX "Tool_name_idx" ON "Tool"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LogSource_name_key" ON "LogSource"("name");

-- CreateIndex
CREATE INDEX "LogSource_name_idx" ON "LogSource"("name");

-- CreateIndex
CREATE INDEX "Operation_status_idx" ON "Operation"("status");

-- CreateIndex
CREATE INDEX "Operation_createdById_idx" ON "Operation"("createdById");

-- CreateIndex
CREATE INDEX "Operation_threatActorId_idx" ON "Operation"("threatActorId");

-- CreateIndex
CREATE INDEX "Operation_name_idx" ON "Operation"("name");

-- CreateIndex
CREATE INDEX "OperationAccessGroup_operationId_idx" ON "OperationAccessGroup"("operationId");

-- CreateIndex
CREATE INDEX "OperationAccessGroup_groupId_idx" ON "OperationAccessGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationAccessGroup_operationId_groupId_key" ON "OperationAccessGroup"("operationId", "groupId");

-- CreateIndex
CREATE INDEX "Technique_operationId_idx" ON "Technique"("operationId");

-- CreateIndex
CREATE INDEX "Technique_mitreTechniqueId_idx" ON "Technique"("mitreTechniqueId");

-- CreateIndex
CREATE INDEX "Technique_mitreSubTechniqueId_idx" ON "Technique"("mitreSubTechniqueId");

-- CreateIndex
CREATE INDEX "Outcome_techniqueId_idx" ON "Outcome"("techniqueId");

-- CreateIndex
CREATE INDEX "Outcome_type_status_idx" ON "Outcome"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttackFlowLayout_operationId_key" ON "AttackFlowLayout"("operationId");

-- CreateIndex
CREATE INDEX "AttackFlowLayout_operationId_idx" ON "AttackFlowLayout"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "_MitreTechniqueToThreatActor_AB_unique" ON "_MitreTechniqueToThreatActor"("A", "B");

-- CreateIndex
CREATE INDEX "_MitreTechniqueToThreatActor_B_index" ON "_MitreTechniqueToThreatActor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OperationCrownJewels_AB_unique" ON "_OperationCrownJewels"("A", "B");

-- CreateIndex
CREATE INDEX "_OperationCrownJewels_B_index" ON "_OperationCrownJewels"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OutcomeLogSources_AB_unique" ON "_OutcomeLogSources"("A", "B");

-- CreateIndex
CREATE INDEX "_OutcomeLogSources_B_index" ON "_OutcomeLogSources"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OperationTags_AB_unique" ON "_OperationTags"("A", "B");

-- CreateIndex
CREATE INDEX "_OperationTags_B_index" ON "_OperationTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TechniqueTools_AB_unique" ON "_TechniqueTools"("A", "B");

-- CreateIndex
CREATE INDEX "_TechniqueTools_B_index" ON "_TechniqueTools"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OutcomeTools_AB_unique" ON "_OutcomeTools"("A", "B");

-- CreateIndex
CREATE INDEX "_OutcomeTools_B_index" ON "_OutcomeTools"("B");

