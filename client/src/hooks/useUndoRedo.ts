/**
 * Undo/Redo keybinding hook.
 *
 * Registers Cmd+Z (undo) and Cmd+Shift+Z (redo) keyboard shortcuts.
 * Skeleton for Alice to finish.
 */

import { useEffect } from "react";
import { useTreeStore } from "../stores/tree-store.js";

export function useUndoRedo() {
  const undo = useTreeStore((state) => state.undo);
  const redo = useTreeStore((state) => state.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
}
