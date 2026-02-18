/**
 * Auto-save hook — debounced PUT to /api/trees/:id
 *
 * Skeleton for Alice to finish. See tech approach Section 9.
 * - 2s debounce after last edit
 * - 3 retries on failure
 * - Returns save status: "saved" | "saving" | "error"
 */

import { useState, useRef, useEffect } from "react";
import type { TreeNode } from "../../../shared/schemas/tree.js";
import { api } from "../lib/api.js";

type SaveStatus = "saved" | "saving" | "error";

export function useAutoSave(treeId: string, nodes: TreeNode[]): SaveStatus {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryCount = useRef(0);
  const isFirstRender = useRef(true);
  // Ref always holds the latest nodes so retries send current data, not stale closure data
  const latestNodesRef = useRef(nodes);
  latestNodesRef.current = nodes;

  useEffect(() => {
    // Skip the initial render (don't save on load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!treeId || nodes.length === 0) return;

    clearTimeout(timerRef.current);
    clearTimeout(retryTimerRef.current);
    setSaveStatus("saving");

    async function doSave() {
      try {
        await api(`/api/trees/${treeId}`, {
          method: "PUT",
          body: { nodes: latestNodesRef.current },
        });
        setSaveStatus("saved");
        retryCount.current = 0;
      } catch {
        retryCount.current++;
        if (retryCount.current < 3) {
          // Auto-retry after 3s with latest nodes
          retryTimerRef.current = setTimeout(doSave, 3000);
        } else {
          setSaveStatus("error");
        }
      }
    }

    timerRef.current = setTimeout(doSave, 2000);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(retryTimerRef.current);
    };
  }, [treeId, nodes]);

  return saveStatus;
}
