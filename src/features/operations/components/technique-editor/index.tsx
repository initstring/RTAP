/**
 * Tabbed technique editor modal for comprehensive technique management
 * Supports both create and edit modes with searchable MITRE selection
 */

"use client";
// PR2 move: features/operations/components

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button, Card, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { X, FileText, Play, Target, Edit } from "lucide-react";
import { getCuratedShortDescription } from "@/lib/mitreDescriptionUtils";
import { useTechniqueEditorData, useTechniqueEditorForm } from "@/features/operations/hooks";
import type { TechniqueEditorFormValues } from "@/features/operations/hooks/useTechniqueEditorForm";
import type { SelectedTechnique } from "@/features/operations/techniqueEditor.types";
import OverviewSection from "./overview-section";
import ExecutionSection from "./execution-section";
import OutcomesSection from "./outcomes-section";

type Operation = RouterOutputs["operations"]["getById"];
type Technique = Operation["techniques"][number];

// type Technique = RouterOutputs["techniques"]["getById"]; // Unused

// SelectedTechnique moved to shared types for reuse across sections

interface Props {
  operationId: number;
  techniqueId?: string; // If provided, we're in edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TechniqueEditorModal({ 
  operationId,
  techniqueId,
  isOpen, 
  onClose, 
  onSuccess 
}: Props) {
  const isEditMode = !!techniqueId;
  // Delete is handled on the technique cards; no inline delete in modal
  const [selectedTechnique, setSelectedTechnique] = useState<SelectedTechnique | null>(null);
  
  // MITRE dropdown state
  const [selectedTacticId, setSelectedTacticId] = useState<string>("");
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>("");
  // Sub-technique is chosen implicitly when a sub-technique option is picked in the unified list

  // Fetch operation data (includes all techniques)
  const { data: operation } = api.operations.getById.useQuery(
    { id: operationId },
    { enabled: isOpen }
  );

  // Get existing technique data from operation (if in edit mode)
  const existingTechnique: Technique | undefined =
    isEditMode && techniqueId
      ? operation?.techniques?.find((technique) => technique.id === techniqueId)
      : undefined;

  // Centralized data for editor
  const editorData = useTechniqueEditorData({ isOpen, selectedTacticId });
  const tactics = editorData.tactics;
  const allTechniques = editorData.techniques;
  const offensiveTools = editorData.offensiveTools;
  const defensiveTools = editorData.defensiveTools;
  const logSources = editorData.logSources;

  // Load existing technique selection state when in edit mode
  useEffect(() => {
    if (existingTechnique && isEditMode && existingTechnique.mitreTechnique) {
      setSelectedTechnique({
        tactic: {
          id: existingTechnique.mitreTechnique.tactic.id,
          name: existingTechnique.mitreTechnique.tactic.name,
        },
        technique: {
          id: existingTechnique.mitreTechnique.id,
          name: existingTechnique.mitreTechnique.name,
          description: existingTechnique.mitreTechnique.description,
          url: existingTechnique.mitreTechnique.url ?? undefined,
        },
        subTechnique: existingTechnique.mitreSubTechnique
          ? {
              id: existingTechnique.mitreSubTechnique.id,
              name: existingTechnique.mitreSubTechnique.name,
              description: existingTechnique.mitreSubTechnique.description,
              url: existingTechnique.mitreSubTechnique.url ?? undefined,
            }
          : undefined,
      });
      setSelectedTacticId(existingTechnique.mitreTechnique.tactic.id);
      setSelectedTechniqueId(existingTechnique.mitreTechnique.id);
    }
  }, [existingTechnique, isEditMode]);

  // Form hook (RHF + Zod) and hydration
  const formHook = useTechniqueEditorForm({
    operationId,
    existingTechnique: isEditMode ? existingTechnique : undefined,
    onSuccess,
    onClose,
  });
  const form = formHook.form;

  // Ensure the unified technique combobox value reflects sub-technique after data loads
  const syncedFromExistingRef = useRef(false);
  
  // Memoized helper to update selected technique object
  const updateSelectedTechnique = useCallback((tacticId: string, techniqueId: string, subTechniqueId: string) => {
    if (!tacticId || !techniqueId) {
      setSelectedTechnique(null);
      return;
    }

    const tactic = tactics.find(t => t.id === tacticId);
    const technique = allTechniques.find((t) => t.id === techniqueId);
    const subTechnique = subTechniqueId
      ? technique?.subTechniques?.find((st) => st.id === subTechniqueId)
      : undefined;

    if (tactic && technique) {
      const selection: SelectedTechnique = {
        tactic: { id: tactic.id, name: tactic.name },
        technique: {
          id: technique.id,
          name: technique.name,
          description: technique.description,
          url: technique.url ?? undefined,
        },
        subTechnique: subTechnique ? {
          id: subTechnique.id,
          name: subTechnique.name,
          description: subTechnique.description,
          url: subTechnique.url ?? undefined,
        } : undefined,
      };

      setSelectedTechnique(selection);
    }
  }, [tactics, allTechniques]);
  useEffect(() => {
    if (!isEditMode || !existingTechnique?.mitreTechnique || allTechniques.length === 0) return;

    const desiredTacticId = existingTechnique.mitreTechnique.tactic.id;
    const desiredTechniqueId = existingTechnique.mitreTechnique.id;
    const desiredSubId = existingTechnique.mitreSubTechnique?.id ?? "";

    // If already in sync (showing sub-technique when present), do nothing
    const currentValueId = selectedTechnique?.subTechnique?.id ?? selectedTechniqueId;
    if (selectedTacticId === desiredTacticId && currentValueId === (desiredSubId || desiredTechniqueId)) {
      return;
    }

    // Avoid repeated syncing loops
    if (syncedFromExistingRef.current) return;
    syncedFromExistingRef.current = true;

    setSelectedTacticId(desiredTacticId);
    setSelectedTechniqueId(desiredTechniqueId);
    updateSelectedTechnique(desiredTacticId, desiredTechniqueId, desiredSubId);
  }, [
    isEditMode,
    existingTechnique?.id,
    existingTechnique?.mitreTechnique,
    existingTechnique?.mitreSubTechnique?.id,
    allTechniques.length,
    selectedTechnique?.subTechnique?.id,
    selectedTechniqueId,
    selectedTacticId,
    updateSelectedTechnique,
  ]);

  // Prepare combobox data with filtering
  const tacticOptions = useMemo(() => (
    tactics.map(tactic => ({
      value: tactic.id,
      label: `${tactic.id} - ${tactic.name}`,
      description: tactic.description?.substring(0, 100) + (tactic.description && tactic.description.length > 100 ? '...' : ''),
    }))
  ), [tactics]);

  // Filter techniques based on selected tactic, or show all if searching by technique first
  const { techniqueOptions, subToParentMap } = useMemo<{
    techniqueOptions: Array<{ value: string; label: string; description?: string }>;
    subToParentMap: Map<string, { parentId: string; tacticId: string }>;
  }>(() => {
    const list = selectedTacticId
      ? allTechniques.filter((t) => t.tacticId === selectedTacticId)
      : allTechniques;
    const map = new Map<string, { parentId: string; tacticId: string }>();
    const options = list.flatMap((technique) => {
      const base = [{
        value: technique.id,
        label: `${technique.id} - ${technique.name}`,
        description: getCuratedShortDescription(technique.id, technique.name, technique.description),
      }];
      const subs = (technique.subTechniques ?? []).map((st) => {
        map.set(st.id, { parentId: technique.id, tacticId: technique.tacticId });
        return {
          value: st.id,
          label: `↳ ${st.id} - ${st.name}`,
          description: getCuratedShortDescription(st.id, st.name, st.description),
        };
      });
      return [...base, ...subs];
    });
    return { techniqueOptions: options, subToParentMap: map };
  }, [selectedTacticId, allTechniques]);

  // Ensure a clean slate when closing the modal without saving
  const handleCancelClose = () => {
    setSelectedTechnique(null);
    setSelectedTacticId("");
    setSelectedTechniqueId("");
    form.reset();
    onClose();
  };

  // Also clear MITRE selection state whenever the modal closes (e.g., after save)
  useEffect(() => {
    if (!isOpen) {
      setSelectedTechnique(null);
      setSelectedTacticId("");
      setSelectedTechniqueId("");
      // Allow re-sync when opening in edit mode again
      syncedFromExistingRef.current = false;
    }
  }, [isOpen]);

  // Dropdown handlers for bidirectional filtering
  const handleTacticChange = (tacticId: string) => {
    setSelectedTacticId(tacticId);
    // Clear technique and sub-technique when changing tactic
    setSelectedTechniqueId("");
    updateSelectedTechnique(tacticId, "", "");
  };

  const handleTechniqueChange = (idOrSubId: string) => {
    // Determine if the selection is a sub-technique
    const parent = subToParentMap.get(idOrSubId);
    if (parent) {
      setSelectedTechniqueId(parent.parentId);
      if (!selectedTacticId) setSelectedTacticId(parent.tacticId);
      updateSelectedTechnique(parent.tacticId || selectedTacticId, parent.parentId, idOrSubId);
      return;
    }

    // Otherwise treat as a technique selection
    setSelectedTechniqueId(idOrSubId);
    if (!selectedTacticId) {
      const technique = allTechniques.find((t) => t.id === idOrSubId);
      if (technique) {
        setSelectedTacticId(technique.tacticId);
        updateSelectedTechnique(technique.tacticId, idOrSubId, "");
        return;
      }
    }

    updateSelectedTechnique(selectedTacticId, idOrSubId, "");
  };

  // Sub-technique picker removed; selection handled via unified technique combobox

  // Clear helpers for easy reset from the UI
  const clearTactic = () => {
    setSelectedTacticId("");
    setSelectedTechniqueId("");
    updateSelectedTechnique("", "", "");
  };

  const clearTechnique = () => {
    setSelectedTechniqueId("");
    updateSelectedTechnique(selectedTacticId, "", "");
  };

  // No separate sub-technique control; clearing occurs via technique selection or tactic clear

  // old non-memoized version removed

  // Helper function to handle outcomes after technique creation/update
  const submitWithValues: Parameters<typeof form.handleSubmit>[0] = (values) =>
    formHook.onSubmit(selectedTechnique, values);
  const handleSubmit = form.handleSubmit(submitWithValues);

  const startTimeValue = form.watch("startTime") ?? "";
  const hasExecutionStart = Boolean(startTimeValue.trim());
  const watchedTargetEngagements = form.watch("targetEngagements");
  const targetEngagements: TechniqueEditorFormValues["targetEngagements"] = useMemo(
    () => watchedTargetEngagements ?? [],
    [watchedTargetEngagements],
  );
  const execRaw = form.watch("executionSuccess") ?? "";
  const execSuccess: "" | "yes" | "no" = execRaw === "yes" ? "yes" : execRaw === "no" ? "no" : "";
  const isFormValid = Boolean(selectedTechnique) && form.formState.isValid;

  const targetLookup = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isCrownJewel: boolean }>();
    (operation?.targets ?? []).forEach((target) => {
      map.set(target.id, {
        id: target.id,
        name: target.name,
        isCrownJewel: target.isCrownJewel,
      });
    });

    (existingTechnique?.targetEngagements ?? []).forEach((engagement) => {
      if (map.has(engagement.targetId)) return;
      if (engagement.target) {
        map.set(engagement.targetId, {
          id: engagement.target.id,
          name: engagement.target.name,
          isCrownJewel: engagement.target.isCrownJewel,
        });
      }
    });

    return map;
  }, [operation?.targets, existingTechnique?.targetEngagements]);

  const selectedTargets = useMemo(
    () =>
      targetEngagements.map((engagement) => {
        const details = targetLookup.get(engagement.targetId);
        return {
          id: engagement.targetId,
          name: details?.name ?? "Unknown Target",
          isCrownJewel: details?.isCrownJewel ?? false,
          status: engagement.status,
        };
      }),
    [targetEngagements, targetLookup],
  );

  const handleTargetIdsChange = useCallback(
    (ids: string[]) => {
      const current = new Map(targetEngagements.map((engagement) => [engagement.targetId, engagement.status] as const));
      const next = ids.map((id) => ({ targetId: id, status: current.get(id) ?? "unknown" }));
      form.setValue("targetEngagements", next, { shouldDirty: true });
    },
    [form, targetEngagements],
  );

  const handleTargetStatusChange = useCallback(
    (targetId: string, status: "unknown" | "succeeded" | "failed") => {
      const next = targetEngagements.map((engagement) =>
        engagement.targetId === targetId ? { ...engagement, status } : engagement,
      );
      form.setValue("targetEngagements", next, { shouldDirty: true });
    },
    [form, targetEngagements],
  );

  useEffect(() => {
    if (hasExecutionStart) return;

    const outcomes = form.getValues("outcomes");
    if (outcomes.detection.state !== "N/A") {
      form.setValue("outcomes.detection.state", "N/A", { shouldDirty: true, shouldValidate: true });
    }
    if (outcomes.detection.time) {
      form.setValue("outcomes.detection.time", "", { shouldDirty: true, shouldValidate: true });
    }
    if (outcomes.detection.toolIds.length > 0) {
      form.setValue("outcomes.detection.toolIds", [], { shouldDirty: true, shouldValidate: true });
    }

    if (outcomes.prevention.state !== "N/A") {
      form.setValue("outcomes.prevention.state", "N/A", { shouldDirty: true, shouldValidate: true });
    }
    if (outcomes.prevention.toolIds.length > 0) {
      form.setValue("outcomes.prevention.toolIds", [], { shouldDirty: true, shouldValidate: true });
    }

    if (outcomes.attribution.state !== "N/A") {
      form.setValue("outcomes.attribution.state", "N/A", { shouldDirty: true, shouldValidate: true });
    }
    if (outcomes.attribution.time) {
      form.setValue("outcomes.attribution.time", "", { shouldDirty: true, shouldValidate: true });
    }
    if (outcomes.attribution.logSourceIds.length > 0) {
      form.setValue("outcomes.attribution.logSourceIds", [], { shouldDirty: true, shouldValidate: true });
    }
  }, [form, hasExecutionStart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card variant="elevated" className="w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-[var(--shadow-lg)]">
        <CardHeader className="border-b border-[var(--color-border)] pb-4">
            <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isEditMode ? <Edit className="w-5 h-5" /> : <Target className="w-5 h-5" />}
              {isEditMode ? "Edit Technique" : "Add Technique to Operation"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleCancelClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[75vh] overflow-y-auto">
            <Tabs defaultValue="overview">
              <TabsList surface="surface-elevated">
                <TabsTrigger value="overview" icon={<FileText className="w-4 h-4" />}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="execution" icon={<Play className="w-4 h-4" />}>
                  Execution
                </TabsTrigger>
                <TabsTrigger value="outcomes" icon={<Target className="w-4 h-4" />}>
                  Outcomes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" surface="surface-elevated" className="space-y-6">
                <OverviewSection
                  tacticOptions={tacticOptions}
                  techniqueOptions={techniqueOptions}
                  selectedTacticId={selectedTacticId}
                  selectedTechniqueValue={selectedTechnique?.subTechnique?.id ?? selectedTechniqueId}
                  onTacticChange={handleTacticChange}
                  onTechniqueChange={handleTechniqueChange}
                  clearTactic={clearTactic}
                  clearTechnique={clearTechnique}
                  selectedTechnique={selectedTechnique}
                  description={form.watch("description")}
                  onDescriptionChange={(value) => form.setValue("description", value, { shouldDirty: true, shouldValidate: true })}
                />
              </TabsContent>

              <TabsContent value="execution" surface="surface-elevated" className="space-y-6">
                <ExecutionSection
                  startTime={form.watch("startTime") ?? ""}
                  endTime={form.watch("endTime") ?? ""}
                  onStartChange={(value) => form.setValue("startTime", value, { shouldDirty: true, shouldValidate: true })}
                  onEndChange={(value) => form.setValue("endTime", value, { shouldDirty: true, shouldValidate: true })}
                  sourceIp={form.watch("sourceIp") ?? ""}
                  onSourceIpChange={(value) => form.setValue("sourceIp", value, { shouldDirty: true })}
                  targetSystems={form.watch("targetSystems") ?? ""}
                  onTargetSystemsChange={(value) => form.setValue("targetSystems", value, { shouldDirty: true })}
                  offensiveTools={offensiveTools.map(t => ({ id: t.id, name: t.name }))}
                  selectedOffensiveToolIds={form.watch("offensiveToolIds")}
                  onOffensiveToolIdsChange={(ids) => form.setValue("offensiveToolIds", ids, { shouldDirty: true })}
                  targets={operation?.targets?.map((target) => ({
                    id: target.id,
                    name: target.name,
                    description: target.description ?? "",
                    isCrownJewel: target.isCrownJewel,
                  }))}
                  selectedTargets={selectedTargets}
                  onTargetIdsChange={handleTargetIdsChange}
                  onTargetStatusChange={handleTargetStatusChange}
                  executionSuccess={execSuccess}
                  onExecutionSuccessChange={(value) => form.setValue("executionSuccess", value as "" | "yes" | "no", { shouldDirty: true })}
                />
              </TabsContent>

              <TabsContent value="outcomes" surface="surface-elevated" className="space-y-6">
                <OutcomesSection
                  executionRecorded={hasExecutionStart}
                  executionRequiredMessage="Add a start time in the Execution tab before recording detection, prevention, or attribution outcomes."
                  detection={form.watch("outcomes.detection.state")}
                  detectionTime={form.watch("outcomes.detection.time") ?? ""}
                  onDetectionChange={(value) => form.setValue("outcomes.detection.state", value as "yes" | "no" | "N/A", { shouldDirty: true, shouldValidate: true })}
                  onDetectionTimeChange={(value) => form.setValue("outcomes.detection.time", value, { shouldDirty: true, shouldValidate: true })}
                  defensiveTools={defensiveTools.map(t => ({ id: t.id, name: t.name }))}
                  selectedDetectionToolIds={form.watch("outcomes.detection.toolIds")}
                  onDetectionToolIdsChange={(ids) => form.setValue("outcomes.detection.toolIds", ids, { shouldDirty: true })}
                  prevention={form.watch("outcomes.prevention.state")}
                  onPreventionChange={(value) => form.setValue("outcomes.prevention.state", value as "yes" | "no" | "N/A", { shouldDirty: true, shouldValidate: true })}
                  selectedPreventionToolIds={form.watch("outcomes.prevention.toolIds")}
                  onPreventionToolIdsChange={(ids) => form.setValue("outcomes.prevention.toolIds", ids, { shouldDirty: true })}
                  attribution={form.watch("outcomes.attribution.state")}
                  attributionTime={form.watch("outcomes.attribution.time") ?? ""}
                  onAttributionChange={(value) => form.setValue("outcomes.attribution.state", value as "yes" | "no" | "N/A", { shouldDirty: true, shouldValidate: true })}
                  onAttributionTimeChange={(value) => form.setValue("outcomes.attribution.time", value, { shouldDirty: true, shouldValidate: true })}
                  logSources={logSources}
                  selectedLogSourceIds={form.watch("outcomes.attribution.logSourceIds")}
                  onLogSourceIdsChange={(ids) => form.setValue("outcomes.attribution.logSourceIds", ids, { shouldDirty: true })}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-between items-center gap-2 p-6 border-t border-[var(--color-border)]">
            {/* Delete action removed from modal; use per-card delete in operation detail */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || formHook.isSaving}
              variant="secondary"
            >
              {formHook.isSaving ? "Saving..." : isEditMode ? "Update" : "Create Technique"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
