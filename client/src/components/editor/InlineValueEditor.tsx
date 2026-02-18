/**
 * InlineValueEditor — Click-to-edit number input for node values.
 *
 * Appears when user clicks a node value. Auto-selects text on mount.
 * Enter to confirm, Escape to cancel, Tab to confirm.
 * Design spec Section 7.3
 */

import { useRef, useEffect, useState } from "react";

interface InlineValueEditorProps {
  value: number;
  type: "currency" | "percentage" | "count";
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

export function InlineValueEditor({
  value,
  type,
  onConfirm,
  onCancel,
}: InlineValueEditorProps) {
  // Display raw numbers for editing — format on confirm
  const initialDisplay =
    type === "percentage" ? (value * 100).toFixed(1) : value.toString();

  const [inputValue, setInputValue] = useState(initialDisplay);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-select all text on mount
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  function handleConfirm() {
    const parsed = parseFloat(inputValue.replace(/,/g, ""));
    if (isNaN(parsed) || parsed < 0) {
      setError(true);
      return;
    }

    // Convert back: percentage input is in % units, store as decimal
    const finalValue = type === "percentage" ? parsed / 100 : parsed;
    onConfirm(finalValue);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Stop React Flow from capturing keyboard events
    e.stopPropagation();

    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleConfirm();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setError(false);
  }

  function handleBlur() {
    handleConfirm();
  }

  return (
    <div className="inline-editor nodrag nopan" style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className={`inline-editor__input${error ? " inline-editor__input--error" : ""}`}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        type="text"
        inputMode="decimal"
        aria-label="Edit value"
        aria-invalid={error}
      />
      {error && (
        <span className="inline-editor__error-text">
          Enter a positive number
        </span>
      )}

      <style>{`
        .inline-editor {
          width: 100%;
        }

        .inline-editor__input {
          width: 100%;
          height: 28px;
          border: 1px solid var(--color-brand);
          border-radius: var(--radius-sm);
          padding: 0 var(--space-2);
          font-family: var(--font-mono);
          font-size: var(--text-base);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          background: var(--color-bg-input);
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08);
          outline: none;
          text-align: left;
        }

        .inline-editor__input--error {
          border-color: var(--color-error);
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
        }

        .inline-editor__error-text {
          position: absolute;
          bottom: -18px;
          left: 0;
          font-size: var(--text-xs);
          font-family: var(--font-sans);
          color: var(--color-error);
          white-space: nowrap;
          line-height: 1;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
