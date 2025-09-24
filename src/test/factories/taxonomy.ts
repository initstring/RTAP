export function buildTag(overrides: Partial<{ id: string; name: string; color: string }> = {}) {
  return {
    id: overrides.id ?? "tag-1",
    name: overrides.name ?? "Tag",
    color: overrides.color ?? "#888888",
  };
}

export function buildTarget(overrides: Partial<{ id: string; name: string; description?: string | null; isCrownJewel?: boolean }> = {}) {
  return {
    id: overrides.id ?? "target-1",
    name: overrides.name ?? "Target",
    description: overrides.description ?? null,
    isCrownJewel: overrides.isCrownJewel ?? false,
  };
}

export function buildThreatActor(overrides: Partial<{ id: string; name: string; description?: string | null }> = {}) {
  return {
    id: overrides.id ?? "threat-actor-1",
    name: overrides.name ?? "Threat Actor",
    description: overrides.description ?? null,
  };
}

export function buildTool(overrides: Partial<{ id: string; name: string; description?: string | null }> = {}) {
  return {
    id: overrides.id ?? "tool-1",
    name: overrides.name ?? "Tool",
    description: overrides.description ?? null,
  };
}

export function buildLogSource(overrides: Partial<{ id: string; name: string; description?: string | null }> = {}) {
  return {
    id: overrides.id ?? "log-1",
    name: overrides.name ?? "Log Source",
    description: overrides.description ?? null,
  };
}

export function buildGroup(overrides: Partial<{ id: string; name: string; members: { userId: string }[] }> = {}) {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Group",
    members: overrides.members ?? [],
  };
}

