"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label, Badge } from "@components/ui";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import EntityListCard from "./entity-list-card";
import EntityModal from "@components/ui/entity-modal";
import ConfirmModal from "@components/ui/confirm-modal";
import { Segmented } from "@components/ui/segmented";
import type { Target } from "@prisma/client";

interface TargetWithUsage extends Target {
  usageCount: number;
}

type TargetModalPayload = {
  name: string;
  description: string;
  isCrownJewel: boolean;
};

export default function TargetsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetWithUsage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TargetWithUsage | null>(null);

  const utils = api.useUtils();
  const { data: targets, isLoading } = api.taxonomy.targets.list.useQuery();

  const createMutation = api.taxonomy.targets.create.useMutation({
    onSuccess: () => {
      void utils.taxonomy.targets.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.taxonomy.targets.update.useMutation({
    onSuccess: () => {
      void utils.taxonomy.targets.invalidate();
      setEditingTarget(null);
    },
  });

  const deleteMutation = api.taxonomy.targets.delete.useMutation({
    onSuccess: () => {
      void utils.taxonomy.targets.invalidate();
      setConfirmDelete(null);
    },
  });

  const handleCreate = (data: TargetModalPayload) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: string, data: Partial<TargetModalPayload>) => {
    updateMutation.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading targets...</div>
      </div>
    );
  }

  const items = (targets ?? []) as TargetWithUsage[];

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Targets"
        subtitle="Track assets that may be targeted during operations. Mark the critical ones as crown jewels."
        onNew={() => setIsCreateModalOpen(true)}
      />

      <div className="grid gap-4">
        {items.map((target) => (
          <EntityListCard
            key={target.id}
            title={
              <div className="flex items-center gap-2">
                <span className="font-medium">{target.name}</span>
                {target.isCrownJewel && <Badge variant="outline" className="text-[0.65rem] uppercase tracking-wide">Crown Jewel</Badge>}
              </div>
            }
            description={target.description}
            actions={
              <InlineActions
                onEdit={() => setEditingTarget(target)}
                onDelete={() => setConfirmDelete(target)}
                deleteDisabled={target.usageCount > 0}
                deleteDisabledReason={target.usageCount > 0 ? `In use by ${target.usageCount} operation/technique link(s)` : undefined}
              />
            }
          />
        ))}

        {(items.length === 0) && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No targets configured yet. Use + New to add one.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <TargetEntityModal
          title="Create Target"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingTarget && (
        <TargetEntityModal
          title="Edit Target"
          initialData={{
            id: editingTarget.id,
            name: editingTarget.name,
            description: editingTarget.description,
            isCrownJewel: editingTarget.isCrownJewel,
          }}
          onSubmit={(data) => handleUpdate(editingTarget.id, data)}
          onClose={() => setEditingTarget(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete target?"
          description={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

interface TargetEntityModalProps {
  title: string;
  initialData?: { id: string; name: string; description: string; isCrownJewel: boolean };
  onSubmit: (data: TargetModalPayload) => void;
  onClose: () => void;
  isLoading: boolean;
}

function TargetEntityModal({ title, initialData, onSubmit, onClose, isLoading }: TargetEntityModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [isCrownJewel, setIsCrownJewel] = useState(initialData?.isCrownJewel ?? false);

  const handleSubmit = () => {
    onSubmit({ name, description, isCrownJewel });
  };

  return (
    <EntityModal
      open
      title={title}
      onClose={onClose}
      actions={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !description.trim()}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      )}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="target-name" required>
            Target Name
          </Label>
          <Input
            id="target-name"
            variant="elevated"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Customer Database, Email Gateway"
            required
          />
        </div>

        <div>
          <Label htmlFor="target-description" required>
            Description
          </Label>
          <textarea
            id="target-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the asset's importance and business impact..."
            required
            rows={4}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <Label>Crown Jewel</Label>
          <p className="text-sm text-[var(--color-text-muted)]">Mark this target as a crown jewel to highlight critical assets in planning and analytics.</p>
          <Segmented
            options={[
              { label: "No", value: "no" },
              { label: "Yes", value: "yes" },
            ]}
            value={isCrownJewel ? "yes" : "no"}
            onChange={(value) => setIsCrownJewel(value === "yes")}
          />
        </div>
      </div>
    </EntityModal>
  );
}
