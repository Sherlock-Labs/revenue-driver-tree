/**
 * Zustand store for tree state management.
 *
 * Skeleton — Alice will finish the implementation.
 * Includes undo/redo stack structure per tech approach Section 5e.
 */

import { create } from "zustand";
import type { TreeNode } from "../../../shared/schemas/tree.js";
import { recalculate } from "../lib/tree-engine.js";

const MAX_UNDO_STACK = 50;

// Module-level ref for the ripple-clear timeout so rapid edits cancel the previous one
let rippleClearTimer: ReturnType<typeof setTimeout> | undefined;

interface TreeState {
  // Tree data
  nodes: TreeNode[];
  selectedNodeId: string | null;

  // Undo/redo
  undoStack: TreeNode[][];
  redoStack: TreeNode[][];

  /**
   * Map of nodeId -> depth (levels above the changed node, 1 = direct parent).
   * Populated by updateNodeValue so RevenueNode can apply staggered ripple.
   * Cleared after 500ms (enough time for all animations to complete).
   */
  recalculatingNodeDepths: Map<string, number>;

  // Actions
  setNodes: (nodes: TreeNode[]) => void;
  updateNodeValue: (nodeId: string, value: number) => void;
  togglePin: (nodeId: string) => void;
  toggleCollapse: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  undo: () => void;
  redo: () => void;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  selectedNodeId: null,
  undoStack: [],
  redoStack: [],
  recalculatingNodeDepths: new Map(),

  setNodes: (nodes) => set({ nodes, undoStack: [], redoStack: [] }),

  updateNodeValue: (nodeId, value) => {
    const { nodes, undoStack } = get();

    // Push current state to undo stack
    const newUndoStack = [...undoStack, nodes].slice(-MAX_UNDO_STACK);

    // Update the node value
    const updatedNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, value } : n
    );

    // Recalculate the tree
    const recalculated = recalculate(updatedNodes, nodeId);

    // Build ancestor depth map for ripple animation
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const recalcDepths = new Map<string, number>();
    let depth = 1;
    let currentId = nodeMap.get(nodeId)?.parentId ?? null;
    while (currentId !== null) {
      const ancestor = nodeMap.get(currentId);
      if (!ancestor) break;
      if (ancestor.pinned) break; // Ripple stops at pinned nodes
      recalcDepths.set(currentId, depth);
      depth++;
      currentId = ancestor.parentId;
    }

    set({
      nodes: recalculated,
      undoStack: newUndoStack,
      redoStack: [], // Clear redo on new edit
      recalculatingNodeDepths: recalcDepths,
    });

    // Clear the ripple state after all animations complete (max depth * 50ms + 300ms animation)
    // Cancel any pending clear from a previous edit so rapid edits don't interfere
    clearTimeout(rippleClearTimer);
    const clearDelay = Math.max(depth * 50 + 350, 500);
    rippleClearTimer = setTimeout(() => {
      set({ recalculatingNodeDepths: new Map() });
    }, clearDelay);
  },

  togglePin: (nodeId) => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId ? { ...n, pinned: !n.pinned } : n
      ),
    });
  },

  toggleCollapse: (nodeId) => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
      ),
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  undo: () => {
    const { nodes, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    set({
      nodes: previousState,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, nodes],
    });
  },

  redo: () => {
    const { nodes, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    set({
      nodes: nextState,
      undoStack: [...undoStack, nodes],
      redoStack: redoStack.slice(0, -1),
    });
  },
}));
