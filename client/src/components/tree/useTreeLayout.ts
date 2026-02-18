/**
 * useTreeLayout — Dagre layout computation hook.
 *
 * Computes x/y positions for visible nodes using Dagre's directed graph layout.
 * Fixed heights: 120px for input nodes (with slider), 100px for computed nodes.
 * Node width: 260px.
 *
 * Design spec Section 7.1, Tech approach Section 6d.
 */

import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { TreeNode } from "../../../../shared/schemas/tree.js";

const NODE_WIDTH = 260;
const NODE_HEIGHT_INPUT = 120; // input nodes with slider
const NODE_HEIGHT_COMPUTED = 100; // sum/product nodes without slider

export function useTreeLayout(
  treeNodes: TreeNode[],
  visibleNodeIds: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  return useMemo(() => {
    if (treeNodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "TB",
      nodesep: 40,
      ranksep: 80,
      marginx: 20,
      marginy: 20,
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add visible nodes to Dagre
    for (const node of treeNodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const height =
        node.computeType === "input" ? NODE_HEIGHT_INPUT : NODE_HEIGHT_COMPUTED;
      g.setNode(node.id, { width: NODE_WIDTH, height });
    }

    // Add edges between visible nodes
    for (const node of treeNodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      if (node.parentId && visibleNodeIds.has(node.parentId)) {
        g.setEdge(node.parentId, node.id);
      }
    }

    dagre.layout(g);

    // Build React Flow nodes
    const rfNodes: Node[] = [];
    for (const node of treeNodes) {
      if (!visibleNodeIds.has(node.id)) continue;

      const dagreNode = g.node(node.id);
      if (!dagreNode) continue;

      const height =
        node.computeType === "input" ? NODE_HEIGHT_INPUT : NODE_HEIGHT_COMPUTED;

      rfNodes.push({
        id: node.id,
        type: "revenueNode",
        position: {
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - height / 2,
        },
        data: node as Record<string, unknown>,
        width: NODE_WIDTH,
        height,
      });
    }

    // Build React Flow edges
    const rfEdges: Edge[] = [];
    for (const node of treeNodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      if (node.parentId && visibleNodeIds.has(node.parentId)) {
        rfEdges.push({
          id: `edge-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: "smoothstep",
          style: {
            stroke: "var(--color-border-strong)",
            strokeWidth: 1.5,
          },
        });
      }
    }

    return { nodes: rfNodes, edges: rfEdges };
  }, [treeNodes, visibleNodeIds]);
}
