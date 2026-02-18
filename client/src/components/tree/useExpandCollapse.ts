/**
 * useExpandCollapse — Computes which nodes are visible based on collapsed state.
 *
 * A node is visible if none of its ancestors are collapsed.
 * Design spec Section 6e, Tech approach Section 6e.
 */

import { useMemo } from "react";
import type { TreeNode } from "../../../../shared/schemas/tree.js";

/**
 * Builds a map of nodeId -> parentId for fast ancestor lookups.
 */
function buildParentMap(nodes: TreeNode[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const node of nodes) {
    map.set(node.id, node.parentId);
  }
  return map;
}

/**
 * Builds a set of nodeIds that have children (branch nodes).
 */
export function buildBranchNodeIds(nodes: TreeNode[]): Set<string> {
  const branchIds = new Set<string>();
  for (const node of nodes) {
    if (node.parentId !== null) {
      branchIds.add(node.parentId);
    }
  }
  return branchIds;
}

/**
 * Returns the set of visible node IDs.
 * A node is visible if none of its ancestors have collapsed === true.
 */
export function useExpandCollapse(nodes: TreeNode[]): Set<string> {
  return useMemo(() => {
    const parentMap = buildParentMap(nodes);

    // Find all collapsed node IDs
    const collapsedIds = new Set<string>(
      nodes.filter((n) => n.collapsed).map((n) => n.id)
    );

    const visibleIds = new Set<string>();

    for (const node of nodes) {
      // Walk up ancestors; if any are collapsed, this node is hidden
      let currentId: string | null = node.parentId;
      let hidden = false;

      while (currentId !== null) {
        if (collapsedIds.has(currentId)) {
          hidden = true;
          break;
        }
        currentId = parentMap.get(currentId) ?? null;
      }

      if (!hidden) {
        visibleIds.add(node.id);
      }
    }

    return visibleIds;
  }, [nodes]);
}
