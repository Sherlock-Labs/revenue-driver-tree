/**
 * Calculation Engine — Pure functions, no side effects.
 *
 * Handles bottom-up propagation of value changes through the tree.
 * Used by the Zustand store when a user edits a node's value.
 */

import type { TreeNode } from "../../../shared/schemas/tree.js";

/**
 * Build a map of parentId -> child node IDs for efficient lookups.
 */
export function buildChildrenMap(nodes: TreeNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId !== null) {
      const existing = map.get(node.parentId);
      if (existing) {
        existing.push(node.id);
      } else {
        map.set(node.parentId, [node.id]);
      }
    }
  }
  return map;
}

/**
 * Recalculate the tree after a node's value has changed.
 *
 * Algorithm:
 * 1. Clone all nodes (immutable update)
 * 2. Walk from the changed node's parent up to the root
 * 3. For each ancestor: if not pinned, recompute from children using its computeType
 * 4. Stop at pinned nodes (they hold their value regardless of children)
 *
 * Returns a new nodes array with updated values.
 */
export function recalculate(nodes: TreeNode[], changedNodeId: string): TreeNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  const childrenMap = buildChildrenMap(nodes);

  // Walk from the changed node's parent up to root
  const changedNode = nodeMap.get(changedNodeId);
  if (!changedNode) return nodes;

  let currentId = changedNode.parentId;

  while (currentId !== null) {
    const node = nodeMap.get(currentId);
    if (!node) break;

    // Pinned nodes don't recompute — stop propagation
    if (node.pinned) break;

    const childIds = childrenMap.get(currentId) ?? [];
    const childValues = childIds
      .map((id) => nodeMap.get(id)!)
      .sort((a, b) => a.order - b.order)
      .map((c) => c.value);

    if (childValues.length > 0) {
      if (node.computeType === "sum") {
        node.value = childValues.reduce((sum, v) => sum + v, 0);
      } else if (node.computeType === "product") {
        node.value = childValues.reduce((prod, v) => prod * v, 1);
      }
      // input nodes are never parents of computed nodes
    }

    currentId = node.parentId;
  }

  return Array.from(nodeMap.values());
}

/**
 * Compute the status of a node based on its value vs. target.
 */
export type NodeStatus = "on-track" | "at-risk" | "behind";

export function getStatus(value: number, targetValue: number): NodeStatus {
  if (value >= targetValue) return "on-track";
  if (value >= targetValue * 0.9) return "at-risk";
  return "behind";
}

/**
 * Format a value for display based on its type.
 */
export function formatValue(value: number, type: "currency" | "percentage" | "count"): string {
  switch (type) {
    case "currency": {
      const absValue = Math.abs(value);
      const sign = value < 0 ? "-" : "";
      if (absValue >= 1_000_000) {
        return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
      }
      if (absValue >= 1_000) {
        return `${sign}$${(absValue / 1_000).toFixed(0)}K`;
      }
      return `${sign}$${absValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "count":
      return Math.round(value).toLocaleString("en-US");
  }
}

/**
 * Format a delta (gap) value for display with +/- signs.
 */
export function formatDelta(delta: number, type: "currency" | "percentage" | "count"): string {
  const sign = delta >= 0 ? "+" : "";
  switch (type) {
    case "currency": {
      const absDelta = Math.abs(delta);
      const prefix = delta >= 0 ? "+" : "-";
      if (absDelta >= 1_000_000) {
        return `${prefix}$${(absDelta / 1_000_000).toFixed(1)}M`;
      }
      if (absDelta >= 1_000) {
        return `${prefix}$${(absDelta / 1_000).toFixed(0)}K`;
      }
      return `${prefix}$${absDelta.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    case "percentage":
      return `${sign}${(delta * 100).toFixed(1)}pp`;
    case "count":
      return `${sign}${Math.round(delta).toLocaleString("en-US")}`;
  }
}
