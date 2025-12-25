"use client";
// PR2 move: features/operations/components

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Activity, Expand, Minimize, RotateCcw, Save, CheckCircle, Eye, Shield, UserCheck, X } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { logger } from "@/lib/logger";
// Display plain text only in nodes for safety
import TechniqueNode from "./technique-node";

// React Flow imports
import { ReactFlow, type Node, type Edge, Controls, Background, useNodesState, useEdgesState, addEdge, ConnectionMode, MarkerType, type OnConnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type Operation = RouterOutputs["operations"]["getById"];
type Technique = Operation["techniques"][0] & { executedSuccessfully: boolean | null };

interface AttackFlowProps {
  operation: Operation;
  canEdit?: boolean;
}

interface TechniqueNodeData extends Record<string, unknown> {
  technique: Technique;
}

interface SavedNodePosition {
  id: string;
  position: { x: number; y: number };
}

interface SavedLayout {
  nodes: SavedNodePosition[];
  edges: Edge[];
}

// Type guard to check if a value is a valid saved layout
function isValidSavedLayout(value: unknown): value is SavedLayout {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.nodes) && Array.isArray(obj.edges);
}

// Define custom node types
const nodeTypes = { techniqueNode: TechniqueNode };

export default function AttackFlow({ operation, canEdit = true }: AttackFlowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved layout from database
  const { data: savedLayout, isLoading: isLoadingLayout } = api.operations.getAttackFlowLayout.useQuery(
    { id: operation.id },
    {
      enabled: !!operation.id,
      retry: 1,
    }
  );

  // Save layout mutation
  const saveLayoutMutation = api.operations.saveAttackFlowLayout.useMutation({
    onSuccess: () => {
      logger.info('Attack flow layout saved successfully');
    },
    onError: (error) => {
      logger.error('Failed to save attack flow layout:', error);
    },
  });

  // Initialize nodes from operation techniques with saved positions
  const initialNodes: Node<TechniqueNodeData>[] = useMemo(() => {
    const savedPositions = isValidSavedLayout(savedLayout) ? savedLayout.nodes : [];

    return operation.techniques.map((technique, index) => {
      const savedPosition = savedPositions.find((n) => n.id === technique.id);

      return {
        id: technique.id,
        type: 'techniqueNode',
        position: savedPosition ? savedPosition.position : {
          x: 50 + (index % 3) * 350,
          y: 50 + Math.floor(index / 3) * 200,
        },
        data: { technique },
        draggable: canEdit,
      };
    });
  }, [operation.techniques, savedLayout, canEdit]);

  // Initialize edges with saved connections or default sequential
  const initialEdges: Edge[] = useMemo(() => {
    // If we have saved edges, use them
    if (isValidSavedLayout(savedLayout)) {
      return savedLayout.edges.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-accent)',
        },
      }));
    }

    // Otherwise, create default sequential connections
    const edges: Edge[] = [];
    for (let i = 0; i < operation.techniques.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: operation.techniques[i]!.id,
        target: operation.techniques[i + 1]!.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-accent)',
        },
      });
    }
    return edges;
  }, [operation.techniques, savedLayout]);

  // Helpers to build a default (unsaved) layout ignoring any saved layout
  const buildDefaultNodes = useCallback((): Node<TechniqueNodeData>[] => {
    return operation.techniques.map((technique, index) => ({
      id: technique.id,
      type: 'techniqueNode',
      position: {
        x: 50 + (index % 3) * 350,
        y: 50 + Math.floor(index / 3) * 200,
      },
      data: { technique },
      draggable: canEdit,
    }));
  }, [operation.techniques, canEdit]);

  const buildDefaultEdges = useCallback((): Edge[] => {
    const edges: Edge[] = [];
    for (let i = 0; i < operation.techniques.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: operation.techniques[i]!.id,
        target: operation.techniques[i + 1]!.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent)' },
      });
    }
    return edges;
  }, [operation.techniques]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Update nodes and edges when saved layout loads
  useEffect(() => {
    if (isValidSavedLayout(savedLayout) && !isInitialized) {
      logger.debug('Loading saved layout');

      // Update nodes with saved positions
      const savedPositions = savedLayout.nodes;
      const updatedNodes = operation.techniques.map((technique, index) => {
        const savedPosition = savedPositions.find((n) => n.id === technique.id);
        return {
          id: technique.id,
          type: 'techniqueNode',
          position: savedPosition ? savedPosition.position : {
            x: 50 + (index % 3) * 350,
            y: 50 + Math.floor(index / 3) * 200,
          },
          data: { technique },
          draggable: canEdit,
        };
      });
      // Nodes set from saved layout
      setNodes(updatedNodes);

      // Update edges with saved connections
      const savedEdges = savedLayout.edges.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-accent)',
        },
      }));
      setEdges(savedEdges);

      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [savedLayout, operation.techniques, setNodes, setEdges, isInitialized, canEdit]);

  // Track changes for unsaved indicator (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, isInitialized]);

  // Manual save function
  const handleSaveState = useCallback(() => {
    const nodePositions = nodes.map(node => ({
      id: node.id,
      position: node.position,
    }));

    const edgeData = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    }));

    logger.debug('Saving layout - nodes:', nodePositions, 'edges:', edgeData);

    saveLayoutMutation.mutate({
      operationId: operation.id,
      nodes: nodePositions,
      edges: edgeData,
    }, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
      }
    });
  }, [nodes, edges, operation.id, saveLayoutMutation]);

  // Handle keyboard events for edge deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setEdges((eds) => eds.filter((edge) => !edge.selected));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setEdges]);

  // Handle new connections with validation
  const onConnect: OnConnect = useCallback(
    (params) => {
      // Prevent self-connections
      if (params.source === params.target) {
        return;
      }

      // Check if connection already exists
      const connectionExists = edges.some(
        edge => edge.source === params.source && edge.target === params.target
      );

      if (connectionExists) {
        return;
      }

      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-accent)',
        },
      }, eds));
    },
    [setEdges, edges],
  );

  // Clear all connections
  const handleClearConnections = useCallback(() => {
    setEdges([]);
    setHasUnsavedChanges(true);
  }, [setEdges]);

  // Reset layout function
  const handleResetLayout = useCallback(() => {
    // Reset to default (unsaved) sequence/positions, not the saved layout
    setNodes(buildDefaultNodes());
    setEdges(buildDefaultEdges());
    setHasUnsavedChanges(true);
  }, [buildDefaultNodes, buildDefaultEdges, setNodes, setEdges]);

  if (operation.techniques.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]">
            🎯
          </div>
          <p className="text-[var(--color-text-muted)] mb-4">
            No techniques have been added to this operation yet.
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Add techniques to see the attack flow visualization.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while fetching saved layout
  if (isLoadingLayout) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-muted)]">
            Loading attack flow layout...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`${isExpanded ? 'fixed inset-0 z-50 bg-[var(--color-surface)] p-6' : 'space-y-6'}`}>
      {/* KPI cards removed for a cleaner view */}

      {/* Attack Flow Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Attack Flow Visualization
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button
                    variant={hasUnsavedChanges ? "primary" : "secondary"}
                    size="sm"
                    onClick={handleSaveState}
                    disabled={saveLayoutMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saveLayoutMutation.isPending ? 'Saving...' : 'Save State'}
                    {hasUnsavedChanges && !saveLayoutMutation.isPending && (
                      <span className="ml-1 w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--status-warn-fg)" }} />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetLayout}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Layout
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleClearConnections}
                    disabled={edges.length === 0}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Connections
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2"
              >
                {isExpanded ? (
                  <>
                    <Minimize className="w-4 h-4" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Expand className="w-4 h-4" />
                    Expand View
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* React Flow Canvas */}
          <div className={`${isExpanded ? 'h-[calc(100vh-12rem)]' : 'h-[700px]'} border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]`}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              attributionPosition="bottom-left"
              proOptions={{ hideAttribution: true }}
              className="bg-[var(--color-surface)]"
              elementsSelectable={canEdit}
              nodesDraggable={canEdit}
              nodesConnectable={canEdit}
              selectNodesOnDrag={false}
              connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 3, strokeDasharray: '5,5' }}
              connectionRadius={25}
              snapToGrid={true}
              snapGrid={[20, 20]}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent)' }
              }}
            >
              <Background
                color="var(--color-accent)"
                size={1}
                gap={20}
                style={{ opacity: 0.1 }}
              />
              <Controls />
            </ReactFlow>
          </div>

          {/* Legend & Instructions */}
          {!isExpanded && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              {/* Legend */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Flow Legend</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)] mb-2">Execution Result:</div>
                    <div className="flex items-center gap-6 text-xs">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-[var(--status-success-fg)]" />
                        <span className="text-[var(--color-text-muted)]">Success</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="w-3 h-3 text-[var(--status-error-fg)]" />
                        <span className="text-[var(--color-text-muted)]">Failure</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)] mb-2">Defensive Outcomes:</div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-[var(--status-success-fg)]" />
                        <span className="text-[var(--color-text-muted)]">Detection</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[var(--status-success-fg)]" />
                        <span className="text-[var(--color-text-muted)]">Prevention</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[var(--status-success-fg)]" />
                        <span className="text-[var(--color-text-muted)]">Attribution</span>
                      </div>
                      <div className="text-[var(--color-text-muted)] ml-2">
                        <span className="text-[var(--status-success-fg)]">Green</span> = Success, <span className="text-[var(--status-error-fg)]">Red</span> = Failed
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Interactive Controls</h4>
                  <div className="text-[var(--color-text-muted)] space-y-1">
                    <p>• <strong>Drag techniques</strong> to rearrange positioning</p>
                    <p>• <strong>Create connections</strong> from technique edge handles</p>
                    <p>• <strong>Delete connections</strong> by selecting edge + Delete key</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Flow Management</h4>
                  <div className="text-[var(--color-text-muted)] space-y-1">
                    <p>• <strong>Save State</strong> preserves custom layout</p>
                    <p>• <strong>Reset Layout</strong> restores default sequence</p>
                    <p>• <strong>Clear Connections</strong> removes all edges</p>
                    <p>• <strong>Expand View</strong> for fullscreen editing</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
