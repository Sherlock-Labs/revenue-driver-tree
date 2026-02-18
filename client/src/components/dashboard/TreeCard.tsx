/**
 * TreeCard — Dashboard card for a saved tree.
 *
 * Shows: name, target ARR, current plan ARR, gap (color-coded), last modified.
 * Clicking navigates to /tree/:id.
 * Three-dot menu: Duplicate, Delete.
 *
 * Design spec Section 4.2
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Copy, Trash2 } from "lucide-react";
import type { TreeSummary } from "../../../../shared/schemas/tree.js";
import { formatValue } from "../../lib/tree-engine.js";

interface TreeCardProps {
  tree: TreeSummary;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TreeCard({ tree, onDuplicate, onDelete }: TreeCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleCardClick(e: React.MouseEvent) {
    // Don't navigate if clicking the menu
    const target = e.target as HTMLElement;
    if (target.closest(".tree-card-menu") || target.closest(".tree-card__menu-button")) return;
    navigate(`/tree/${tree.id}`);
  }

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  }

  function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    onDuplicate(tree.id);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(tree.id, tree.name);
  }

  const gapColor =
    tree.gap >= 0 ? "var(--color-status-on-track)" : "var(--color-status-behind)";

  return (
    <div
      className="tree-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/tree/${tree.id}`)}
      aria-label={`Open tree: ${tree.name}`}
    >
      <div className="tree-card__header">
        <span className="tree-card__name" title={tree.name}>
          {tree.name}
        </span>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            className="icon-btn icon-btn--md tree-card__menu-button"
            onClick={handleMenuClick}
            aria-label="Tree options"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="tree-card-menu" role="menu">
              <button
                className="tree-card-menu__item"
                onClick={handleDuplicate}
                role="menuitem"
              >
                <Copy size={14} />
                Duplicate
              </button>
              <button
                className="tree-card-menu__item tree-card-menu__item--destructive"
                onClick={handleDelete}
                role="menuitem"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="tree-card__metrics">
        <div className="tree-card__metric">
          <span className="tree-card__metric-label">Target ARR</span>
          <span className="tree-card__metric-value">
            {formatValue(tree.targetARR, "currency")}
          </span>
        </div>
        <div className="tree-card__metric">
          <span className="tree-card__metric-label">Current plan</span>
          <span className="tree-card__metric-value">
            {formatValue(tree.currentPlanARR, "currency")}
          </span>
        </div>
        <div className="tree-card__metric">
          <span className="tree-card__metric-label">Gap</span>
          <span
            className="tree-card__metric-value"
            style={{ color: gapColor }}
          >
            {tree.gap >= 0 ? "+" : ""}
            {formatValue(tree.gap, "currency")}
          </span>
        </div>
      </div>

      <div className="tree-card__footer">
        <span className="tree-card__date">
          Last edited {formatRelativeTime(tree.updatedAt)}
        </span>
      </div>

      <style>{`
        .tree-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          cursor: pointer;
          transition: border-color var(--duration-fast) var(--ease-default);
          position: relative;
          user-select: none;
        }

        .tree-card:hover {
          border-color: var(--color-border-strong);
        }

        .tree-card:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .tree-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-4);
        }

        .tree-card__name {
          font-size: var(--text-base);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-snug);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 240px;
        }

        .tree-card__menu-button {
          color: var(--color-text-tertiary);
          flex-shrink: 0;
        }

        .tree-card-menu {
          position: absolute;
          top: 36px;
          right: 0;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          min-width: 160px;
          z-index: var(--z-modal);
          padding: var(--space-1) 0;
        }

        .tree-card-menu__item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          width: 100%;
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          cursor: pointer;
          transition: background var(--duration-fast) var(--ease-default);
          background: transparent;
          border: none;
          text-align: left;
        }

        .tree-card-menu__item:hover {
          background: var(--color-bg-hover);
        }

        .tree-card-menu__item--destructive {
          color: var(--color-error);
        }

        .tree-card-menu__item--destructive:hover {
          background: #fef2f2;
        }

        .tree-card__metrics {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .tree-card__metric {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .tree-card__metric-label {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          line-height: 1;
        }

        .tree-card__metric-value {
          font-size: var(--text-sm);
          font-weight: var(--weight-semibold);
          font-family: var(--font-mono);
          color: var(--color-text-primary);
          line-height: 1;
        }

        .tree-card__footer {
          margin-top: var(--space-4);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border-muted);
        }

        .tree-card__date {
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
