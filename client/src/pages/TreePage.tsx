/**
 * TreePage — Main product experience: interactive tree editor.
 *
 * Layout: AppHeader (56px) + TreeToolbar (48px) + TreeCanvas (fills remaining height).
 * SummaryPanel overlays the canvas from the right.
 * Loads tree by ID, manages editing state, undo/redo keybindings.
 * Design spec Section 6
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { Monitor, Check } from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader.js";
import { TreeToolbar } from "../components/layout/TreeToolbar.js";
import { TreeCanvas } from "../components/tree/TreeCanvas.js";
import { SummaryPanel } from "../components/summary/SummaryPanel.js";
import { useTreeStore } from "../stores/tree-store.js";
import { useAutoSave } from "../hooks/useAutoSave.js";
import { useUndoRedo } from "../hooks/useUndoRedo.js";
import { api } from "../lib/api.js";
import type { Tree } from "../../../shared/schemas/tree.js";
import type { ReactFlowInstance } from "@xyflow/react";

export default function TreePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState(false);
  const [treeName, setTreeName] = useState("Revenue Plan");
  const [treeData, setTreeData] = useState<Tree | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  // Ref to the Summarize toolbar button — focus returns here when summary panel closes
  const summarizeBtnRef = useRef<HTMLButtonElement>(null);

  const setNodes = useTreeStore((s) => s.setNodes);
  const nodes = useTreeStore((s) => s.nodes);
  const saveStatus = useAutoSave(id ?? "", nodes);
  // Announcement text for tree recalculation — read by screen readers via aria-live
  const [recalcAnnouncement, setRecalcAnnouncement] = useState<string>("");
  const recalcAnnouncementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register undo/redo keybindings
  useUndoRedo();

  // Announce root node value changes to screen readers when tree recalculates
  useEffect(() => {
    const rootNode = nodes.find((n) => n.parentId === null);
    if (!rootNode) return;
    // Build announcement — format value for reading
    const formatted =
      rootNode.type === "currency"
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 1 }).format(rootNode.value)
        : rootNode.type === "percentage"
        ? `${(rootNode.value * 100).toFixed(1)}%`
        : rootNode.value.toLocaleString("en-US");
    const delta = rootNode.value - rootNode.targetValue;
    const deltaLabel =
      Math.abs(delta) < 0.001 ? "on target" : `${delta >= 0 ? "+" : ""}${formatted} vs target`;
    setRecalcAnnouncement(`Tree updated. ${rootNode.name}: ${formatted}. ${deltaLabel}.`);
    // Clear announcement after 5s so it's not repeated on subsequent re-renders
    if (recalcAnnouncementTimerRef.current) clearTimeout(recalcAnnouncementTimerRef.current);
    recalcAnnouncementTimerRef.current = setTimeout(() => setRecalcAnnouncement(""), 5000);
  }, [nodes]);

  useEffect(() => {
    if (!id) return;
    loadTree(id);
  }, [id]);

  async function loadTree(treeId: string) {
    setTreeLoading(true);
    setTreeError(false);
    try {
      const result = await api<{ tree: Tree }>(`/api/trees/${treeId}`);
      setTreeData(result.tree);
      setTreeName(result.tree.name);
      setNodes(result.tree.nodes);
    } catch {
      setTreeError(true);
    } finally {
      setTreeLoading(false);
    }
  }

  async function handleRename(name: string) {
    if (!id) return;
    setTreeName(name);
    try {
      await api(`/api/trees/${id}`, {
        method: "PUT",
        body: { name, nodes },
      });
    } catch {
      // Silent fail — auto-save will retry
    }
  }

  async function handleShare() {
    if (!id) return;
    try {
      const result = await api<{ shareToken: string; shareUrl: string }>(
        `/api/trees/${id}/share`,
        { method: "POST" }
      );
      await navigator.clipboard.writeText(result.shareUrl);
      showToast("Link copied. Anyone with this link can view your tree.");
    } catch {
      showToast("Couldn't generate share link. Try again.");
    }
  }

  async function handleGenerateSummary(): Promise<string> {
    if (!id) throw new Error("No tree ID");
    const result = await api<{ summary: string }>(
      `/api/trees/${id}/summarize`,
      { method: "POST" }
    );
    return result.summary;
  }

  function handleZoomIn() {
    flowRef.current?.zoomIn();
  }

  function handleZoomOut() {
    flowRef.current?.zoomOut();
  }

  function handleFitView() {
    flowRef.current?.fitView({ padding: 0.1, duration: 300 });
  }

  const handleFlowReady = useCallback((instance: ReactFlowInstance) => {
    flowRef.current = instance;
    setZoom(instance.getZoom());
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  // Toast state — two-phase: visible (with enter), then exiting (with exit animation)
  const [toast, setToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    // Cancel any running exit
    if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
    setToastExiting(false);
    setToast(message);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      // Start exit animation, then remove from DOM
      setToastExiting(true);
      toastExitTimerRef.current = setTimeout(() => {
        setToast(null);
        setToastExiting(false);
      }, 200); // matches toast-exit duration
    }, 4000);
  }

  if (treeLoading) {
    return (
      <div className="tree-page">
        <AppHeader />
        <div className="tree-canvas-loading">
          <div className="tree-canvas-loading__spinner" />
          <p className="tree-canvas-loading__text">Loading tree...</p>
        </div>
        <style>{`
          .tree-page {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: var(--color-bg-canvas);
          }
          .tree-canvas-loading {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
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

  if (treeError) {
    return (
      <div className="tree-page">
        <AppHeader />
        <div className="tree-canvas-error">
          <p className="tree-canvas-error__heading">Couldn't load this tree.</p>
          <p className="tree-canvas-error__body">
            It may have been deleted, or something went wrong.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            Back to dashboard
          </button>
        </div>
        <style>{`
          .tree-page { display: flex; flex-direction: column; height: 100vh; }
          .tree-canvas-error {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--space-3);
            text-align: center;
            padding: var(--space-8);
          }
          .tree-canvas-error__heading {
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
          }
          .tree-canvas-error__body {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            margin-bottom: var(--space-3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="tree-page">
      <AppHeader saveStatus={saveStatus} />

      <TreeToolbar
        treeName={treeName}
        onRename={handleRename}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onShare={handleShare}
        onSummarize={() => setSummaryOpen(true)}
        isSummaryOpen={summaryOpen}
        summarizeBtnRef={summarizeBtnRef}
      />

      {/* Desktop-only message for narrow viewports */}
      <div className="desktop-only-message tree-page-narrow-msg" aria-live="polite">
        <Monitor size={48} aria-hidden="true" />
        <h2 className="desktop-only-message__heading">Best on a larger screen</h2>
        <p className="desktop-only-message__body">
          Revenue Driver Tree is built for desktop. Open it on a computer or
          expand your browser window.
        </p>
      </div>

      <div className="tree-canvas-area">
        <TreeCanvas
          onFlowReady={handleFlowReady}
          onZoomChange={handleZoomChange}
        />

        <SummaryPanel
          isOpen={summaryOpen}
          onClose={() => {
            setSummaryOpen(false);
            // Return focus to the Summarize button when the panel closes
            setTimeout(() => summarizeBtnRef.current?.focus(), 50);
          }}
          treeId={id ?? ""}
          onGenerate={handleGenerateSummary}
        />
      </div>

      {/* Visually hidden live region — announces tree recalculations to screen readers */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="text"
      >
        {recalcAnnouncement}
      </div>

      {/* Share/copy toast */}
      {toast && (
        <div
          className={`toast${toastExiting ? " toast--exit" : ""}`}
          role="status"
          aria-live="polite"
        >
          <Check size={16} style={{ color: "var(--color-text-inverse)", flexShrink: 0 }} />
          {toast}
        </div>
      )}

      <style>{`
        .tree-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .tree-canvas-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .tree-page-narrow-msg {
          display: none;
        }

        /* Below 1024px: show desktop gate, hide tree canvas */
        @media (max-width: 1023px) {
          .tree-page-narrow-msg {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: var(--space-8);
            text-align: center;
            background: var(--color-bg);
            gap: var(--space-4);
            color: var(--color-text-tertiary);
          }

          .tree-page-narrow-msg .desktop-only-message__heading {
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
          }

          .tree-page-narrow-msg .desktop-only-message__body {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            max-width: 320px;
          }

          .tree-canvas-area {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
