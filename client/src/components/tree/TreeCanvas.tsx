/**
 * TreeCanvas — React Flow wrapper for the tree visualization.
 *
 * Handles: nodes, edges (smoothstep), minimap, controls, pan/zoom.
 * Uses useTreeLayout for Dagre node positioning.
 * Uses useExpandCollapse for branch visibility toggling.
 *
 * Design spec Section 6.3, Tech approach Section 6
 */

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTreeStore } from "../../stores/tree-store.js";
import { RevenueNode } from "./RevenueNode.js";
import { useTreeLayout } from "./useTreeLayout.js";
import { useExpandCollapse } from "./useExpandCollapse.js";
import { getStatus } from "../../lib/tree-engine.js";
import type { TreeNode } from "../../../../shared/schemas/tree.js";

const nodeTypes = {
  revenueNode: RevenueNode,
};

// Minimap colors based on node status
function getNodeColor(node: { data?: Record<string, unknown> }): string {
  const treeNode = node.data as TreeNode | undefined;
  if (!treeNode) return "#e5e5e5";
  const status = getStatus(treeNode.value, treeNode.targetValue);
  if (treeNode.pinned) return "#2563eb";
  switch (status) {
    case "on-track":
      return "#059669";
    case "at-risk":
      return "#d97706";
    case "behind":
      return "#dc2626";
    default:
      return "#e5e5e5";
  }
}

interface TreeCanvasInnerProps {
  readOnly?: boolean;
  onFlowReady?: (instance: ReactFlowInstance) => void;
  onZoomChange?: (zoom: number) => void;
}

function TreeCanvasInner({
  readOnly = false,
  onFlowReady,
  onZoomChange,
}: TreeCanvasInnerProps) {
  const treeNodes = useTreeStore((s) => s.nodes);
  const visibleIds = useExpandCollapse(treeNodes);
  const { nodes: rfNodes, edges: rfEdges } = useTreeLayout(treeNodes, visibleIds);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      onFlowReady?.(instance);
      // Fit the tree on initial load
      setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50);
    },
    [onFlowReady, fitView]
  );

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: { x: number; y: number; zoom: number }) => {
      onZoomChange?.(viewport.zoom);
    },
    [onZoomChange]
  );

  if (treeNodes.length === 0) {
    return (
      <div className="tree-canvas-loading" aria-live="polite" aria-label="Loading tree">
        <div className="tree-canvas-loading__spinner" aria-hidden="true" />
        <p className="tree-canvas-loading__text">Loading tree...</p>
        <style>{`
          .tree-canvas-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: var(--space-3);
          }
          .tree-canvas-loading__spinner {
            width: 24px;
            height: 24px;
            border: 2px solid var(--color-border);
            border-top-color: var(--color-text-tertiary);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }
          .tree-canvas-loading__text {
            font-size: var(--text-sm);
            color: var(--color-text-tertiary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onInit={handleInit}
      onMoveEnd={handleMoveEnd}
      fitView
      minZoom={0.25}
      maxZoom={2}
      panOnDrag={true}
      zoomOnScroll={true}
      zoomOnPinch={true}
      selectNodesOnDrag={false}
      nodesConnectable={false}
      nodesDraggable={false}
      elementsSelectable={false}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "var(--color-border-strong)",
          strokeWidth: 1.5,
        },
      }}
      proOptions={{ hideAttribution: true }}
      style={{ background: "var(--color-bg-canvas)" }}
    >
      <Background variant={BackgroundVariant.Dots} color="var(--color-border)" gap={24} size={1} />
      <MiniMap
        nodeColor={getNodeColor}
        maskColor="rgba(0, 0, 0, 0.08)"
        style={{
          width: 160,
          height: 100,
          bottom: 16,
          right: 16,
        }}
        pannable
        zoomable
      />

      <style>{`
        .react-flow__minimap {
          bottom: var(--space-4) !important;
          right: var(--space-4) !important;
        }
      `}</style>
    </ReactFlow>
  );
}

interface TreeCanvasProps extends TreeCanvasInnerProps {
  className?: string;
}

export function TreeCanvas({ className, ...props }: TreeCanvasProps) {
  return (
    <div
      className={`tree-canvas ${className ?? ""}`}
      style={{ flex: 1, position: "relative" }}
      role="tree"
      aria-label="Revenue driver tree"
    >
      <ReactFlowProvider>
        <TreeCanvasInner {...props} />
      </ReactFlowProvider>

      <style>{`
        .tree-canvas {
          background: var(--color-bg-canvas);
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
