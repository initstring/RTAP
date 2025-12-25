"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Eye, Shield, UserCheck, X } from "lucide-react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { RouterOutputs } from "@/trpc/react";

type Operation = RouterOutputs["operations"]["getById"];
type Technique = Operation["techniques"][0] & { executedSuccessfully: boolean | null };

type TechniqueNodeData = {
  technique: Technique;
} & Record<string, unknown>;

export default function TechniqueNode({ data }: NodeProps<Node<TechniqueNodeData>>) {
  const { technique } = data;
  const isCompleted = technique.endTime !== null;
  const isInProgress = technique.startTime !== null && technique.endTime === null;
  const executionSuccess = technique.executedSuccessfully;
  const detectionRate = technique.outcomes.some(o => o.type === "DETECTION" && o.status === "DETECTED") ? 100 : 0;
  const preventionRate = technique.outcomes.some(o => o.type === "PREVENTION" && o.status === "PREVENTED") ? 100 : 0;
  const attributionRate = technique.outcomes.some(o => o.type === "ATTRIBUTION" && o.status === "ATTRIBUTED") ? 100 : 0;

  const getCardClassName = (): string => {
    const baseClasses = "w-60 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-grab active:cursor-grabbing";
    if (isCompleted) return `${baseClasses} border-2 border-[var(--color-accent)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.3)]`;
    if (isInProgress) return `${baseClasses} border-2 border-[var(--status-warn-fg)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:border-[var(--status-warn-fg)]`;
    return `${baseClasses} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-elevated)]`;
  };

  const formatDateTime = (d?: Date | string | null) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toLocaleString();
    } catch {
      return null;
    }
  };

  const startText = formatDateTime(technique.startTime);
  const endText = formatDateTime(technique.endTime);

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 !bg-[var(--color-accent)] !border !border-[var(--color-surface-elevated)] hover:!w-4 hover:!h-4 hover:!bg-[var(--color-accent)] transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ left: -12, zIndex: 10, borderRadius: '2px' }} />
      <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-[var(--color-accent)] !border !border-[var(--color-surface-elevated)] hover:!w-4 hover:!h-4 hover:!bg-[var(--color-accent)] transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ right: -12, zIndex: 10, borderRadius: '2px' }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-[var(--color-accent)] !border !border-[var(--color-surface-elevated)] hover:!w-4 hover:!h-4 hover:!bg-[var(--color-accent)] transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ top: -12, zIndex: 10, borderRadius: '2px' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-[var(--color-accent)] !border !border-[var(--color-surface-elevated)] hover:!w-4 hover:!h-4 hover:!bg-[var(--color-accent)] transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ bottom: -12, zIndex: 10, borderRadius: '2px' }} />

      <Card className={getCardClassName()}>
        <CardContent className="p-3 space-y-2 relative">
          <div className="-mx-3 -mt-3 px-3 py-2 rounded-t-[var(--radius-md)] bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] whitespace-normal break-words">
                    {technique.mitreSubTechnique?.name ?? technique.mitreTechnique?.name ?? 'Custom Technique'}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                    {technique.mitreSubTechnique?.id ?? technique.mitreTechnique?.id ?? 'CUSTOM'}
                  </span>
                </div>
                {technique.mitreTechnique?.tactic?.name && (
                  <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] truncate">
                    <span className="truncate">{technique.mitreTechnique.tactic.name}</span>
                    {technique.mitreTechnique.tactic.id && (
                      <span className="text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap">{technique.mitreTechnique.tactic.id}</span>
                    )}
                  </div>
                )}
              </div>
              {executionSuccess === true && <CheckCircle className="w-3 h-3 text-[var(--status-success-fg)] flex-shrink-0 mt-1" />}
              {executionSuccess === false && <X className="w-3 h-3 text-[var(--status-error-fg)] flex-shrink-0 mt-1" />}
            </div>
          </div>

          {technique.description && <div className="text-xs text-[var(--color-text-secondary)] leading-snug line-clamp-3">{technique.description}</div>}

          {(startText ?? endText) && (
            <div className="mt-1 space-y-0.5 text-[10px] text-[var(--color-text-muted)]">
              {startText && <div>Start: {startText}</div>}
              {endText && <div>End: {endText}</div>}
            </div>
          )}

          {(isInProgress || isCompleted) && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {technique.outcomes.some(o => o.type === "DETECTION") && (
                <Eye className={`w-3 h-3 ${detectionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
              )}
              {technique.outcomes.some(o => o.type === "PREVENTION") && (
                <Shield className={`w-3 h-3 ${preventionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
              )}
              {technique.outcomes.some(o => o.type === "ATTRIBUTION") && (
                <UserCheck className={`w-3 h-3 ${attributionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

