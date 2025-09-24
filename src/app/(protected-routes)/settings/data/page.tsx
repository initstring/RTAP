"use client";

import { useEffect, useRef, useState } from "react";

import { CheckCircle } from "lucide-react";

import ConfirmModal from "@components/ui/confirm-modal";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@components/ui";
import { logger } from "@lib/logger";
import { api } from "@/trpc/react";

export default function DataSettingsPage() {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetRestoreSelection = () => {
    setRestoreFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = window.setTimeout(() => setToastMessage(null), 4000);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const utils = api.useUtils();
  const { data: stats, refetch: refetchStats } = api.data.getStats.useQuery();

  const backupMutation = api.data.backup.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rtap-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const restoreMutation = api.data.restore.useMutation({
    onSuccess: () => {
      void refetchStats();
      void utils.invalidate();
      resetRestoreSelection();
      setShowRestoreConfirm(false);
      setToastMessage("Operations and taxonomy data have been imported.");
      setRestoreError(null);
    },
    onError: (error) => {
      setShowRestoreConfirm(false);
      setRestoreError(error.message);
      resetRestoreSelection();
    },
  });

  const clearDataMutation = api.data.clearData.useMutation({
    onSuccess: () => {
      void refetchStats();
      void utils.invalidate();
      setShowClearConfirm(false);
      setToastMessage("Operations and taxonomy data have been cleared.");
    },
    onError: () => {
      setShowClearConfirm(false);
    },
  });

  const handleRestore = async () => {
    if (!restoreFile) return;

    try {
      const text = await restoreFile.text();
      setRestoreError(null);
      restoreMutation.mutate({ backupData: text });
    } catch (error) {
      logger.error("Failed to read backup file", error);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            role="status"
            aria-live="polite"
            className="flex items-start space-x-3 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-surface-elevated)] px-4 py-3 shadow-[var(--shadow-lg)]"
          >
            <CheckCircle className="h-5 w-5 text-[var(--status-success-fg)]" aria-hidden />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Success</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Data Management</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Export, import, or clear operations and taxonomy data.
        </p>
      </div>

      {showRestoreConfirm && (
        <ConfirmModal
          open
          title="Import data from backup?"
          description="This will replace all existing operations and taxonomy data with the selected backup. All operations will be made visible to every user because group assignments are not restored. This action cannot be undone."
          confirmLabel="Import"
          cancelLabel="Cancel"
          onConfirm={handleRestore}
          onCancel={() => {
            resetRestoreSelection();
            setShowRestoreConfirm(false);
          }}
          loading={restoreMutation.isPending}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: "Operations", value: stats.operations },
                { label: "Techniques", value: stats.techniques },
                { label: "Outcomes", value: stats.outcomes },
                { label: "Threat Actors", value: stats.threatActors },
                { label: "Targets", value: stats.targets },
                { label: "Tags", value: stats.tags },
                { label: "Tools", value: stats.tools },
                { label: "Log Sources", value: stats.logSources },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-[var(--color-accent)]">{value}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-[var(--color-text-secondary)]">Loading statistics...</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Download a JSON file containing all operations and taxonomy records.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
            >
              {backupMutation.isPending ? "Preparing export..." : "Download data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Import a backup to replace the current operations and taxonomy data set.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;

                if (!file) {
                  resetRestoreSelection();
                  setShowRestoreConfirm(false);
                  return;
                }

                setRestoreFile(file);
                setRestoreError(null);
                setShowRestoreConfirm(true);
                event.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Importing..." : "Import data"}
            </Button>
            {restoreError && <div className="text-sm text-[var(--color-error)]">{restoreError}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--color-error)]">⚠️ Clear Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Permanently delete all operations and taxonomy data. This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearDataMutation.isPending}
            >
              {clearDataMutation.isPending ? "Clearing..." : "Clear all data"}
            </Button>
            {clearDataMutation.error && (
              <div className="text-sm text-[var(--color-error)]">{clearDataMutation.error.message}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {showClearConfirm && (
        <ConfirmModal
          open
          title="Delete all data?"
          description="This will permanently delete all operations and taxonomy data. This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => clearDataMutation.mutate()}
          onCancel={() => setShowClearConfirm(false)}
          loading={clearDataMutation.isPending}
        />
      )}
    </div>
  );
}
