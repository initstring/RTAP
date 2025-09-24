import { OutcomeStatus, OutcomeType, OperationStatus } from "@prisma/client";
import type { MitreTactic, Prisma } from "@prisma/client";

export type CoverageTechnique = Prisma.TechniqueGetPayload<{
  include: {
    mitreTechnique: { include: { tactic: true } };
    operation: { select: { id: true; name: true; status: true } };
    outcomes: { include: { tools: true; logSources: true } };
    targetEngagements: { include: { target: true } };
  };
}>;

export type TechniqueWithSubTechnique = Prisma.TechniqueGetPayload<{
  include: {
    mitreSubTechnique: { include: { technique: { include: { tactic: true } } } };
    outcomes: { include: { tools: true; logSources: true } };
    targetEngagements: { include: { target: true } };
  };
}>;

const defaultTimestamp = () => new Date("2024-01-01T00:00:00.000Z");

export function buildMitreTactic(overrides: Partial<MitreTactic> = {}): MitreTactic {
  const now = defaultTimestamp();
  const base: MitreTactic = {
    id: "TA0001",
    name: "Initial Access",
    description: "Default tactic description",
    url: null,
    createdAt: now,
    updatedAt: now,
  };
  return { ...base, ...overrides };
}

export function buildCoverageOutcome(
  techniqueId: string,
  overrides: Partial<CoverageTechnique["outcomes"][number]> = {},
): CoverageTechnique["outcomes"][number] {
  const now = defaultTimestamp();
  const base: CoverageTechnique["outcomes"][number] = {
    id: `${techniqueId}-outcome`,
    type: OutcomeType.DETECTION,
    status: OutcomeStatus.MISSED,
    detectionTime: null,
    notes: null,
    screenshotUrl: null,
    logData: null,
    techniqueId,
    createdAt: now,
    updatedAt: now,
    tools: [],
    logSources: [],
  };
  return {
    ...base,
    ...overrides,
    techniqueId: overrides.techniqueId ?? techniqueId,
    tools: overrides.tools ?? base.tools,
    logSources: overrides.logSources ?? base.logSources,
  };
}

export function buildCoverageTechnique(
  overrides: Partial<CoverageTechnique> = {},
): CoverageTechnique {
  const now = defaultTimestamp();
  const techniqueId = overrides.id ?? "technique-1";
  const operationId = overrides.operationId ?? overrides.operation?.id ?? 1;
  const tacticOverrides = overrides.mitreTechnique?.tactic;
  const tacticBase = buildMitreTactic({
    id: tacticOverrides?.id ?? overrides.mitreTechnique?.tacticId ?? "TA0001",
    name: tacticOverrides?.name ?? "Initial Access",
    description: tacticOverrides?.description ?? "Default tactic description",
    url: tacticOverrides?.url ?? null,
  });
  const tactic = tacticOverrides ? { ...tacticBase, ...tacticOverrides } : tacticBase;

  const base: CoverageTechnique = {
    id: techniqueId,
    description: overrides.description ?? "Technique description",
    sortOrder: overrides.sortOrder ?? 0,
    startTime: overrides.startTime ?? null,
    endTime: overrides.endTime ?? null,
    sourceIp: overrides.sourceIp ?? null,
    targetSystem: overrides.targetSystem ?? null,
    executedSuccessfully: overrides.executedSuccessfully ?? null,
    operationId,
    mitreTechniqueId: overrides.mitreTechniqueId ?? overrides.mitreTechnique?.id ?? "T1566",
    mitreSubTechniqueId: overrides.mitreSubTechniqueId ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    operation: {
      id: overrides.operation?.id ?? operationId,
      name: overrides.operation?.name ?? "Operation",
      status: overrides.operation?.status ?? OperationStatus.PLANNING,
    },
    mitreTechnique: {
      id: overrides.mitreTechnique?.id ?? overrides.mitreTechniqueId ?? "T1566",
      name: overrides.mitreTechnique?.name ?? "Technique",
      description: overrides.mitreTechnique?.description ?? "Technique description",
      url: overrides.mitreTechnique?.url ?? null,
      tacticId: overrides.mitreTechnique?.tacticId ?? tactic.id,
      createdAt: overrides.mitreTechnique?.createdAt ?? now,
      updatedAt: overrides.mitreTechnique?.updatedAt ?? now,
      tactic,
    },
    outcomes: overrides.outcomes ?? [],
    targetEngagements: overrides.targetEngagements ?? [],
  };

  return {
    ...base,
    operation: overrides.operation ? { ...base.operation, ...overrides.operation } : base.operation,
    mitreTechnique: overrides.mitreTechnique
      ? {
          ...base.mitreTechnique,
          ...overrides.mitreTechnique,
          tactic:
            overrides.mitreTechnique.tactic !== undefined
              ? { ...tactic, ...overrides.mitreTechnique.tactic }
              : tactic,
        }
      : base.mitreTechnique,
    outcomes: overrides.outcomes ?? base.outcomes,
  };
}

export function buildTechniqueWithSubTechnique(
  overrides: Partial<TechniqueWithSubTechnique> = {},
): TechniqueWithSubTechnique {
  const now = defaultTimestamp();
  const techniqueId = overrides.id ?? "technique-1";
  const subTechniqueId = overrides.mitreSubTechniqueId ?? overrides.mitreSubTechnique?.id ?? "T2000.001";
  const tacticOverrides = overrides.mitreSubTechnique?.technique?.tactic;
  const tacticBase = buildMitreTactic({
    id: tacticOverrides?.id ?? overrides.mitreSubTechnique?.technique?.tacticId ?? "TA0001",
    name: tacticOverrides?.name ?? overrides.mitreSubTechnique?.technique?.tactic?.name ?? "Initial Access",
    description: tacticOverrides?.description ?? "Default tactic description",
    url: tacticOverrides?.url ?? null,
  });
  const tactic = tacticOverrides ? { ...tacticBase, ...tacticOverrides } : tacticBase;

  const techniqueOverrides = overrides.mitreSubTechnique?.technique;
  const techniqueBase = {
    id: techniqueOverrides?.id ?? overrides.mitreSubTechnique?.techniqueId ?? "T2000",
    name: techniqueOverrides?.name ?? "Base Technique",
    description: techniqueOverrides?.description ?? "Technique description",
    url: techniqueOverrides?.url ?? null,
    tacticId: techniqueOverrides?.tacticId ?? tactic.id,
    createdAt: techniqueOverrides?.createdAt ?? now,
    updatedAt: techniqueOverrides?.updatedAt ?? now,
    tactic,
  };

  const subTechniqueBase = {
    id: subTechniqueId,
    name: overrides.mitreSubTechnique?.name ?? "Sub Technique",
    description: overrides.mitreSubTechnique?.description ?? "Sub technique description",
    url: overrides.mitreSubTechnique?.url ?? null,
    techniqueId: overrides.mitreSubTechnique?.techniqueId ?? "T2000",
    createdAt: overrides.mitreSubTechnique?.createdAt ?? now,
    updatedAt: overrides.mitreSubTechnique?.updatedAt ?? now,
    technique: techniqueOverrides ? { ...techniqueBase, ...techniqueOverrides } : techniqueBase,
  };

  const base: TechniqueWithSubTechnique = {
    id: techniqueId,
    description: overrides.description ?? "Technique description",
    sortOrder: overrides.sortOrder ?? 0,
    startTime: overrides.startTime ?? null,
    endTime: overrides.endTime ?? null,
    sourceIp: overrides.sourceIp ?? null,
    targetSystem: overrides.targetSystem ?? null,
    executedSuccessfully: overrides.executedSuccessfully ?? null,
    operationId: overrides.operationId ?? 1,
    mitreTechniqueId: overrides.mitreTechniqueId ?? null,
    mitreSubTechniqueId: subTechniqueId,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    outcomes: overrides.outcomes ?? [],
    mitreSubTechnique: subTechniqueBase,
    targetEngagements: overrides.targetEngagements ?? [],
  };

  return {
    ...base,
    mitreSubTechnique: overrides.mitreSubTechnique
      ? {
          ...subTechniqueBase,
          ...overrides.mitreSubTechnique,
          technique:
            overrides.mitreSubTechnique.technique !== undefined
              ? {
                  ...techniqueBase,
                  ...overrides.mitreSubTechnique.technique,
                  tactic:
                    overrides.mitreSubTechnique.technique?.tactic !== undefined
                      ? { ...tactic, ...overrides.mitreSubTechnique.technique.tactic }
                      : tactic,
                }
              : techniqueBase,
        }
      : subTechniqueBase,
    outcomes: overrides.outcomes ?? base.outcomes,
  };
}
