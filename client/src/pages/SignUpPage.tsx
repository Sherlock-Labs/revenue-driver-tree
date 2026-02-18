/**
 * SignUpPage — Clerk <SignUp /> centered on page.
 *
 * Full-page layout: logo header + centered Clerk widget.
 * Design spec Section 5.
 */

import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <Link to="/" className="auth-page__logo">
          Revenue Driver Tree
        </Link>
      </header>

      <main className="auth-page__content">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          appearance={{
            variables: {
              colorPrimary: "#171717",
              colorText: "#171717",
              colorBackground: "#FFFFFF",
              colorInputBackground: "#FFFFFF",
              colorInputText: "#171717",
              borderRadius: "8px",
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            },
            elements: {
              card: "auth-clerk-card",
              formButtonPrimary: "btn btn-primary",
              footerActionLink: "auth-clerk-link",
            },
          }}
        />
      </main>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-canvas);
        }

        .auth-page__header {
          height: 56px;
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--color-border-muted);
          background: var(--color-bg-elevated);
        }

        .auth-page__logo {
          font-size: var(--text-sm);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          letter-spacing: var(--tracking-tight);
          text-decoration: none;
        }

        .auth-page__logo:hover {
          color: var(--color-text-primary);
        }

        .auth-page__content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-4);
        }

        /* Clerk card overrides */
        .auth-clerk-card {
          box-shadow: var(--shadow-lg) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-xl) !important;
        }

        .auth-clerk-link {
          color: var(--color-brand) !important;
          font-weight: var(--weight-medium) !important;
        }
      `}</style>
    </div>
  );
}
