"use client";
// PR2 move: features/operations/components

import { useEffect, useMemo } from "react";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react";
import { OperationStatus, OperationVisibility } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Target, Edit } from "lucide-react";
import { logger } from "@/lib/logger";
import { Combobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import TaxonomySelector from "./technique-editor/taxonomy-selector";

type Operation = RouterOutputs["operations"]["getById"];
type CreateOperationInput = RouterInputs["operations"]["create"];
type UpdateOperationInput = RouterInputs["operations"]["update"];

const OperationFormSchema = z
  .object({
    name: z.string().min(1, "Operation name is required"),
    description: z.string().min(1, "Description is required"),
    status: z.nativeEnum(OperationStatus),
    threatActorId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
    targetIds: z.array(z.string()).optional(),
    visibility: z.nativeEnum(OperationVisibility),
    accessGroupIds: z.array(z.string()).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.startDate && values.endDate) {
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date cannot be before start date",
        });
      }
    }

    if (values.visibility === OperationVisibility.GROUPS_ONLY && (values.accessGroupIds?.length ?? 0) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accessGroupIds"],
        message: "Select at least one group",
      });
    }
  });

type OperationFormValues = z.infer<typeof OperationFormSchema>;

function formatDateForInput(date?: Date | string | null): string | undefined {
  if (!date) return undefined;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().split("T")[0];
}

function buildDefaultValues(operation?: Operation): OperationFormValues {
  return {
    name: operation?.name ?? "",
    description: operation?.description ?? "",
    status: operation?.status ?? OperationStatus.PLANNING,
    threatActorId: operation?.threatActorId ?? undefined,
    startDate: formatDateForInput(operation?.startDate),
    endDate: formatDateForInput(operation?.endDate),
    tagIds: operation?.tags.map((tag) => tag.id) ?? [],
    targetIds: operation?.targets.map((target) => target.id) ?? [],
    visibility: operation?.visibility ?? OperationVisibility.EVERYONE,
    accessGroupIds: operation?.accessGroups?.map(({ group }) => group.id) ?? [],
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  operationId?: number; // If provided, we're in edit mode
  operation?: Operation; // Pass the operation data for edit mode
}

export default function CreateOperationModal({ isOpen, onClose, onSuccess, operationId, operation }: Props) {
  const isEditMode = Boolean(operationId);
  const defaultValues = useMemo(() => buildDefaultValues(operation), [operation]);

  const form = useForm<OperationFormValues>({
    defaultValues,
    resolver: zodResolver(OperationFormSchema),
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue, reset, register, formState } = form;
  const { errors, isValid } = formState;

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [defaultValues, isOpen, reset]);

  const visibility = watch("visibility");
  const selectedTagIds = watch("tagIds") ?? [];
  const selectedTargetIds = watch("targetIds") ?? [];
  const selectedGroupIds = watch("accessGroupIds") ?? [];

  useEffect(() => {
    if (visibility !== OperationVisibility.GROUPS_ONLY && selectedGroupIds.length > 0) {
      setValue("accessGroupIds", [], { shouldDirty: true, shouldValidate: true });
    }
  }, [visibility, selectedGroupIds.length, setValue]);

  const { data: threatActorsData } = api.taxonomy.threatActors.list.useQuery();
  const { data: tagsData } = api.taxonomy.tags.list.useQuery();
  const { data: targetsData } = api.taxonomy.targets.list.useQuery();
  const { data: groupsData } = api.groups.list.useQuery();

  const threatActors = threatActorsData ?? [];
  const tags = tagsData ?? [];
  const targets = targetsData ?? [];
  const groups = groupsData ?? [];

  const utils = api.useUtils();

  const createOperation = api.operations.create.useMutation({
    onSuccess: () => {
      logger.info("Operation created successfully");
      void utils.operations.list.invalidate();
      onSuccess?.();
      reset(buildDefaultValues());
      onClose();
    },
    onError: (error) => {
      logger.error("Error creating operation:", error);
    },
  });

  const updateOperation = api.operations.update.useMutation({
    onSuccess: () => {
      logger.info("Operation updated successfully");
      void utils.operations.list.invalidate();
      if (operationId) {
        void utils.operations.getById.invalidate({ id: operationId });
      }
      onSuccess?.();
      reset(defaultValues);
      onClose();
    },
    onError: (error) => {
      logger.error("Error updating operation:", error);
    },
  });

  const isMutating = createOperation.isPending || updateOperation.isPending;

  const onSubmit = handleSubmit((values: OperationFormValues) => {
    const basePayload: CreateOperationInput = {
      name: values.name.trim(),
      description: values.description.trim(),
      threatActorId: values.threatActorId ?? undefined,
      startDate: values.startDate ? new Date(values.startDate) : undefined,
      endDate: values.endDate ? new Date(values.endDate) : undefined,
      tagIds: values.tagIds ?? [],
      targetIds: values.targetIds ?? [],
      visibility: values.visibility,
      accessGroupIds: values.visibility === OperationVisibility.GROUPS_ONLY ? values.accessGroupIds ?? [] : [],
    };

    if (isEditMode && operationId) {
      const updatePayload: UpdateOperationInput = {
        id: operationId,
        status: values.status,
        ...basePayload,
      };
      logger.debug("Updating operation with data:", updatePayload);
      updateOperation.mutate(updatePayload);
    } else {
      logger.debug("Creating operation with data:", basePayload);
      createOperation.mutate(basePayload);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card variant="elevated" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {isEditMode ? (
              <>
                <Edit className="w-5 h-5" />
                Edit Operation
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                Create New Operation
              </>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset(defaultValues);
                onClose();
              }}
              className="h-auto p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Operation Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., APT29 Purple Team Exercise"
                  {...register("name")}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-[var(--color-error)]">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  placeholder="Describe the operation objectives, scope, and methodology..."
                  {...register("description")}
                  required
                  className="w-full min-h-[100px] p-3 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-[var(--color-error)]">{errors.description.message}</p>
                )}
              </div>

              {isEditMode && (
                <div className="space-y-2">
                  <Label htmlFor="status">Operation Status</Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as OperationStatus)}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select operation status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLANNING">Planning</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Update the operation status based on current progress
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date (Optional)</Label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <Input
                        id="startDate"
                        type="date"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Controller
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                      <Input
                        id="endDate"
                        type="date"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    )}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-[var(--color-error)]">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[var(--color-surface-elevated)] rounded-lg">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <strong>Note:</strong> New operations start in &quot;Planning&quot; status by default. {isEditMode ? "You can update the status above." : "You can change the status later by editing the operation."}
                </p>
              </div>
            </div>

            {/* Tags Selection */}
            <TaxonomySelector
              variant="tags"
              items={tags}
              selectedIds={selectedTagIds}
              onSelectionChange={(ids) => setValue("tagIds", ids, { shouldDirty: true })}
              label="Tags"
              description="Select relevant tags for this operation:"
              searchable
              multiple
            />

            {/* Threat Actor Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--color-text-muted)]" />
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Threat Actor Emulation</h3>
              </div>

              <div className="space-y-2">
                <Label>Select Threat Actor (Optional)</Label>
                <Controller
                  control={control}
                  name="threatActorId"
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ""}
                      onValueChange={(value) => field.onChange(value || undefined)}
                      options={threatActors.map((actor) => ({
                        value: actor.id,
                        label: actor.name,
                        description: actor.description,
                      }))}
                      placeholder="Choose a threat actor to emulate..."
                      searchPlaceholder="Search threat actors..."
                      emptyText="No threat actors found"
                      clearable
                    />
                  )}
                />
              </div>
            </div>

            {/* Crown Jewels Selection */}
            <TaxonomySelector
              variant="targets"
              items={targets}
              selectedIds={selectedTargetIds}
              onSelectionChange={(ids) => setValue("targetIds", ids, { shouldDirty: true })}
              label="Planned Targets"
              description="Select assets this operation intends to target. Crown jewels are flagged with a CJ badge."
              searchable
              multiple
            />

            {/* Access Control */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Access</h3>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="visibility"
                      value="EVERYONE"
                      checked={visibility === OperationVisibility.EVERYONE}
                      onChange={() => setValue("visibility", OperationVisibility.EVERYONE, { shouldDirty: true })}
                    />
                    Everyone
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="visibility"
                      value="GROUPS_ONLY"
                      checked={visibility === OperationVisibility.GROUPS_ONLY}
                      onChange={() => setValue("visibility", OperationVisibility.GROUPS_ONLY, { shouldDirty: true })}
                    />
                    Specific groups
                  </label>
                </div>
              </div>

              {visibility === OperationVisibility.GROUPS_ONLY && (
                <div className="space-y-2">
                  <Label>Select Groups</Label>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={(event) => {
                            const updated = event.target.checked
                              ? [...selectedGroupIds, group.id]
                              : selectedGroupIds.filter((id) => id !== group.id);
                            setValue("accessGroupIds", updated, { shouldDirty: true, shouldValidate: true });
                          }}
                        />
                        {group.name}
                      </label>
                    ))}
                  </div>
                  {errors.accessGroupIds?.message && (
                    <p className="text-sm text-[var(--color-error)]">{errors.accessGroupIds.message}</p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Members of the selected groups can view or edit this operation according to their role.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t border-[var(--color-border)] items-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset(defaultValues);
                  onClose();
                }}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating || !isValid} variant="secondary">
                {createOperation.isPending
                  ? "Creating..."
                  : updateOperation.isPending
                    ? "Updating..."
                    : isEditMode
                      ? "Update"
                      : "Create Operation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
