"use client";

import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import ConfirmModal from "@components/ui/confirm-modal";
import InlineActions from "@components/ui/inline-actions";
import { GripVertical, Clock, CheckCircle, Eye, Shield, Target as TargetIcon, UserCheck, X } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";

type Operation = RouterOutputs["operations"]["getById"];
type Technique = Operation["techniques"][0];

interface SortableTechniqueCardProps {
  technique: Technique;
  onEdit?: (id: string) => void;
  canEdit: boolean;
}

export default function SortableTechniqueCard({ technique, onEdit, canEdit }: SortableTechniqueCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = api.useUtils();
  const deleteTechnique = api.techniques.delete.useMutation({
    onSuccess: () => {
      void utils.operations.getById.invalidate({ id: technique.operationId });
      setShowDeleteConfirm(false);
    },
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: technique.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  const isCompleted = !!technique.endTime;
  const techniqueOutcomes = technique.outcomes;

  const detectionOutcome = techniqueOutcomes.find((o) => o.type === "DETECTION");
  const preventionOutcome = techniqueOutcomes.find((o) => o.type === "PREVENTION");
  const attributionOutcome = techniqueOutcomes.find((o) => o.type === "ATTRIBUTION");

  const getStatusLabel = (
    outcome: typeof detectionOutcome,
    type: "DETECTION" | "PREVENTION" | "ATTRIBUTION",
  ) => {
    if (!outcome || outcome.status === "NOT_APPLICABLE") return "N/A";
    if (outcome.status === "MISSED") {
      switch (type) {
        case "DETECTION":
          return "NOT DETECTED";
        case "PREVENTION":
          return "NOT PREVENTED";
        case "ATTRIBUTION":
          return "NOT ATTRIBUTED";
      }
    }
    return outcome.status;
  };

  const detectionStatus = getStatusLabel(detectionOutcome, "DETECTION");
  const preventionStatus = getStatusLabel(preventionOutcome, "PREVENTION");
  const attributionStatus = getStatusLabel(attributionOutcome, "ATTRIBUTION");

  const techniqueTargets = technique.targets ?? [];
  const compromisedTargets = techniqueTargets.filter((assignment) => assignment.wasCompromised);
  const crownJewelAssignments = techniqueTargets.filter((assignment) => assignment.target?.isCrownJewel);
  const hasCrownJewelTarget = crownJewelAssignments.length > 0;
  const crownJewelCompromised = crownJewelAssignments.some((assignment) => assignment.wasCompromised);

  return (
    <div ref={setNodeRef} style={style} className={`${isDragging ? "opacity-50" : ""}`}>
      <Card className={`${isCompleted ? "border-[var(--color-accent)]/30" : ""}`}>
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-3">
            <div
              {...(canEdit ? { ...attributes, ...listeners } : {})}
              className={`flex items-center justify-center w-6 h-6 text-[var(--color-text-muted)] ${canEdit ? "hover:text-[var(--color-accent)] cursor-grab active:cursor-grabbing" : "cursor-default opacity-60"} transition-colors mt-1`}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="mb-1">
                        <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {technique.mitreTechnique?.name ?? "Custom Technique"}
                          {technique.mitreSubTechnique && (
                            <span className="text-sm font-normal text-[var(--color-text-secondary)]">{" - "}{technique.mitreSubTechnique.name}</span>
                          )}
                          <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {" ("}
                            {technique.mitreSubTechnique?.id ?? technique.mitreTechnique?.id ?? "CUSTOM"}
                            {")"}
                          </span>
                        </span>
                      </div>
                      {technique.mitreTechnique?.tactic && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {technique.mitreTechnique.tactic.name} ({technique.mitreTechnique.tactic.id})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {technique.executedSuccessfully === true ? (
                        <CheckCircle className="w-5 h-5 text-[var(--status-success-fg)]" />
                      ) : technique.executedSuccessfully === false ? (
                        <X className="w-5 h-5 text-[var(--status-error-fg)]" />
                      ) : null}
                      {canEdit && (
                        <InlineActions onEdit={() => onEdit?.(technique.id)} onDelete={() => setShowDeleteConfirm(true)} />
                      )}
                    </div>
                  </div>

                  <div className="text-[var(--color-text-secondary)] mb-3">{technique.description}</div>

                  {(technique.startTime ?? technique.endTime) && (
                    <div className="flex items-center gap-4 mb-3 text-sm text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {technique.startTime && <span>Started: {new Date(technique.startTime).toLocaleString()}</span>}
                      </div>
                      {technique.endTime && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>Ended: {new Date(technique.endTime).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {techniqueTargets.length > 0 && (
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <TargetIcon className="w-3 h-3" />
                    <span>{techniqueTargets.length === 1 ? "1 target engaged" : `${techniqueTargets.length} targets engaged`}</span>
                    {compromisedTargets.length > 0 && (
                      <span className="text-[var(--color-error)]">
                        {compromisedTargets.length === 1
                          ? "1 compromised"
                          : `${compromisedTargets.length} compromised`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {techniqueTargets.map((assignment) => (
                      <Badge key={assignment.targetId} variant="secondary" className="flex items-center gap-2">
                        <span>{assignment.target?.name ?? "Unknown Target"}</span>
                        {assignment.target?.isCrownJewel && (
                          <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-1 text-[0.65rem] uppercase tracking-wide text-[var(--color-text-muted)]">
                            CJ
                          </span>
                        )}
                        {assignment.wasCompromised && (
                          <span className="text-[0.65rem] uppercase tracking-wide text-[var(--color-error)]">
                            Compromised
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {detectionStatus !== "N/A" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Eye className="w-3 h-3" />
                    <span
                      className={`font-medium ${
                        detectionStatus === "DETECTED" ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {detectionStatus === "DETECTED"
                        ? `Detected by ${detectionOutcome?.tools?.[0]?.name ?? "Unknown Tool"}`
                        : "Not Detected"}
                    </span>
                  </div>
                )}

                {preventionStatus !== "N/A" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Shield className="w-3 h-3" />
                    <span
                      className={`font-medium ${
                        preventionStatus === "PREVENTED" ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {preventionStatus === "PREVENTED"
                        ? `Prevented by ${preventionOutcome?.tools?.[0]?.name ?? "Unknown Tool"}`
                        : "Not Prevented"}
                    </span>
                  </div>
                )}

                {attributionOutcome && attributionOutcome.status !== "NOT_APPLICABLE" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <UserCheck className="w-3 h-3" />
                    <span
                      className={`font-medium ${
                        attributionStatus === "ATTRIBUTED" ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {attributionStatus === "ATTRIBUTED"
                        ? `Attributed in ${attributionOutcome?.logSources?.[0]?.name ?? "Unknown Log Source"}`
                        : "Not Attributed"}
                    </span>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {hasCrownJewelTarget && (
                    <Badge variant={crownJewelCompromised ? "error" : "secondary"} className="text-xs">
                      {crownJewelCompromised ? "Crown Jewel Compromised" : "Crown Jewel Targeted"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {canEdit && showDeleteConfirm && (
            <ConfirmModal
              open
              title="Delete technique?"
              description="Delete this technique and its outcomes? This cannot be undone."
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={() => deleteTechnique.mutate({ id: technique.id })}
              onCancel={() => setShowDeleteConfirm(false)}
              loading={deleteTechnique.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
