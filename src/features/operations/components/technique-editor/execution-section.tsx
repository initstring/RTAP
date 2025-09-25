"use client";

/**
 * ExecutionSection
 * Timing, source/target details, offensive tools, and per-target outcomes.
 */

import { Badge, Input, Label, TimeRangePicker } from "@/components/ui";
import { Segmented } from "@/components/ui/segmented";
import TaxonomySelector from "./taxonomy-selector";
import { Clock, Wrench } from "lucide-react";

export interface ExecutionSectionProps {
  // Timing
  startTime: string;
  endTime: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;

  // Details
  sourceIp: string;
  onSourceIpChange: (value: string) => void;
  targetSystems: string;
  onTargetSystemsChange: (value: string) => void;

  // Offensive tools
  offensiveTools: Array<{ id: string; name: string; description?: string }>;
  selectedOffensiveToolIds: string[];
  onOffensiveToolIdsChange: (ids: string[]) => void;

  // Targets
  targets: Array<{ id: string; name: string; description: string; isCrownJewel: boolean }>;
  selectedTargetIds: string[];
  onTargetSelectionChange: (ids: string[]) => void;
  targetAssignments: Array<{ targetId: string; wasCompromised: boolean }>;
  onTargetOutcomeChange: (targetId: string, wasCompromised: boolean) => void;
  executionSuccess: string; // "yes" | "no" | ""
  onExecutionSuccessChange: (value: string) => void;
}

export default function ExecutionSection(props: ExecutionSectionProps) {
  const {
    startTime,
    endTime,
    onStartChange,
    onEndChange,
    sourceIp,
    onSourceIpChange,
    targetSystems,
    onTargetSystemsChange,
    offensiveTools,
    selectedOffensiveToolIds,
    onOffensiveToolIdsChange,
    targets,
    selectedTargetIds,
    onTargetSelectionChange,
    targetAssignments,
    onTargetOutcomeChange,
    executionSuccess,
    onExecutionSuccessChange,
  } = props;

  const assignmentMap = new Map(targetAssignments.map((assignment) => [assignment.targetId, assignment.wasCompromised]));
  const selectedTargets = selectedTargetIds
    .map((id) => {
      const target = targets.find((t) => t.id === id);
      if (!target) return null;
      return {
        ...target,
        wasCompromised: assignmentMap.get(id) ?? false,
      };
    })
    .filter((target): target is { id: string; name: string; description: string; isCrownJewel: boolean; wasCompromised: boolean } => Boolean(target));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Timing
        </h3>
        <TimeRangePicker
          startValue={startTime}
          endValue={endTime}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="executionSuccess">Technique Executed Successfully?</Label>
        <div className="flex items-center gap-2">
          {(["yes", "no"] as const).map(opt => {
            const selected = executionSuccess === opt;
            return (
              <Badge
                key={opt}
                variant={selected ? "default" : "secondary"}
                className="cursor-pointer hover:opacity-80"
                onClick={() => onExecutionSuccessChange(selected ? "" : opt)}
              >
                {opt === "yes" ? "Yes" : "No"}
              </Badge>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Execution Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sourceIp">Source IP</Label>
            <Input
              id="sourceIp"
              value={sourceIp}
              onChange={(e) => onSourceIpChange(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetSystems">Target Systems</Label>
            <Input
              id="targetSystems"
              value={targetSystems}
              onChange={(e) => onTargetSystemsChange(e.target.value)}
              placeholder="DC01, WS01, etc."
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <TaxonomySelector
          variant="tools"
          items={offensiveTools}
          selectedIds={selectedOffensiveToolIds}
          onSelectionChange={onOffensiveToolIdsChange}
          label="Offensive Tools Used"
          compactHeader
          searchable={false}
          multiple={true}
        />
      </div>

      <div>
        <TaxonomySelector
          variant="targets"
          items={targets}
          selectedIds={selectedTargetIds}
          onSelectionChange={onTargetSelectionChange}
          label="Targets"
          description="Select the assets this technique touched."
          compactHeader
          searchable={false}
          multiple
        />

        {selectedTargets.length > 0 && (
          <div className="mt-4 space-y-3">
            {selectedTargets.map((target) => (
              <div
                key={target.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)]"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    {target.name}
                    {target.isCrownJewel && <Badge variant="outline" className="text-[0.65rem] uppercase tracking-wide">Crown Jewel</Badge>}
                  </div>
                  {target.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{target.description}</p>
                  )}
                </div>
                <Segmented
                  options={[
                    { label: "Not Compromised", value: "no" },
                    { label: "Compromised", value: "yes" },
                  ]}
                  value={target.wasCompromised ? "yes" : "no"}
                  onChange={(value) => onTargetOutcomeChange(target.id, value === "yes")}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
