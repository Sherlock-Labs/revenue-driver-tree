/**
 * TreeToolbar — Toolbar beneath AppHeader on the tree view page.
 * Design spec Section 6.2
 */

import { useState, useRef, type RefObject } from "react";
import {
  Minus,
  Plus,
  Maximize2,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { useTreeStore } from "../../stores/tree-store.js";
import type { ReactFlowInstance } from "@xyflow/react";

interface TreeToolbarProps {
  treeName: string;
  onRename: (name: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onShare: () => void;
  onSummarize: () => void;
  isSummaryOpen: boolean;
  readOnly?: boolean;
  flowInstance?: ReactFlowInstance | null;
  /** Forwarded ref for the Summarize button — used to return focus when summary panel closes */
  summarizeBtnRef?: RefObject<HTMLButtonElement>;
}

export function TreeToolbar({
  treeName,
  onRename,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onShare,
  onSummarize,
  isSummaryOpen,
  readOnly = false,
  summarizeBtnRef,
}: TreeToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(treeName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const canUndo = useTreeStore((s) => s.undoStack.length > 0);
  const canRedo = useTreeStore((s) => s.redoStack.length > 0);
  const undo = useTreeStore((s) => s.undo);
  const redo = useTreeStore((s) => s.redo);

  function startEditingName() {
    if (readOnly) return;
    setEditedName(treeName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function confirmName() {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== treeName) {
      onRename(trimmed);
    }
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmName();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  }

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="tree-toolbar">
      <div className="tree-toolbar__left">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            className="tree-toolbar__name-input"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={confirmName}
            onKeyDown={handleNameKeyDown}
            autoFocus
            aria-label="Tree name. Press Enter to confirm, Escape to cancel."
          />
        ) : (
          <span
            className="tree-toolbar__name"
            onClick={startEditingName}
            title={readOnly ? undefined : "Click to rename"}
            role={readOnly ? undefined : "button"}
            aria-label={readOnly ? treeName : `Rename: ${treeName}. Press Enter to edit.`}
            tabIndex={readOnly ? undefined : 0}
            onKeyDown={
              readOnly
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startEditingName();
                    }
                  }
            }
          >
            {treeName}
          </span>
        )}

        {!readOnly && (
          <>
            <div className="tree-toolbar__divider" />

            <div className="tree-toolbar__zoom-controls">
              <button
                className="icon-btn tree-toolbar__zoom-btn"
                onClick={onZoomOut}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus size={14} />
              </button>
              <span className="tree-toolbar__zoom-level">{zoomPercent}%</span>
              <button
                className="icon-btn tree-toolbar__zoom-btn"
                onClick={onZoomIn}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus size={14} />
              </button>
              <button
                className="icon-btn tree-toolbar__zoom-btn"
                onClick={onFitView}
                title="Fit to screen"
                aria-label="Fit to screen"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <div className="tree-toolbar__divider" />

            <div className="tree-toolbar__undo-redo">
              <button
                className="icon-btn tree-toolbar__undo-btn"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Cmd+Z)"
                aria-label="Undo"
              >
                <Undo2 size={14} />
              </button>
              <button
                className="icon-btn tree-toolbar__redo-btn"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Cmd+Shift+Z)"
                aria-label="Redo"
              >
                <Redo2 size={14} />
              </button>
            </div>
          </>
        )}

        {readOnly && (
          <>
            <div className="tree-toolbar__divider" />
            <div className="tree-toolbar__zoom-controls">
              <button
                className="icon-btn tree-toolbar__zoom-btn"
                onClick={onZoomOut}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus size={14} />
              </button>
              <span className="tree-toolbar__zoom-level">{zoomPercent}%</span>
              <button
                className="icon-btn tree-toolbar__zoom-btn"
                onClick={onZoomIn}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus size={14} />
              </button>
              <button
                className="icon-btn tree-toolbar__zoom-btn"
                onClick={onFitView}
                title="Fit to screen"
                aria-label="Fit to screen"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {!readOnly && (
        <div className="tree-toolbar__right">
          <button
            className="btn btn-secondary btn-compact"
            onClick={onShare}
            aria-label="Share — copy link to clipboard"
          >
            <LinkIcon size={16} aria-hidden="true" />
            Share
          </button>
          <button
            ref={summarizeBtnRef}
            className="btn btn-primary btn-compact"
            onClick={onSummarize}
            aria-pressed={isSummaryOpen}
            aria-label={isSummaryOpen ? "Close scenario summary panel" : "Open scenario summary panel"}
          >
            <Sparkles size={16} aria-hidden="true" />
            Summarize
          </button>
        </div>
      )}

      <style>{`
        .tree-toolbar {
          height: 48px;
          background: var(--color-bg-elevated);
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: var(--z-toolbar);
          flex-shrink: 0;
        }

        .tree-toolbar__left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .tree-toolbar__name {
          font-size: var(--text-sm);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          cursor: text;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: border-color var(--duration-fast) var(--ease-default);
          line-height: 1;
        }

        .tree-toolbar__name:hover {
          border-color: var(--color-border);
        }

        .tree-toolbar__name:focus {
          border-color: var(--color-brand);
          outline: none;
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08);
        }

        .tree-toolbar__name-input {
          font-size: var(--text-sm);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-brand);
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08);
          outline: none;
          max-width: 300px;
          background: var(--color-bg-input);
          line-height: 1;
        }

        .tree-toolbar__divider {
          width: 1px;
          height: 20px;
          background: var(--color-border);
          flex-shrink: 0;
        }

        .tree-toolbar__zoom-controls {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .tree-toolbar__zoom-btn {
          width: 28px;
          height: 28px;
        }

        .tree-toolbar__zoom-level {
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--color-text-tertiary);
          min-width: 36px;
          text-align: center;
        }

        .tree-toolbar__undo-redo {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .tree-toolbar__right {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }

        /* 1024px-1279px: tighten the toolbar to prevent overflow */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .tree-toolbar {
            padding: 0 var(--space-3);
          }

          .tree-toolbar__name {
            max-width: 180px;
          }

          .tree-toolbar__left {
            gap: var(--space-2);
            min-width: 0;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
}
