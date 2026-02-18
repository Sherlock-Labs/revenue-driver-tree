/**
 * SummaryPanel — Right-side overlay panel for AI scenario summaries.
 *
 * States: pre-generation, loading, success, error.
 * Slides in from the right, overlays the canvas.
 * Design spec Section 9
 */

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";

type PanelState = "idle" | "loading" | "success" | "error";

interface SummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  onGenerate: () => Promise<string>;
}

export function SummaryPanel({
  isOpen,
  onClose,
  treeId,
  onGenerate,
}: SummaryPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [summary, setSummary] = useState<string>("");
  const [loadingText, setLoadingText] = useState("Generating summary...");
  const [copied, setCopied] = useState(false);
  const [loadingTimer, setLoadingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Update loading text after 5s
  useEffect(() => {
    if (panelState === "loading") {
      const timer = setTimeout(() => {
        setLoadingText("Still analyzing...");
      }, 5000);
      setLoadingTimer(timer);
      return () => clearTimeout(timer);
    } else {
      setLoadingText("Generating summary...");
      if (loadingTimer) clearTimeout(loadingTimer);
    }
  }, [panelState]);

  async function handleGenerate() {
    setPanelState("loading");
    setLoadingText("Generating summary...");
    try {
      const text = await onGenerate();
      setSummary(text);
      setPanelState("success");
    } catch {
      setPanelState("error");
    }
  }

  async function handleCopy() {
    const textToCopy = `${summary}\n\nBuilt with Revenue Driver Tree`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently fail
    }
  }

  function handleRegenerate() {
    handleGenerate();
  }

  return (
    <>
      <div
        className={`summary-panel${isOpen ? " summary-panel--open" : ""}`}
        role="complementary"
        aria-label="Scenario summary"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="summary-panel__header">
          <span className="summary-panel__title">Scenario summary</span>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close summary panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="summary-panel__body">
          {panelState === "idle" && (
            <div className="summary-panel__intro">
              <p className="summary-panel__intro-text">
                Get a board-ready narrative of your current plan. AI analyzes
                your numbers, highlights growth drivers, flags risks, and
                explains what needs to be true.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
              >
                <Sparkles size={16} />
                Summarize this scenario
              </button>
            </div>
          )}

          {panelState === "loading" && (
            <div className="summary-panel__loading">
              <Loader2 size={24} className="summary-panel__loading-spinner" />
              <p className="summary-panel__loading-text">{loadingText}</p>
            </div>
          )}

          {panelState === "success" && (
            <div className="summary-panel__content">
              <div className="summary-panel__text">
                {summary.split("\n\n").map((para, i) => (
                  <p key={i} style={{ marginBottom: "var(--space-4)" }}>
                    {para}
                  </p>
                ))}
              </div>
              <div className="summary-panel__attribution">
                Built with Revenue Driver Tree
              </div>
            </div>
          )}

          {panelState === "error" && (
            <div className="summary-panel__error">
              <AlertCircle size={24} style={{ color: "var(--color-error)" }} />
              <p className="summary-panel__error-text">
                Couldn't generate summary. Try again.
              </p>
              <button
                className="btn btn-secondary"
                onClick={handleGenerate}
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer — only shown when summary is available */}
        {panelState === "success" && (
          <div className="summary-panel__footer">
            <button
              className="btn btn-secondary btn-compact"
              onClick={handleCopy}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button
              className="btn-ghost btn summary-panel__regenerate-btn"
              onClick={handleRegenerate}
              style={{ height: 32, padding: "0 var(--space-3)" }}
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
          </div>
        )}
      </div>

      <style>{`
        .summary-panel {
          position: fixed;
          top: 104px; /* 56px header + 48px toolbar */
          right: 0;
          bottom: 0;
          width: 420px;
          background: var(--color-bg-card);
          border-left: 1px solid var(--color-border);
          box-shadow: var(--shadow-panel);
          z-index: var(--z-panel);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateX(100%);
          transition: transform var(--duration-panel) var(--ease-out);
          pointer-events: none;
        }

        .summary-panel--open {
          transform: translateX(0);
          pointer-events: all;
        }

        .summary-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }

        .summary-panel__title {
          font-size: var(--text-sm);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: 1;
        }

        .summary-panel__body {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-5);
        }

        .summary-panel__intro {
          text-align: center;
          padding: var(--space-8) var(--space-4);
        }

        .summary-panel__intro-text {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
          margin-bottom: var(--space-6);
        }

        .summary-panel__loading {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .summary-panel__loading-spinner {
          color: var(--color-text-tertiary);
          animation: spin 0.6s linear infinite;
        }

        .summary-panel__loading-text {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
        }

        .summary-panel__content {
          /* Plain text content */
        }

        .summary-panel__text {
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          line-height: var(--leading-relaxed);
        }

        .summary-panel__attribution {
          margin-top: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border-muted);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          line-height: 1;
        }

        .summary-panel__error {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .summary-panel__error-text {
          font-size: var(--text-sm);
          color: var(--color-text-primary);
        }

        .summary-panel__footer {
          padding: var(--space-4) var(--space-5);
          border-top: 1px solid var(--color-border);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .summary-panel__regenerate-btn {
          color: var(--color-text-tertiary);
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
        }

        .summary-panel__regenerate-btn:hover {
          color: var(--color-text-primary);
        }

        /* Responsive: full width on narrow screens */
        @media (max-width: 1023px) {
          .summary-panel {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
