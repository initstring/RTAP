"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "@/trpc/react";
import AttackMatrixComponent from "@features/shared/heatmap/attack-matrix";
import { Card, CardContent } from "@components/ui";
import { Segmented } from "@components/ui/segmented";
import { buildAnalyticsHeatmapData } from "@lib/heatmap/analyticsAdapter";
import { ExportToPngButton } from "@features/shared/export";

export default function AttackMatrix() {
  const [split, setSplit] = useState(true);
  const [opsOnly, setOpsOnly] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: metrics, isLoading } = api.analytics.coverage.techniqueMetrics.useQuery();
  const { data: allMitre = [] } = api.taxonomy.mitre.techniques.useQuery({});
  const { data: usedSubs = [] } = api.analytics.coverage.subTechniqueUsage.useQuery();
  const { data: subMetrics = [] } = api.analytics.coverage.subTechniqueMetrics.useQuery();

  const subIndex = useMemo(() => {
    const map = new Map<string, { id: string; name: string; executed?: boolean }[]>();
    allMitre.forEach(t => {
      map.set(
        t.id,
        (t.subTechniques ?? []).map(st => ({ id: st.id, name: st.name }))
      );
    });
    return map;
  }, [allMitre]);

  const rows = useMemo(() => {
    const list = metrics ?? [];
    const filtered = opsOnly ? list.filter(m => m.executed === true) : list;
    const base = buildAnalyticsHeatmapData(filtered);
    // Attach MITRE sub-techniques so expansion works in analytics view
    const usedSet = new Set(usedSubs.map(u => u.subTechniqueId));
    const metricMap = new Map(subMetrics.map(m => [m.subTechniqueId, m] as const));
    base.forEach(r => {
      const allSubs = subIndex.get(r.techniqueId) ?? [];
      const attach = opsOnly ? allSubs.filter(st => usedSet.has(st.id)) : allSubs;
      r.subTechs = attach.map(st => {
        const m = metricMap.get(st.id);
        return {
          ...st,
          executed: usedSet.has(st.id) || (m ? (m.executionCount ?? 0) > 0 : false),
          detectionRate: m?.detectionRate,
          preventionRate: m?.preventionRate,
          attributionRate: m?.attributionRate,
          detectionAvailable: m?.detectionAvailable ?? false,
          preventionAvailable: m?.preventionAvailable ?? false,
          attributionAvailable: m?.attributionAvailable ?? false,
        };
      });
    });
    // In ops-only + split view, hide technique rows that have sub-techniques but none executed
    if (opsOnly && split) {
      return base.filter(r => {
        const totalSubs = (subIndex.get(r.techniqueId) ?? []).length;
        const shownSubs = r.subTechs?.length ?? 0;
        // Keep row if technique executed even when no sub-techniques were
        // executed. We only want to hide a technique when it has sub-techniques
        // and neither the technique nor any sub-technique was executed.
        return totalSubs === 0 || shownSubs > 0 || !!r.executed || (r.executionCount ?? 0) > 0;
      });
    }
    return base;
  }, [metrics, opsOnly, split, subIndex, usedSubs, subMetrics]);
  if (isLoading) return <div className="flex justify-center items-center h-64 text-[var(--color-text-secondary)]">Loading technique metrics...</div>;
  return (
    <Card ref={cardRef} data-export-unbounded>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            options={[{ label: 'Executed In Operations', value: 'ops' }, { label: 'All ATT&CK', value: 'all' }]}
            value={opsOnly ? 'ops' : 'all'}
            onChange={(v) => setOpsOnly(v === 'ops')}
          />
          <ExportToPngButton
            targetRef={cardRef}
            fileName={`analytics-attack-matrix-${opsOnly ? 'operations' : 'all'}-view`}
            label="Export PNG"
          />
        </div>
        <AttackMatrixComponent
          rows={rows}
          mode="analytics"
          title="MITRE ATT&CK Technique Matrix"
          splitSubTechniques={split}
          onToggleSplit={setSplit}
        />
      </CardContent>
    </Card>
  );
}

export { AttackMatrix };
