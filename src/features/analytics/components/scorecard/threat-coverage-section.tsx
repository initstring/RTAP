"use client";
// PR2 move: features/analytics/components/scorecard

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Crown, Shield, AlertTriangle } from "lucide-react";
import { ExportToPngButton } from "@features/shared/export";
import { ScorecardCardSkeleton } from "./scorecard-card-skeleton";

interface ThreatCoverageSectionProps {
  start: Date;
  end: Date;
  tagIds?: string[];
}

export function ThreatCoverageSection({ start, end, tagIds }: ThreatCoverageSectionProps) {
  const [scope, setScope] = useState<"all" | "assigned">("all");
  const threatCardRef = useRef<HTMLDivElement>(null);
  const crownCardRef = useRef<HTMLDivElement>(null);

  const operationsQuery = api.operations.list.useInfiniteQuery(
    { limit: 100, tagIds },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  );
  const {
    data: operationsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading: isOperationsLoading,
  } = operationsQuery;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const { data: threatActors } = api.taxonomy.threatActors.list.useQuery();
  const { data: targets } = api.taxonomy.targets.list.useQuery();

  const operations = useMemo(() => {
    const pages = operationsPages?.pages ?? [];
    const allOps = pages.flatMap((page) => page.operations);
    return allOps.filter((op) =>
      op.techniques?.some((tech) => {
        if (!tech.startTime) return false;
        const started = new Date(tech.startTime);
        return started >= start && started <= end;
      })
    );
  }, [operationsPages, start, end]);

  const threatActorStats = useMemo(() => {
    if (!threatActors) return [];
    return threatActors.map((actor) => {
      const known = new Set((actor.mitreTechniques ?? []).map((t) => t.id));
      const actorOps = operations.filter((op) => op.threatActorId === actor.id);
      const opsForResilience = scope === "assigned" ? actorOps : operations;

      let detSucc = 0,
        detTot = 0,
        prevSucc = 0,
        prevTot = 0,
        attrSucc = 0,
        attrTot = 0;
      opsForResilience.forEach((op) => {
        op.techniques?.forEach((tech) => {
          const relevant = known.size === 0 || (tech.mitreTechniqueId && known.has(tech.mitreTechniqueId));
          if (!relevant) return;
          tech.outcomes?.forEach((o) => {
            if (o.status === "NOT_APPLICABLE") return;
            if (o.type === "DETECTION") {
              detTot++;
              if (o.status === "DETECTED") detSucc++;
            } else if (o.type === "PREVENTION") {
              prevTot++;
              if (o.status === "PREVENTED") prevSucc++;
            } else if (o.type === "ATTRIBUTION") {
              attrTot++;
              if (o.status === "ATTRIBUTED") attrSucc++;
            }
          });
        });
      });

      const detRate = detTot > 0 ? Math.round((detSucc / detTot) * 100) : null;
      const prevRate = prevTot > 0 ? Math.round((prevSucc / prevTot) * 100) : null;
      const attrRate = attrTot > 0 ? Math.round((attrSucc / attrTot) * 100) : null;

      const opsForCoverage = scope === "assigned" ? actorOps : operations;
      const planned = new Set<string>();
      const executed = new Set<string>();
      opsForCoverage.forEach((op) => {
        op.techniques?.forEach((t) => {
          if (t.mitreTechniqueId && known.has(t.mitreTechniqueId)) {
            planned.add(t.mitreTechniqueId);
            if (t.startTime) executed.add(t.mitreTechniqueId);
          }
        });
      });
      const coveragePlannedPercent =
        known.size > 0 ? Math.round((planned.size / known.size) * 100) : null;
      const coverageExecutedPercent =
        known.size > 0 ? Math.round((executed.size / known.size) * 100) : null;

      return {
        id: actor.id,
        name: actor.name,
        topThreat: actor.topThreat,
        detectionRate: detRate,
        preventionRate: prevRate,
        attributionRate: attrRate,
        detectionCount: detTot,
        preventionCount: prevTot,
        attributionCount: attrTot,
        knownCount: known.size,
        plannedCount: planned.size,
        executedCount: executed.size,
        coveragePlannedPercent,
        coverageExecutedPercent,
      };
    });
  }, [threatActors, operations, scope]);

  const crownJewelStats = useMemo(() => {
    const crownJewels = targets?.filter((target) => target.isCrownJewel) ?? [];
    return crownJewels.map((jewel) => {
      const targetingOps = operations.filter((op) =>
        op.targets?.some((target) => target.id === jewel.id)
      );
      if (targetingOps.length === 0) {
        return {
          id: jewel.id,
          name: jewel.name,
          timesTargeted: 0,
          timesCompromised: 0,
          detectionRate: 0,
          preventionRate: 0,
          compromiseRate: 0,
          hasData: false,
        };
      }
      let detSucc = 0,
        detTot = 0,
        prevSucc = 0,
        prevTot = 0,
        attrSucc = 0,
        attrTot = 0,
        compromisedOps = 0;
      targetingOps.forEach((op) => {
        let compromised = false;
        op.techniques?.forEach((tech) => {
          const assignments = tech.targets?.filter((assignment) => assignment.targetId === jewel.id) ?? [];
          if (assignments.some((assignment) => assignment.wasCompromised)) compromised = true;
          tech.outcomes?.forEach((o) => {
            if (o.status === "NOT_APPLICABLE") return;
            if (o.type === "DETECTION") {
              detTot++;
              if (o.status === "DETECTED") detSucc++;
            } else if (o.type === "PREVENTION") {
              prevTot++;
              if (o.status === "PREVENTED") prevSucc++;
            } else if (o.type === "ATTRIBUTION") {
              attrTot++;
              if (o.status === "ATTRIBUTED") attrSucc++;
            }
          });
        });
        if (compromised) compromisedOps++;
      });
      const detectionRate = detTot > 0 ? Math.round((detSucc / detTot) * 100) : 0;
      const preventionRate = prevTot > 0 ? Math.round((prevSucc / prevTot) * 100) : 0;
      const attributionRate = attrTot > 0 ? Math.round((attrSucc / attrTot) * 100) : 0;
      const compromiseRate = Math.round((compromisedOps / targetingOps.length) * 100);
      return {
        id: jewel.id,
        name: jewel.name,
        timesTargeted: targetingOps.length,
        timesCompromised: compromisedOps,
        detectionRate,
        preventionRate,
        attributionRate,
        compromiseRate,
        hasData: true,
      };
    });
  }, [targets, operations]);

  const getRateColor = (rate: number | null) => {
    if (rate === null) return "text-[var(--color-text-muted)]";
    if (rate >= 70) return "text-[var(--status-success-fg)]";
    if (rate >= 40) return "text-[var(--status-warn-fg)]";
    return "text-[var(--status-error-fg)]";
  };

  const isLoading =
    isOperationsLoading ||
    isFetching ||
    isFetchingNextPage ||
    !operationsPages ||
    !threatActors ||
    !targets;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ScorecardCardSkeleton bodyLines={5} />
        <ScorecardCardSkeleton bodyLines={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card ref={threatCardRef}>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Threat Actor Resilience
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={scope === "all" ? "primary" : "secondary"}
                onClick={() => setScope("all")}
                data-export-include
              >
                All Operations
              </Button>
              <Button
                size="sm"
                variant={scope === "assigned" ? "primary" : "secondary"}
                onClick={() => setScope("assigned")}
                data-export-include
              >
                Assigned Ops Only
              </Button>
            </div>
            <ExportToPngButton
              targetRef={threatCardRef}
              fileName={`scorecard-threat-actors-${scope}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {threatActorStats.map((actor) => (
              <Card key={actor.id} variant="default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span>{actor.name}</span>
                    {actor.topThreat && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                        Top Threat
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 text-center">
                    <div className="space-y-1">
                      <div className={`text-xl font-semibold ${getRateColor(actor.detectionRate)}`}>
                        {actor.detectionRate ?? "N/A"}%
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        Detection ({actor.detectionCount})
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className={`text-xl font-semibold ${getRateColor(actor.preventionRate)}`}>
                        {actor.preventionRate ?? "N/A"}%
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        Prevention ({actor.preventionCount})
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className={`text-xl font-semibold ${getRateColor(actor.attributionRate)}`}>
                        {actor.attributionRate ?? "N/A"}%
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        Attribution ({actor.attributionCount})
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>Coverage</span>
                      {actor.coveragePlannedPercent !== null && (
                        <span>
                          {actor.plannedCount} planned ({actor.executedCount} executed) of {actor.knownCount} known
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
                      {actor.coveragePlannedPercent !== null && (
                        <div className="flex h-full">
                          <div
                            className="h-full"
                            style={{
                              width: `${actor.coverageExecutedPercent ?? 0}%`,
                              background: "var(--status-success-fg)",
                            }}
                          />
                          <div
                            className="h-full"
                            style={{
                              width: `${(actor.coveragePlannedPercent ?? 0) - (actor.coverageExecutedPercent ?? 0)}%`,
                              background: "var(--status-warn-fg)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {actor.coveragePlannedPercent !== null && (
                      <div className="flex justify-end gap-2 text-[10px] text-[var(--color-text-secondary)]">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[var(--status-success-fg)]" />
                          <span>Executed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[var(--status-warn-fg)]" />
                          <span>Planned</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {threatActorStats.length === 0 && (
              <div className="text-center py-8 text-[var(--color-text-muted)]">
                No threat actors configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card ref={crownCardRef}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Crown Jewel Attacks
          </CardTitle>
          <ExportToPngButton
            targetRef={crownCardRef}
            fileName="scorecard-crown-jewels"
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {crownJewelStats.map((jewel) => (
              <Card key={jewel.id} variant="default">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium flex-1">
                      {jewel.name}
                    </CardTitle>
                    {jewel.timesTargeted > 0 && jewel.compromiseRate > 50 && (
                      <AlertTriangle className="w-4 h-4 text-[var(--status-error-fg)]" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {jewel.hasData ? (
                    <div className="space-y-3">
                      {/* KPI rates first: Detection, Prevention, Attribution */}
                      <div className="grid grid-cols-3 text-center">
                        <div className="space-y-1">
                          <div className={`text-xl font-semibold ${getRateColor(jewel.detectionRate)}`}>
                            {jewel.detectionRate}%
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">Detection</div>
                        </div>
                        <div className="space-y-1">
                          <div className={`text-xl font-semibold ${getRateColor(jewel.preventionRate)}`}>
                            {jewel.preventionRate}%
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">Prevention</div>
                        </div>
                        <div className="space-y-1">
                          <div className={`text-xl font-semibold ${getRateColor(jewel.attributionRate ?? 0)}`}>
                            {jewel.attributionRate}%
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">Attribution</div>
                        </div>
                      </div>

                      {/* Attempts summary */}
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span>Attempts</span>
                        <span>
                          {jewel.timesCompromised} compromised of {jewel.timesTargeted} attempts
                        </span>
                      </div>

                      {/* Stacked bar: non-compromised vs compromised */}
                      <div className="h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
                        {jewel.timesTargeted > 0 && (
                          <div className="flex h-full">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.max(0, Math.round(((jewel.timesTargeted - jewel.timesCompromised) / jewel.timesTargeted) * 100))}%`,
                                background: "var(--status-success-fg)",
                              }}
                            />
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min(100, Math.round((jewel.timesCompromised / jewel.timesTargeted) * 100))}%`,
                                background: "var(--status-error-fg)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {jewel.timesTargeted > 0 && (
                        <div className="flex justify-end gap-2 text-[10px] text-[var(--color-text-secondary)]">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-[var(--status-success-fg)]" />
                            <span>Not Compromised</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-[var(--status-error-fg)]" />
                            <span>Compromised</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Shield className="w-6 h-6 text-[var(--color-text-muted)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--color-text-muted)]">Not yet tested</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {crownJewelStats.length === 0 && (
              <div className="text-center py-8 text-[var(--color-text-muted)]">
                No crown jewels configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
