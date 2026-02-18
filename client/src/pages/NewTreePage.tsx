/**
 * NewTreePage — Onboarding flow: create a new revenue plan.
 *
 * Full-page layout: AppHeader + centered CreateTreeForm.
 * Navigates to /tree/:id after successful creation.
 * Design spec Section 4.3
 */

import { AppHeader } from "../components/layout/AppHeader.js";
import { CreateTreeForm } from "../components/dashboard/CreateTreeForm.js";

export default function NewTreePage() {
  return (
    <div className="new-tree-page">
      <AppHeader />

      <main className="new-tree-page__content">
        <div className="new-tree-page__container">
          <div className="new-tree-page__heading-group">
            <h1 className="new-tree-page__title">Build your revenue plan</h1>
            <p className="new-tree-page__subtitle">
              Enter your metrics and AI will generate a complete revenue driver
              tree in seconds.
            </p>
          </div>

          <CreateTreeForm />
        </div>
      </main>

      <style>{`
        .new-tree-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
        }

        .new-tree-page__content {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--space-12) var(--space-6) var(--space-16);
        }

        .new-tree-page__container {
          width: 100%;
          max-width: 680px;
        }

        .new-tree-page__heading-group {
          margin-bottom: var(--space-8);
        }

        .new-tree-page__title {
          font-size: var(--text-2xl);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-2);
        }

        .new-tree-page__subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-normal);
        }

        @media (max-width: 767px) {
          .new-tree-page__content {
            padding: var(--space-6) var(--space-4) var(--space-10);
          }

          .new-tree-page__title {
            font-size: var(--text-xl);
          }
        }
      `}</style>
    </div>
  );
}
