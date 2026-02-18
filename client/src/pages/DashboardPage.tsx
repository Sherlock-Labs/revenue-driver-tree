/**
 * DashboardPage — Lists user's saved trees.
 *
 * States: loading (3 skeleton cards), empty state, error, tree list.
 * Create button navigates to /dashboard/new.
 * Delete triggers confirmation modal.
 * Design spec Section 4
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor } from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader.js";
import { TreeCard } from "../components/dashboard/TreeCard.js";
import { api } from "../lib/api.js";
import type { TreeSummary } from "../../../shared/schemas/tree.js";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteDisabled, setDeleteDisabled] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTrees();
  }, []);

  async function loadTrees() {
    setLoading(true);
    setError(false);
    try {
      const result = await api<{ trees: TreeSummary[] }>("/api/trees");
      setTrees(result.trees);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const result = await api<{ tree: { id: string } }>(
        `/api/trees/${id}/duplicate`,
        { method: "POST" }
      );
      navigate(`/tree/${result.tree.id}`);
    } catch {
      // Silent fail — could add toast here
    }
  }

  function openDeleteModal(id: string, name: string) {
    setDeleteModal({ id, name });
    setDeleteDisabled(true);
    // Enable delete button after 2 seconds
    setTimeout(() => setDeleteDisabled(false), 2000);
  }

  function closeDeleteModal() {
    setDeleteModal(null);
  }

  async function confirmDelete() {
    if (!deleteModal || deleting) return;
    setDeleting(true);
    try {
      await api(`/api/trees/${deleteModal.id}`, { method: "DELETE" });
      setTrees((prev) => prev.filter((t) => t.id !== deleteModal.id));
      closeDeleteModal();
    } catch {
      // Silent fail
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dashboard-page">
      <AppHeader />

      {/* Desktop-only gate for narrow viewports */}
      <div className="desktop-only-message" aria-live="polite">
        <Monitor size={48} />
        <h2 className="desktop-only-message__heading">Best on a larger screen</h2>
        <p className="desktop-only-message__body">
          Revenue Driver Tree is built for desktop. Open it on a computer or
          expand your browser window.
        </p>
      </div>

      <main className="dashboard">
        <div className="page-container">
          <div className="dashboard__header">
            <h1 className="dashboard__title">Your trees</h1>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/dashboard/new")}
            >
              Create a tree
            </button>
          </div>

          {/* Loading state — 3 skeleton cards */}
          {loading && (
            <div className="dashboard__grid">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="dashboard-error">
              <h2 className="dashboard-error__heading">
                Couldn't load your trees.
              </h2>
              <p className="dashboard-error__body">
                Something went wrong. Please try again.
              </p>
              <button className="btn btn-secondary" onClick={loadTrees}>
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && trees.length === 0 && (
            <div className="dashboard-empty">
              <h2 className="dashboard-empty__heading">No trees yet.</h2>
              <p className="dashboard-empty__body">
                Create your first revenue plan — enter a few numbers and we'll
                build the tree for you.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/dashboard/new")}
              >
                Create a tree
              </button>
            </div>
          )}

          {/* Tree list */}
          {!loading && !error && trees.length > 0 && (
            <div className="dashboard__grid">
              {trees.map((tree) => (
                <TreeCard
                  key={tree.id}
                  tree={tree}
                  onDuplicate={handleDuplicate}
                  onDelete={openDeleteModal}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="modal delete-modal">
            <h2
              className="delete-modal__title"
              id="delete-modal-title"
            >
              Delete &ldquo;{deleteModal.name}&rdquo;?
            </h2>
            <p className="delete-modal__body">This can't be undone.</p>
            <div className="delete-modal__actions">
              <button
                className="btn btn-secondary"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-destructive"
                onClick={confirmDelete}
                disabled={deleteDisabled || deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-bg);
        }

        .dashboard {
          flex: 1;
        }

        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-8) var(--space-6);
        }

        .dashboard__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-8);
        }

        .dashboard__title {
          font-size: var(--text-2xl);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
        }

        .dashboard__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: var(--space-5);
        }

        .dashboard-empty {
          text-align: center;
          padding: var(--space-20) var(--space-6);
        }

        .dashboard-empty__heading {
          font-size: var(--text-lg);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-2);
        }

        .dashboard-empty__body {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-normal);
          margin-bottom: var(--space-6);
        }

        .dashboard-error {
          text-align: center;
          padding: var(--space-20) var(--space-6);
        }

        .dashboard-error__heading {
          font-size: var(--text-lg);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-2);
        }

        .dashboard-error__body {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-normal);
          margin-bottom: var(--space-6);
        }

        .delete-modal {
          max-width: 400px;
        }

        .delete-modal__title {
          font-size: var(--text-lg);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
        }

        .delete-modal__body {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-normal);
          margin: var(--space-3) 0 var(--space-6);
        }

        .delete-modal__actions {
          display: flex;
          gap: var(--space-3);
          justify-content: flex-end;
        }

        /* Below 1024px: show desktop gate, hide dashboard content */
        @media (max-width: 1023px) {
          .desktop-only-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 56px);
            padding: var(--space-8);
            text-align: center;
            background: var(--color-bg);
            gap: var(--space-4);
            color: var(--color-text-tertiary);
          }

          .desktop-only-message__heading {
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
            margin-bottom: var(--space-2);
          }

          .desktop-only-message__body {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            max-width: 320px;
          }

          .dashboard {
            display: none;
          }
        }

        /* 1024px-1279px: tighten dashboard grid to 2 columns */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .dashboard__grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-container {
            padding: var(--space-6) var(--space-5);
          }
        }
      `}</style>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="tree-card-skeleton">
      <div className="skeleton" style={{ width: "60%", height: 20, marginBottom: "var(--space-4)" }} />
      <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ width: "80%", height: 16, marginBottom: "var(--space-4)" }} />
      <div
        style={{ borderTop: "1px solid var(--color-border-muted)", paddingTop: "var(--space-3)" }}
      >
        <div className="skeleton" style={{ width: "40%", height: 12 }} />
      </div>

      <style>{`
        .tree-card-skeleton {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
        }
      `}</style>
    </div>
  );
}
