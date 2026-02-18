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

interface TreeState {
  // Tree data
  nodes: TreeNode[];
  selectedNodeId: string | null;

  // Undo/redo
  undoStack: TreeNode[][];
  redoStack: TreeNode[][];

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

    set({
      nodes: recalculated,
      undoStack: newUndoStack,
      redoStack: [], // Clear redo on new edit
    });
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
