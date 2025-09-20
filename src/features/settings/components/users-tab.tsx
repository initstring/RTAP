"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Card, CardContent, Input, Label } from "@components/ui";
import ConfirmModal from "@components/ui/confirm-modal";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import { UserRole } from "@prisma/client";

// Define a simple user type for the UI
type SimpleUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  lastLogin: Date | null;
  passkeyCount: number;
};

interface PendingLink {
  email: string;
  url: string;
  expires: string;
}

export default function UsersTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SimpleUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SimpleUser | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  // Queries
  const { data: users, isLoading } = api.users.list.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.users.create.useMutation({
    onSuccess: (data) => {
      void utils.users.invalidate();
      setIsCreateModalOpen(false);
      setPendingLink({
        email: data.user.email,
        url: data.loginLink.url,
        expires: typeof data.loginLink.expires === "string" ? data.loginLink.expires : data.loginLink.expires.toISOString(),
      });
    },
  });

  const updateMutation = api.users.update.useMutation({
    onSuccess: () => {
      void utils.users.invalidate();
      setEditingUser(null);
    },
  });

  const deleteMutation = api.users.delete.useMutation({
    onSuccess: () => {
      void utils.users.invalidate();
      setConfirmDelete(null);
    },
  });

  const loginLinkMutation = api.users.issueLoginLink.useMutation({
    onSuccess: (data, variables) => {
      void utils.users.invalidate();
      const user = users?.find((u) => u.id === variables.id);
      setPendingLink({
        email: user?.email ?? "",
        url: data.url,
        expires: typeof data.expires === "string" ? data.expires : data.expires.toISOString(),
      });
    },
  });

  const handleCreate = async (data: { name: string; email: string; role: UserRole }) => {
    try {
      await createMutation.mutateAsync(data);
    } catch {
      // Errors are handled via mutation state
    }
  };

  const handleUpdate = (id: string, data: { name: string; email: string; role: UserRole }) => {
    updateMutation.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleIssueLink = (user: SimpleUser) => {
    loginLinkMutation.mutate({ id: user.id });
  };

  const copyLink = async () => {
    if (!pendingLink) return;
    try {
      await navigator.clipboard.writeText(pendingLink.url);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1500);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "text-[var(--color-error)] bg-[var(--color-error)]/20 border-[var(--color-error)]/30";
      case UserRole.OPERATOR:
        return "text-[var(--color-warning)] bg-[var(--color-warning)]/20 border-[var(--color-warning)]/30";
      case UserRole.VIEWER:
      default:
        return "text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] border-[var(--color-border)]";
    }
  };

  const renderLastLogin = (date: Date | null) => {
    if (!date) return "Never";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return String(date);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title="Users" onNew={() => setIsCreateModalOpen(true)} />

      {pendingLink && (
        <Card className="border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">One-time login link for {pendingLink.email}</p>
              <Input readOnly value={pendingLink.url} className="mt-2" />
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={copyLink}>
                {copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy link"}
              </Button>
              <span className="text-xs text-[var(--color-text-muted)]">
                Expires at {new Date(pendingLink.expires).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-[var(--color-text-primary)]">
                      {user.name ?? "Unnamed User"}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-[var(--radius-sm)] border ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Last login: {renderLastLogin(user.lastLogin)} • Passkeys {user.passkeyCount > 0 ? "Enrolled" : "Not enrolled"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <InlineActions onEdit={() => setEditingUser(user)} onDelete={() => setConfirmDelete(user)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleIssueLink(user)}
                    disabled={loginLinkMutation.isPending && loginLinkMutation.variables?.id === user.id}
                  >
                    {loginLinkMutation.isPending && loginLinkMutation.variables?.id === user.id
                      ? "Generating..."
                      : "Generate login link"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {users?.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No users found. Add your first user to get started.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <UserModal
          title="Create User"
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingUser && (
        <UserModal
          title="Edit User"
          initialData={editingUser}
          onSubmit={(data) => handleUpdate(editingUser.id, data)}
          onCancel={() => setEditingUser(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete user?"
          description="Are you sure you want to delete this user? This action cannot be undone."
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

type UserModalSubmitData = { name: string; email: string; role: UserRole };

interface UserModalProps {
  title: string;
  initialData?: SimpleUser;
  onSubmit: (data: UserModalSubmitData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function UserModal({ title, initialData, onSubmit, onCancel, isLoading }: UserModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState<UserRole>(initialData?.role ?? UserRole.VIEWER);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, role });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{title}</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Full Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Smith"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                variant="elevated"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., john.smith@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="role" required>
                User Role
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
                required
              >
                <option value={UserRole.VIEWER}>Viewer - Read-only access</option>
                <option value={UserRole.OPERATOR}>Operator - Create and manage operations</option>
                <option value={UserRole.ADMIN}>Admin - Full system access</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="secondary"
                disabled={isLoading || !name.trim() || !email.trim()}
                className="flex-1"
              >
                {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
