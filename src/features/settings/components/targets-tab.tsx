"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label } from "@components/ui";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import { type Target } from "@prisma/client";
import EntityListCard from "./entity-list-card";
import EntityModal from "@components/ui/entity-modal";
import ConfirmModal from "@components/ui/confirm-modal";

export default function TargetsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Target | null>(null);

  const { data: targets, isLoading } = api.taxonomy.targets.list.useQuery();

  const utils = api.useUtils();
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

  const handleCreate = (data: { name: string; description: string; isCrownJewel: boolean }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: string, data: { name?: string; description?: string; isCrownJewel?: boolean }) => {
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

  const items = (targets ?? []) as Array<Target & { usageCount: number }>;

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Targets"
        subtitle="Manage assets that may be compromised during operations. Mark crown jewels to highlight mission-critical items."
        onNew={() => setIsCreateModalOpen(true)}
      />

      <div className="grid gap-4">
        {items.map((target) => (
          <EntityListCard
            key={target.id}
            title={
              <span className="font-medium">
                {target.name}
                {target.isCrownJewel && <span className="ml-2 text-xs text-[var(--color-accent)]">(Crown Jewel)</span>}
              </span>
            }
            description={target.description}
            actions={
              <InlineActions
                onEdit={() => setEditingTarget(target)}
                onDelete={() => setConfirmDelete(target)}
                deleteDisabled={target.usageCount > 0}
                deleteDisabledReason={target.usageCount > 0 ? `In use by ${target.usageCount} operation(s)` : undefined}
              />
            }
          />
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No targets configured. Use + New to create one.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <TargetModal
          title="Create Target"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingTarget && (
        <TargetModal
          title="Edit Target"
          initialData={editingTarget}
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

interface TargetModalProps {
  title: string;
  initialData?: Target;
  onSubmit: (data: { name: string; description: string; isCrownJewel: boolean }) => void;
  onClose: () => void;
  isLoading: boolean;
}

function TargetModal({ title, initialData, onSubmit, onClose, isLoading }: TargetModalProps) {
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
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
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
            Asset Name
          </Label>
          <Input
            id="target-name"
            variant="elevated"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Customer Database, Payment System"
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

        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={isCrownJewel}
            onChange={(event) => setIsCrownJewel(event.target.checked)}
          />
          Mark as Crown Jewel
        </label>
      </div>
    </EntityModal>
  );
}
