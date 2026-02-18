/**
 * AppHeader — Sticky header for authenticated pages.
 * Design spec Section 2.1
 */

import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Check, AlertCircle, Loader2 } from "lucide-react";

type SaveStatus = "saved" | "saving" | "error";

interface AppHeaderProps {
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
}

export function AppHeader({ saveStatus, onRetrySave }: AppHeaderProps) {
  const location = useLocation();
  const isTreePage = location.pathname.startsWith("/tree/");

  return (
    <header className="app-header">
      <div className="app-header__left">
        <Link to="/dashboard" className="app-header__logo">
          Revenue Driver Tree
        </Link>
        <Link to="/dashboard" className="app-header__nav-link">
          Dashboard
        </Link>
      </div>

      <div className="app-header__right">
        {isTreePage && saveStatus && (
          <div className="app-header__save-status" aria-live="polite">
            <SaveStatusIndicator status={saveStatus} onRetry={onRetrySave} />
          </div>
        )}
        <UserButton
          appearance={{
            variables: {
              colorPrimary: "#171717",
              colorText: "#171717",
              colorTextSecondary: "#525252",
              colorBackground: "#FFFFFF",
              borderRadius: "6px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
            },
          }}
        />
      </div>

      <style>{`
        .app-header {
          height: 56px;
          background: var(--color-bg-elevated);
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: var(--z-header);
          flex-shrink: 0;
        }

        .app-header__left {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .app-header__logo {
          font-size: var(--text-sm);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          letter-spacing: var(--tracking-tight);
          text-decoration: none;
          line-height: 1;
        }

        .app-header__nav-link {
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--color-text-tertiary);
          text-decoration: none;
          line-height: 1;
          transition: color var(--duration-fast) var(--ease-default);
        }

        .app-header__nav-link:hover {
          color: var(--color-text-primary);
        }

        .app-header__right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .app-header__save-status {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
        }

        .save-status--saving {
          animation: save-pulse 1s ease-in-out infinite;
        }

        @keyframes save-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .save-status--error {
          color: var(--color-warning);
        }

        .save-status--persistent-error {
          color: var(--color-error);
        }

        .save-status__retry {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--color-brand);
          text-decoration: underline;
          cursor: pointer;
          margin-left: var(--space-2);
          background: none;
          border: none;
          padding: 0;
        }

        .save-status__spinner {
          animation: spin 0.6s linear infinite;
        }
      `}</style>
    </header>
  );
}

function SaveStatusIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry?: () => void;
}) {
  if (status === "saved") {
    return (
      <>
        <Check size={14} />
        <span>Saved</span>
      </>
    );
  }

  if (status === "saving") {
    return (
      <span className="save-status--saving" style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
        <Loader2 size={14} className="save-status__spinner" />
        <span>Saving...</span>
      </span>
    );
  }

  // error state
  return (
    <span className="save-status--error" style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
      <AlertCircle size={14} />
      <span>Save failed — retrying...</span>
      {onRetry && (
        <button className="save-status__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </span>
  );
}
