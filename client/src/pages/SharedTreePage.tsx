/**
 * SharedTreePage — Read-only public view of a shared tree.
 *
 * Loads tree by share token. All editing disabled.
 * Banner: "You're viewing a shared revenue plan." + sign-up CTA.
 * Uses same TreeCanvas (readOnly=true), TreeToolbar (readOnly=true).
 * Design spec Section 7.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Monitor } from "lucide-react";
import { TreeCanvas } from "../components/tree/TreeCanvas.js";
import { TreeToolbar } from "../components/layout/TreeToolbar.js";
import { useTreeStore } from "../stores/tree-store.js";
import { api } from "../lib/api.js";
import type { Tree } from "../../../shared/schemas/tree.js";
import type { ReactFlowInstance } from "@xyflow/react";

export default function SharedTreePage() {
  const { token } = useParams<{ token: string }>();
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState(false);
  const [treeName, setTreeName] = useState("Revenue Plan");
  const [zoom, setZoom] = useState(1);
  const flowRef = useRef<ReactFlowInstance | null>(null);

  const setNodes = useTreeStore((s) => s.setNodes);

  useEffect(() => {
    if (!token) return;
    loadSharedTree(token);
  }, [token]);

  async function loadSharedTree(shareToken: string) {
    setTreeLoading(true);
    setTreeError(false);
    try {
      const result = await api<{ tree: Tree }>(`/api/shared/${shareToken}`);
      setTreeName(result.tree.name);
      setNodes(result.tree.nodes);
    } catch {
      setTreeError(true);
    } finally {
      setTreeLoading(false);
    }
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

  if (treeLoading) {
    return (
      <div className="shared-tree-page">
        <SharedHeader />
        <div className="shared-tree-loading">
          <div className="shared-tree-loading__spinner" />
          <p className="shared-tree-loading__text">Loading tree...</p>
        </div>
        <SharedStyles />
      </div>
    );
  }

  if (treeError) {
    return (
      <div className="shared-tree-page">
        <SharedHeader />
        <div className="shared-tree-error">
          <p className="shared-tree-error__heading">This link isn't working.</p>
          <p className="shared-tree-error__body">
            The shared tree may have expired or been removed.
          </p>
          <Link to="/sign-up" className="btn btn-primary">
            Create your own tree — free
          </Link>
        </div>
        <SharedStyles />
      </div>
    );
  }

  return (
    <div className="shared-tree-page">
      {/* Shared banner */}
      <div className="shared-tree-banner">
        <span className="shared-tree-banner__text">
          You're viewing a shared revenue plan.
        </span>
        <Link to="/sign-up" className="btn btn-primary btn-compact shared-tree-banner__cta">
          Create your own — free
        </Link>
      </div>

      <TreeToolbar
        treeName={treeName}
        onRename={() => {}}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onShare={() => {}}
        onSummarize={() => {}}
        isSummaryOpen={false}
        readOnly={true}
      />

      {/* Desktop-only message for narrow viewports */}
      <div className="desktop-only-message shared-tree-narrow-msg" aria-live="polite">
        <Monitor size={48} />
        <h2 className="desktop-only-message__heading">Best on a larger screen</h2>
        <p className="desktop-only-message__body">
          Revenue Driver Tree is built for desktop. Open it on a computer or
          expand your browser window.
        </p>
      </div>

      <div className="shared-tree-canvas-area">
        <TreeCanvas
          onFlowReady={handleFlowReady}
          onZoomChange={handleZoomChange}
          readOnly={true}
        />
      </div>

      <SharedStyles />
    </div>
  );
}

function SharedHeader() {
  return (
    <header className="shared-tree-header">
      <Link to="/" className="shared-tree-header__logo">
        Revenue Driver Tree
      </Link>
      <Link to="/sign-up" className="btn btn-primary btn-compact">
        Create your own — free
      </Link>
    </header>
  );
}

function SharedStyles() {
  return (
    <style>{`
      .shared-tree-page {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
        background: var(--color-bg-canvas);
      }

      .shared-tree-header {
        height: 56px;
        padding: 0 var(--space-6);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--color-bg-elevated);
        border-bottom: 1px solid var(--color-border);
        flex-shrink: 0;
      }

      .shared-tree-header__logo {
        font-size: var(--text-sm);
        font-weight: var(--weight-bold);
        color: var(--color-text-primary);
        letter-spacing: var(--tracking-tight);
        text-decoration: none;
      }

      .shared-tree-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-2) var(--space-6);
        background: var(--color-brand-muted);
        border-bottom: 1px solid var(--color-border-muted);
        flex-shrink: 0;
      }

      .shared-tree-banner__text {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        line-height: 1;
      }

      .shared-tree-canvas-area {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .shared-tree-loading {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
      }

      .shared-tree-loading__spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--color-border);
        border-top-color: var(--color-text-tertiary);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      .shared-tree-loading__text {
        font-size: var(--text-sm);
        color: var(--color-text-tertiary);
      }

      .shared-tree-error {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        text-align: center;
        padding: var(--space-8);
      }

      .shared-tree-error__heading {
        font-size: var(--text-lg);
        font-weight: var(--weight-semibold);
        color: var(--color-text-primary);
      }

      .shared-tree-error__body {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        margin-bottom: var(--space-3);
      }

      .shared-tree-narrow-msg {
        display: none;
      }

      @media (max-width: 767px) {
        .shared-tree-narrow-msg {
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

        .shared-tree-narrow-msg .desktop-only-message__heading {
          font-size: var(--text-lg);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
        }

        .shared-tree-narrow-msg .desktop-only-message__body {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          max-width: 320px;
        }

        .shared-tree-canvas-area {
          display: none;
        }

        .shared-tree-banner {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-2);
        }
      }
    `}</style>
  );
}
