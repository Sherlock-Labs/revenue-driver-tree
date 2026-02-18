/**
 * RevenueNode — Custom React Flow node for the revenue tree.
 *
 * Fixed dimensions: 260x120px (input), 260x100px (computed).
 * Contains: name label, value display (click-to-edit), delta indicator,
 * percentage slider, pin/lock toggle, expand/collapse chevron.
 *
 * ALL interactive elements must have className="nodrag" to prevent
 * React Flow from intercepting clicks as drag gestures.
 *
 * Design spec Section 7
 */

import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { TreeNode } from "../../../../shared/schemas/tree.js";
import { formatValue, formatDelta, getStatus } from "../../lib/tree-engine.js";
import { useTreeStore } from "../../stores/tree-store.js";
import { InlineValueEditor } from "../editor/InlineValueEditor.js";
import { PercentageSlider } from "../editor/PercentageSlider.js";
import { buildBranchNodeIds } from "./useExpandCollapse.js";

interface RevenueNodeProps extends NodeProps {
  data: TreeNode;
  readOnly?: boolean;
}

export function RevenueNode({ data, readOnly = false }: RevenueNodeProps) {
  const [isEditing, setIsEditing] = useState(false);

  const updateNodeValue = useTreeStore((s) => s.updateNodeValue);
  const togglePin = useTreeStore((s) => s.togglePin);
  const toggleCollapse = useTreeStore((s) => s.toggleCollapse);
  const allNodes = useTreeStore((s) => s.nodes);

  const branchNodeIds = buildBranchNodeIds(allNodes);
  const hasChildren = branchNodeIds.has(data.id);

  // Compute status
  const status = getStatus(data.value, data.targetValue);

  // Delta
  const delta = data.value - data.targetValue;

  // Determine node variant for class
  const statusClass = data.pinned ? "revenue-node--pinned" : `revenue-node--${status}`;

  // Is this a percentage node with a slider?
  const hasSlider = data.type === "percentage" && data.computeType === "input";

  function handleValueClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly) return;
    setIsEditing(true);
  }

  function handleValueConfirm(newValue: number) {
    updateNodeValue(data.id, newValue);
    setIsEditing(false);
  }

  function handleValueCancel() {
    setIsEditing(false);
  }

  function handlePinClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly) return;
    togglePin(data.id);
  }

  function handleCollapseClick(e: React.MouseEvent) {
    e.stopPropagation();
    toggleCollapse(data.id);
  }

  function handleSliderChange(value: number) {
    updateNodeValue(data.id, value);
  }

  function getDeltaIcon() {
    if (delta >= 0) {
      return <TrendingUp size={12} style={{ color: `var(--color-status-${status})` }} />;
    }
    return <TrendingDown size={12} style={{ color: `var(--color-status-${status})` }} />;
  }

  function getDeltaText() {
    if (Math.abs(delta) < 0.001 && data.type !== "currency") {
      return "On target";
    }
    const formattedDelta = formatDelta(delta, data.type);
    return `${formattedDelta} vs target`;
  }

  const nodeHeight = hasSlider ? 120 : 100;

  return (
    <div
      className={`revenue-node ${statusClass}`}
      style={{ width: 260, height: nodeHeight }}
      role="treeitem"
      aria-label={`${data.name}: ${formatValue(data.value, data.type)}, ${status}`}
      aria-expanded={hasChildren ? !data.collapsed : undefined}
      tabIndex={0}
    >
      {/* Top connection handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ visibility: "hidden", width: 8, height: 8 }}
      />

      {/* Header */}
      <div className="revenue-node__header">
        <span className="revenue-node__name" title={data.name}>
          {data.name}
        </span>

        <div className="revenue-node__actions">
          {/* Pin button — only for computed nodes */}
          {data.computeType !== "input" && (
            <button
              className="icon-btn icon-btn--sm revenue-node__pin-btn nodrag"
              onClick={handlePinClick}
              disabled={readOnly}
              title={data.pinned ? "Unpin node" : "Pin node"}
              aria-label={data.pinned ? "Unpin node" : "Pin node"}
              aria-pressed={data.pinned}
              style={{
                color: data.pinned
                  ? "var(--color-status-pinned)"
                  : "var(--color-text-muted)",
              }}
            >
              {data.pinned ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}

          {/* Collapse button — only for branch nodes with children */}
          {hasChildren && (
            <button
              className="icon-btn icon-btn--sm revenue-node__collapse-btn nodrag"
              onClick={handleCollapseClick}
              title={data.collapsed ? "Expand branch" : "Collapse branch"}
              aria-label={data.collapsed ? "Expand branch" : "Collapse branch"}
            >
              {data.collapsed ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="revenue-node__body">
        {/* Value display or inline editor */}
        {isEditing && !readOnly ? (
          <InlineValueEditor
            value={data.value}
            type={data.type}
            onConfirm={handleValueConfirm}
            onCancel={handleValueCancel}
          />
        ) : (
          <div
            className="revenue-node__value nodrag"
            onClick={readOnly ? undefined : handleValueClick}
            role={readOnly ? undefined : "button"}
            tabIndex={readOnly ? undefined : 0}
            onKeyDown={
              readOnly
                ? undefined
                : (e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") setIsEditing(true);
                  }
            }
            title={readOnly ? undefined : "Click to edit"}
          >
            {formatValue(data.value, data.type)}
          </div>
        )}

        {/* Delta indicator */}
        {!isEditing && (
          <div className="revenue-node__delta">
            {getDeltaIcon()}
            <span
              className="revenue-node__delta-text"
              style={{ color: `var(--color-status-${status})` }}
            >
              {getDeltaText()}
            </span>
          </div>
        )}

        {/* Percentage slider */}
        {hasSlider && !isEditing && (
          <div className="revenue-node__slider">
            <PercentageSlider
              value={data.value}
              onChange={readOnly ? () => {} : handleSliderChange}
              disabled={readOnly}
            />
          </div>
        )}
      </div>

      {/* Bottom connection handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ visibility: "hidden", width: 8, height: 8 }}
      />

      <style>{`
        .revenue-node {
          background: var(--color-bg-card);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: default;
          transition:
            border-color var(--duration-fast) var(--ease-default),
            box-shadow var(--duration-fast) var(--ease-default);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .revenue-node:hover {
          border-color: var(--color-border-strong);
          box-shadow: var(--shadow-sm);
        }

        .revenue-node:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .revenue-node--on-track {
          border-left: 3px solid var(--color-status-on-track);
        }

        .revenue-node--at-risk {
          border-left: 3px solid var(--color-status-at-risk);
        }

        .revenue-node--behind {
          border-left: 3px solid var(--color-status-behind);
        }

        .revenue-node--pinned {
          border-color: var(--color-status-pinned);
          background: var(--color-status-pinned-bg);
        }

        .revenue-node--recalculating {
          animation: recalc-pulse 300ms ease-out;
        }

        .revenue-node--highlight {
          animation: arrive-pulse 600ms ease-out;
        }

        .revenue-node__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px var(--space-3) 0;
          flex-shrink: 0;
        }

        .revenue-node__name {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          font-family: var(--font-sans);
          color: var(--color-text-secondary);
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 160px;
          line-height: var(--leading-tight);
        }

        .revenue-node__actions {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          flex-shrink: 0;
        }

        .revenue-node__pin-btn,
        .revenue-node__collapse-btn {
          transition: color var(--duration-fast), background var(--duration-fast),
            transform var(--duration-fast) var(--ease-spring);
        }

        .revenue-node__pin-btn:active,
        .revenue-node__collapse-btn:active {
          transform: scale(1.15);
        }

        .revenue-node__body {
          padding: var(--space-1-5) var(--space-3) var(--space-3);
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .revenue-node__value {
          font-size: var(--text-lg);
          font-weight: var(--weight-bold);
          font-family: var(--font-mono);
          color: var(--color-text-primary);
          cursor: text;
          padding: var(--space-0-5) 0;
          border-radius: var(--radius-sm);
          line-height: var(--leading-tight);
          transition: background var(--duration-fast);
        }

        .revenue-node__value:hover {
          background: var(--color-bg-hover);
        }

        .revenue-node__delta {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .revenue-node__delta-text {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          font-family: var(--font-sans);
          line-height: 1;
        }

        .revenue-node__slider {
          margin-top: var(--space-2);
        }
      `}</style>
    </div>
  );
}
