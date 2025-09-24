"use client";

/**
 * ExecutionSection
 * Timing, source/target details, offensive tools, crown jewel targeting.
 */

import { Badge, Input, Label, TimeRangePicker } from "@/components/ui";
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
  targets: Array<{ id: string; name: string; description: string; isCrownJewel?: boolean }> | undefined;
  selectedTargets: Array<{ id: string; name: string; isCrownJewel?: boolean; status: "unknown" | "succeeded" | "failed" }>;
  onTargetIdsChange: (ids: string[]) => void;
  onTargetStatusChange: (targetId: string, status: "unknown" | "succeeded" | "failed") => void;
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
    selectedTargets,
    onTargetIdsChange,
    onTargetStatusChange,
    executionSuccess,
    onExecutionSuccessChange,
  } = props;

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
          items={(targets ?? []).map((target) => ({ ...target }))}
          selectedIds={selectedTargets.map((target) => target.id)}
          onSelectionChange={onTargetIdsChange}
          label="Targets"
          description="Select assets this technique targeted. Crown jewels are flagged with a CJ badge."
          compactHeader
          searchable={false}
          multiple={true}
        />

        {selectedTargets.length > 0 && (
          <div className="space-y-4 mt-4">
            <Label>Target outcomes</Label>
            <div className="space-y-3">
              {selectedTargets.map((target) => {
                const statusOptions: Array<{
                  value: "succeeded" | "failed" | "unknown";
                  label: string;
                }> = [
                  { value: "succeeded", label: "Compromised" },
                  { value: "failed", label: "Not Compromised" },
                  { value: "unknown", label: "Not Recorded" },
                ];

                return (
                  <div
                    key={target.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{target.name}</span>
                      {target.isCrownJewel && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          CJ
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {statusOptions.map((option) => {
                        const selected = target.status === option.value;
                        return (
                          <Badge
                            key={option.value}
                            variant={selected ? "default" : "secondary"}
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => onTargetStatusChange(target.id, selected ? "unknown" : option.value)}
                          >
                            {option.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
