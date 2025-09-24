"use client";
// PR2 move: features/operations/components

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Target, Plus, Edit, Users, Grid3x3, GitBranch, Eye, Shield, UserCheck, Download, CalendarClock } from "lucide-react";
import { OutcomeType } from "@prisma/client";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
// Render plain text only for safety
import { api } from "@/trpc/react";
import TechniqueEditorModal from "@/features/operations/components/technique-editor";
import AttackMatrix from "@/features/operations/components/attack-matrix";
import AttackFlow from "@/features/operations/components/attack-flow";
import AttackTimeline from "@/features/operations/components/attack-timeline";
import CreateOperationModal from "@/features/operations/components/create-operation-modal";
import TechniqueList from "@/features/operations/components/technique-list/technique-list";
import { exportOperationReport } from "@/lib/exportOperationReport";
import { summarizeTechniqueOutcomeMetrics } from "@/lib/outcomeMetrics";
import { operationStatusBadgeVariant, operationStatusLabels } from "@features/shared/operations/operation-status";

interface Props {
  operationId: number;
}

export default function OperationDetailPage({ operationId }: Props) {
  const [showAddTechnique, setShowAddTechnique] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'techniques' | 'matrix' | 'flow' | 'timeline'>('techniques');
  const [showEditOperation, setShowEditOperation] = useState(false);
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== 'VIEWER';
  const overviewRef = useRef<HTMLDivElement>(null);
  const attackFlowRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Fetch operation data client-side for real-time updates
  const { data: operation, isLoading, error } = api.operations.getById.useQuery({
    id: operationId
  }, {
    enabled: !!operationId, // Only run query when operationId is available
  });

  // Reorder handled inside TechniqueList hook

  if (!operationId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">Invalid operation ID.</p>
            <Link href="/operations" className="mt-4 inline-block">
              <Button variant="secondary">Back to Operations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">Operation not found or access denied.</p>
            <Link href="/operations" className="mt-4 inline-block">
              <Button variant="secondary">Back to Operations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const outcomeMetrics = summarizeTechniqueOutcomeMetrics(operation.techniques ?? []);
  const detectionStats = outcomeMetrics[OutcomeType.DETECTION];
  const preventionStats = outcomeMetrics[OutcomeType.PREVENTION];
  const attributionStats = outcomeMetrics[OutcomeType.ATTRIBUTION];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/operations">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Operations
          </Button>
        </Link>
      </div>

      {/* Operation Overview */}
      <div ref={overviewRef} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {operation.name}
                </h1>
                <Badge variant={operationStatusBadgeVariant[operation.status]}>
                  {operationStatusLabels[operation.status]}
                </Badge>
              </div>
              <div className="text-[var(--color-text-secondary)] mb-4">
                {operation.description}
              </div>

              {/* Tags */}
              {operation.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {operation.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}
                      className="text-xs"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span className="text-[var(--color-text-muted)]">Emulation:</span>
                  <span className="text-[var(--color-text-primary)]">
                    {operation.threatActor?.name ?? 'None'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span className="text-[var(--color-text-muted)]">Targeting:</span>
                  <span className="text-[var(--color-text-primary)]">
                    {operation.targets.length > 0
                      ? operation.targets
                          .map((target) => (target.isCrownJewel ? `${target.name} (CJ)` : target.name))
                          .join(', ')
                      : 'General Infrastructure'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setShowEditOperation(true)}
                >
                  <Edit className="w-4 h-4" />
                  Edit Operation
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => exportOperationReport({
                  operation,
                  overviewElement: overviewRef.current,
                  attackFlowElement: attackFlowRef.current,
                  matrixElement: matrixRef.current,
                  timelineElement: timelineRef.current,
                })}
              >
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">Detection</p>
                <div className="flex items-center gap-2 mt-1">
                  <Eye className="w-5 h-5 text-[var(--color-accent)]" />
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {detectionStats.attempts > 0 ? `${detectionStats.successRate}%` : 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {detectionStats.attempts > 0
                    ? `${detectionStats.successes} of ${detectionStats.attempts} techniques`
                    : 'No detection outcomes'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">Prevention</p>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-5 h-5 text-[var(--color-accent)]" />
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {preventionStats.attempts > 0 ? `${preventionStats.successRate}%` : 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {preventionStats.attempts > 0
                    ? `${preventionStats.successes} of ${preventionStats.attempts} techniques`
                    : 'No prevention outcomes'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">Attribution</p>
                <div className="flex items-center gap-2 mt-1">
                  <UserCheck className="w-5 h-5 text-[var(--color-accent)]" />
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {attributionStats.attempts > 0 ? `${attributionStats.successRate}%` : 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {attributionStats.attempts > 0
                    ? `${attributionStats.successes} of ${attributionStats.attempts} techniques`
                    : 'No attribution outcomes'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('techniques')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'techniques'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>Techniques ({operation.techniques.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'matrix'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              <span>Attack Matrix</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'flow'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span>Attack Flow</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'timeline'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              <span>Attack Timeline</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6 relative">
        {/* Techniques Tab */}
        <div className={`space-y-6 w-full ${activeTab === 'techniques' ? '' : 'absolute -left-[10000px]'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Techniques ({operation.techniques.length})
            </h2>
            {canEdit && (
              <Button
                onClick={() => setShowAddTechnique(true)}
                variant="secondary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Technique
              </Button>
            )}
          </div>

          <TechniqueList
            operation={operation}
            operationId={operationId}
            canEdit={canEdit}
            onEdit={setEditingTechnique}
            onAddTechnique={() => setShowAddTechnique(true)}
          />
        </div>

        {/* Attack Matrix Tab */}
        <div className={`space-y-6 w-full ${activeTab === 'matrix' ? '' : 'absolute -left-[10000px]'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Attack Matrix Coverage
            </h2>
          </div>

          <div ref={matrixRef} data-export-visible>
            <AttackMatrix operation={operation} />
          </div>
        </div>

        {/* Attack Flow Tab */}
        <div className={`space-y-6 w-full ${activeTab === 'flow' ? '' : 'absolute -left-[10000px]'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Attack Flow Visualization
            </h2>
          </div>

          <div ref={attackFlowRef}>
            <AttackFlow operation={operation} canEdit={canEdit} />
          </div>
        </div>

        {/* Attack Timeline Tab */}
        <div className={`space-y-6 w-full ${activeTab === 'timeline' ? '' : 'absolute -left-[10000px]'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Attack Timeline
            </h2>
          </div>

          <div ref={timelineRef} data-export-visible>
            <AttackTimeline operation={operation} />
          </div>
        </div>
      </div>

      {/* Add Technique Modal - Only show for techniques tab */}
      {canEdit && (
        <TechniqueEditorModal
          operationId={operationId}
          techniqueId={editingTechnique ?? undefined}
          isOpen={showAddTechnique || !!editingTechnique}
          onClose={() => {
            setShowAddTechnique(false);
            setEditingTechnique(null);
          }}
          onSuccess={() => {
            // Modal will close automatically
            // Operation data will be invalidated and refetch automatically
          }}
        />
      )}

      {/* Edit Operation Modal */}
      <CreateOperationModal
        isOpen={showEditOperation}
        onClose={() => setShowEditOperation(false)}
        onSuccess={() => {
          // Modal will close automatically
          // Operation data will be refetched automatically
        }}
        operationId={operationId}
        operation={operation ?? undefined}
      />
    </div>
  );
}
