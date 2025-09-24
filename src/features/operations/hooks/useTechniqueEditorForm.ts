"use client";

/**
 * useTechniqueEditorForm
 * Centralizes RHF + Zod form, edit hydration, and create/update mutations
 * for techniques and their three outcomes (detection, prevention, attribution).
 */

import { z } from "zod";
import { useMemo, useEffect, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, type RouterOutputs } from "@/trpc/react";
import { logger } from "@/lib/logger";
import type { SelectedTechnique } from "@/features/operations/techniqueEditor.types";

const OutcomeStateSchema = z.union([z.literal("yes"), z.literal("no"), z.literal("N/A")]);
const TargetEngagementStatusSchema = z.union([
  z.literal("unknown"),
  z.literal("succeeded"),
  z.literal("failed"),
]);

export const TechniqueEditorFormSchema = z.object({
  description: z.string().default(""),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  sourceIp: z.string().optional(),
  targetSystems: z.string().optional(),
  offensiveToolIds: z.array(z.string()).default([]),
  targetEngagements: z
    .array(
      z.object({
        targetId: z.string(),
        status: TargetEngagementStatusSchema,
      }),
    )
    .default([]),
  executionSuccess: z.union([z.literal("yes"), z.literal("no"), z.literal("")]).default(""),
  outcomes: z.object({
    detection: z.object({ state: OutcomeStateSchema.default("N/A"), time: z.string().optional(), toolIds: z.array(z.string()).default([]) }),
    prevention: z.object({ state: OutcomeStateSchema.default("N/A"), toolIds: z.array(z.string()).default([]) }),
    attribution: z.object({ state: OutcomeStateSchema.default("N/A"), time: z.string().optional(), logSourceIds: z.array(z.string()).default([]) }),
  }),
}).superRefine((val, ctx) => {
  if (val.startTime && val.endTime) {
    const s = new Date(val.startTime);
    const e = new Date(val.endTime);
    if (e < s) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "End time cannot be before start time" });
  }
  if (val.outcomes.detection.state === "yes" && !val.outcomes.detection.time) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "detection", "time"], message: "Detection time is required when detection is 'Yes'" });
  }
  if (val.outcomes.attribution.state === "yes" && !val.outcomes.attribution.time) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "attribution", "time"], message: "Attribution time is required when attribution is 'Yes'" });
  }
  const hasStartTime = Boolean(val.startTime?.trim().length);
  if (!hasStartTime) {
    const message = "Record a start time before logging defensive outcomes.";
    if (val.outcomes.detection.state !== "N/A") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "detection", "state"], message });
    }
    if (val.outcomes.detection.time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "detection", "time"], message });
    }
    if (val.outcomes.detection.toolIds.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "detection", "toolIds"], message });
    }
    if (val.outcomes.prevention.state !== "N/A") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "prevention", "state"], message });
    }
    if (val.outcomes.prevention.toolIds.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "prevention", "toolIds"], message });
    }
    if (val.outcomes.attribution.state !== "N/A") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "attribution", "state"], message });
    }
    if (val.outcomes.attribution.time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "attribution", "time"], message });
    }
    if (val.outcomes.attribution.logSourceIds.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["outcomes", "attribution", "logSourceIds"], message });
    }
  }
});

export type TechniqueEditorFormValues = z.infer<typeof TechniqueEditorFormSchema>;

export function useTechniqueEditorForm(params: {
  operationId: number;
  existingTechnique?: RouterOutputs["operations"]["getById"]["techniques"][number] & { executedSuccessfully: boolean | null };
  onSuccess?: () => void;
  onClose: () => void;
}) {
  const { operationId, existingTechnique, onSuccess, onClose } = params;

  const defaultValues = useMemo<TechniqueEditorFormValues>(() => {
    const fmt = (d?: Date | string | null) => {
      if (!d) return "";
      const date = new Date(d);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day}T${h}:${min}`;
    };

    if (!existingTechnique) {
      return {
        description: "",
        startTime: "",
        endTime: "",
        sourceIp: "",
        targetSystems: "",
        offensiveToolIds: [],
        targetEngagements: [],
        executionSuccess: "",
        outcomes: {
          detection: { state: "N/A", time: "", toolIds: [] },
          prevention: { state: "N/A", toolIds: [] },
          attribution: { state: "N/A", time: "", logSourceIds: [] },
        },
      };
    }

    const detection = existingTechnique.outcomes?.find((o) => o.type === "DETECTION");
    const prevention = existingTechnique.outcomes?.find((o) => o.type === "PREVENTION");
    const attribution = existingTechnique.outcomes?.find((o) => o.type === "ATTRIBUTION");

    const engagementStatus = (value: boolean | null | undefined): "unknown" | "succeeded" | "failed" => {
      if (value === true) return "succeeded";
      if (value === false) return "failed";
      return "unknown";
    };

    return {
      description: existingTechnique.description ?? "",
      startTime: fmt(existingTechnique.startTime ?? undefined),
      endTime: fmt(existingTechnique.endTime ?? undefined),
      sourceIp: existingTechnique.sourceIp ?? "",
      targetSystems: existingTechnique.targetSystem ?? "",
      offensiveToolIds: existingTechnique.tools?.map((t) => t.id) ?? [],
      targetEngagements:
        existingTechnique.targetEngagements?.map((engagement) => ({
          targetId: engagement.targetId,
          status: engagementStatus(engagement.wasSuccessful),
        })) ?? [],
      executionSuccess: existingTechnique.executedSuccessfully == null ? "" : existingTechnique.executedSuccessfully ? "yes" : "no",
      outcomes: {
        detection: {
          state: detection ? (detection.status === "NOT_APPLICABLE" ? "N/A" : detection.status === "DETECTED" ? "yes" : "no") : "N/A",
          time: detection?.detectionTime ? fmt(detection.detectionTime) : "",
          toolIds: detection?.tools?.map((t) => t.id) ?? [],
        },
        prevention: {
          state: prevention ? (prevention.status === "NOT_APPLICABLE" ? "N/A" : prevention.status === "PREVENTED" ? "yes" : "no") : "N/A",
          toolIds: prevention?.tools?.map((t) => t.id) ?? [],
        },
        attribution: {
          state: attribution ? (attribution.status === "NOT_APPLICABLE" ? "N/A" : attribution.status === "ATTRIBUTED" ? "yes" : "no") : "N/A",
          time: attribution?.detectionTime ? fmt(attribution.detectionTime) : "",
          logSourceIds: attribution?.logSources?.map((l) => l.id) ?? [],
        },
      },
    };
  }, [existingTechnique]);

  const form = useForm<TechniqueEditorFormValues>({
    defaultValues,
    resolver: zodResolver(TechniqueEditorFormSchema) as unknown as Resolver<TechniqueEditorFormValues>,
    mode: "onChange",
  });

  const hydratedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = existingTechnique?.id ?? "create";
    if (hydratedKeyRef.current === key) return;
    form.reset(defaultValues);
    hydratedKeyRef.current = key;
    void form.trigger();
  }, [existingTechnique?.id, defaultValues, form]);

  const utils = api.useUtils();
  const createTechnique = api.techniques.create.useMutation();
  const updateTechnique = api.techniques.update.useMutation();
  const createOutcome = api.outcomes.create.useMutation();
  const updateOutcome = api.outcomes.update.useMutation();

  const isSaving = createTechnique.isPending || updateTechnique.isPending || createOutcome.isPending || updateOutcome.isPending;

  async function handleOutcomes(techniqueId: string, values: TechniqueEditorFormValues) {
    const existingOutcomes = existingTechnique?.outcomes ?? [];

    const upsert = async (
      type: "DETECTION" | "PREVENTION" | "ATTRIBUTION",
      state: "yes" | "no" | "N/A",
      timeStr?: string,
      toolIds?: string[],
      logSourceIds?: string[]
    ) => {
      const current = existingOutcomes.find((o) => o.type === type);
      if (state === "N/A") {
        if (current && existingTechnique) {
          await updateOutcome.mutateAsync({ id: current.id, status: "NOT_APPLICABLE", detectionTime: undefined, toolIds: [], logSourceIds: [] });
        }
        return;
      }
      const status = state === "yes" ? (type === "DETECTION" ? "DETECTED" : type === "PREVENTION" ? "PREVENTED" : "ATTRIBUTED") : "MISSED";
      const detectionTime = state === "yes" && timeStr ? new Date(timeStr) : undefined;
      if (current) {
        await updateOutcome.mutateAsync({ id: current.id, status, detectionTime, toolIds, logSourceIds });
      } else {
        await createOutcome.mutateAsync({ techniqueId, type, status, detectionTime, toolIds, logSourceIds });
      }
    };

    await Promise.all([
      upsert("DETECTION", values.outcomes.detection.state, values.outcomes.detection.time, values.outcomes.detection.toolIds, []),
      upsert("PREVENTION", values.outcomes.prevention.state, undefined, values.outcomes.prevention.toolIds, []),
      upsert("ATTRIBUTION", values.outcomes.attribution.state, values.outcomes.attribution.time, [], values.outcomes.attribution.logSourceIds),
    ]);

    await Promise.all([utils.operations.invalidate(), utils.techniques.invalidate(), utils.outcomes.invalidate()]);
  }

  async function submit(selected: SelectedTechnique | null, values: TechniqueEditorFormValues) {
    if (!selected) return;
    const startTimeValue = values.startTime?.trim() ? new Date(values.startTime) : undefined;
    const endTimeValue = values.endTime?.trim() ? new Date(values.endTime) : undefined;
    const targetEngagementsPayload = values.targetEngagements.map((engagement) => ({
      targetId: engagement.targetId,
      status: engagement.status,
    }));
    const base = {
      mitreTechniqueId: selected.technique.id,
      mitreSubTechniqueId: selected.subTechnique?.id,
      description: values.description,
      sourceIp: values.sourceIp ?? undefined,
      targetSystem: values.targetSystems ?? undefined,
      toolIds: values.offensiveToolIds,
      executedSuccessfully: values.executionSuccess === "" ? undefined : values.executionSuccess === "yes",
      targetEngagements: targetEngagementsPayload,
    } as const;

    try {
      if (existingTechnique) {
        await updateTechnique.mutateAsync({
          id: existingTechnique.id,
          ...base,
          mitreSubTechniqueId: selected.subTechnique?.id ?? null,
          startTime: startTimeValue ?? null,
          endTime: endTimeValue ?? null,
          executedSuccessfully: values.executionSuccess === "" ? null : values.executionSuccess === "yes",
        });
        await handleOutcomes(existingTechnique.id, values);
      } else {
        const created = await createTechnique.mutateAsync({
          operationId,
          ...base,
          startTime: startTimeValue,
          endTime: endTimeValue,
          executedSuccessfully: values.executionSuccess === "" ? undefined : values.executionSuccess === "yes",
        });
        await handleOutcomes(created.id, values);
      }

      await utils.operations.getById.invalidate({ id: operationId });
      onSuccess?.();
      onClose();
      form.reset(defaultValues);
    } catch (err) {
      logger.error("Technique submit failed", err);
    }
  }

  return { form, onSubmit: submit, isSaving };
}
