/**
 * LandingPage — Marketing page for unauthenticated users.
 *
 * Hero + 4 feature sections + bottom CTA + footer.
 * Uses Priya's exact copy. Robert's Section 3 design spec.
 */

import { Link } from "react-router-dom";

export default function LandingPage() {
  const features = [
    {
      heading: "From blank page to revenue plan in 60 seconds",
      body: "Enter your current ARR, target, customer count, and a few key metrics. AI generates a complete SaaS revenue decomposition — new business pipeline, expansion, churn reduction, pricing — with plausible defaults based on your stage and benchmarks. No formulas. No copy-pasting last quarter's spreadsheet.",
    },
    {
      heading: "Drag a slider. Watch the whole plan respond.",
      body: "Every number in the tree is editable. Click to type. Drag to adjust. The tree recalculates instantly — parent totals update, the gap to target shifts, color coding tells you what's on track and what's not. Pin a node to lock its value and explore scenarios around it.",
    },
    {
      heading: "A summary your board can actually read",
      body: 'Hit "Summarize" and AI turns your scenario into 3-5 paragraphs of executive-ready prose: what the plan achieves, where the growth comes from, what\'s most aggressive, and what needs to be true. Copy it into your planning doc in one click.',
    },
    {
      heading: "Save, duplicate, revisit",
      body: "Your trees auto-save as you work. Duplicate a tree to test a different approach. Come back next quarter and pick up where you left off.",
    },
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header-wrapper">
        <div className="landing-header">
          <span className="landing-header__logo">Revenue Driver Tree</span>
          <div className="landing-header__actions">
            <Link to="/sign-in" className="landing-header__sign-in">
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="btn btn-primary landing-header__cta"
            >
              Build your first tree — free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero-wrapper">
        <div className="landing-hero">
          <h1 className="landing-hero__headline">
            See which levers hit your number.
          </h1>
          <p className="landing-hero__subhead">
            Revenue Driver Tree turns your ARR target into an interactive plan.
            AI builds the tree. You play with the numbers.
          </p>
          <Link
            to="/sign-up"
            className="btn btn-primary btn-large landing-hero__cta"
          >
            Build your first tree — free
          </Link>
        </div>
      </section>

      {/* Feature sections */}
      <div className="landing-features">
        {features.map((feature, i) => (
          <div
            key={i}
            className={`landing-feature${i % 2 === 1 ? " landing-feature--reverse" : ""}`}
          >
            <div className="landing-feature__text">
              <h2 className="landing-feature__heading">{feature.heading}</h2>
              <p className="landing-feature__body">{feature.body}</p>
            </div>
            <div className="landing-feature__image" aria-hidden="true">
              {/* Product screenshot placeholder */}
              <div className="landing-feature__image-placeholder">
                <span>Screenshot</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="landing-bottom-cta">
        <h2 className="landing-bottom-cta__headline">
          Your next planning cycle starts here.
        </h2>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <Link
            to="/sign-up"
            className="btn btn-primary btn-large"
          >
            Build your first tree — free
          </Link>
        </div>
        <p className="landing-bottom-cta__note">
          No credit card. No setup. Enter your numbers, get your plan.
        </p>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© 2026 Sherlock Labs</span>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
        }

        /* Header */
        .landing-header-wrapper {
          border-bottom: 1px solid var(--color-border-muted);
        }

        .landing-header {
          height: 56px;
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .landing-header__logo {
          font-size: var(--text-sm);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          letter-spacing: var(--tracking-tight);
          line-height: 1;
        }

        .landing-header__actions {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }

        .landing-header__sign-in {
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color var(--duration-fast) var(--ease-default);
        }

        .landing-header__sign-in:hover {
          color: var(--color-text-primary);
        }

        /* Hero */
        .landing-hero-wrapper {
          padding: var(--space-24) var(--space-6) var(--space-16);
        }

        .landing-hero {
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
        }

        .landing-hero__headline {
          font-size: var(--text-5xl);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          letter-spacing: var(--tracking-tight);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-5);
        }

        .landing-hero__subhead {
          font-size: var(--text-xl);
          color: var(--color-text-secondary);
          line-height: var(--leading-normal);
          margin-bottom: var(--space-8);
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Features */
        .landing-features {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-16) var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-20);
        }

        .landing-feature {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-12);
          align-items: center;
        }

        .landing-feature--reverse {
          direction: rtl;
        }

        .landing-feature--reverse > * {
          direction: ltr;
        }

        .landing-feature__heading {
          font-size: var(--text-2xl);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-4);
        }

        .landing-feature__body {
          font-size: var(--text-base);
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
        }

        .landing-feature__image {
          background: var(--color-bg-canvas);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          aspect-ratio: 16 / 10;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .landing-feature__image-placeholder {
          font-size: var(--text-sm);
          color: var(--color-text-muted);
        }

        /* Bottom CTA */
        .landing-bottom-cta {
          text-align: center;
          padding: var(--space-20) var(--space-6);
          border-top: 1px solid var(--color-border);
        }

        .landing-bottom-cta__headline {
          font-size: var(--text-2xl);
          font-weight: var(--weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-6);
        }

        .landing-bottom-cta__note {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          line-height: var(--leading-normal);
        }

        /* Footer */
        .landing-footer {
          padding: var(--space-8) var(--space-6);
          text-align: center;
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          margin-top: auto;
        }

        /* Responsive — Mobile first, layering up */

        /* 768px-1023px: single-column features, medium hero */
        @media (max-width: 1023px) {
          .landing-feature {
            grid-template-columns: 1fr;
            gap: var(--space-6);
          }

          .landing-feature--reverse {
            direction: ltr;
          }

          .landing-hero__headline {
            font-size: var(--text-4xl);
          }

          .landing-features {
            gap: var(--space-16);
          }
        }

        /* < 768px: compact mobile layout */
        @media (max-width: 767px) {
          .landing-hero-wrapper {
            padding: var(--space-12) var(--space-4) var(--space-8);
          }

          .landing-hero {
            max-width: 100%;
          }

          .landing-hero__headline {
            font-size: var(--text-3xl);
          }

          .landing-hero__subhead {
            font-size: var(--text-lg);
            max-width: 100%;
          }

          .landing-header {
            padding: 0 var(--space-4);
          }

          /* Hide large CTA button on mobile — sign-in link still visible */
          .landing-header__cta {
            display: none;
          }

          .landing-features {
            padding: var(--space-8) var(--space-4);
            gap: var(--space-12);
          }

          .landing-bottom-cta {
            padding: var(--space-12) var(--space-4);
          }

          .landing-bottom-cta__headline {
            font-size: var(--text-xl);
          }

          .landing-footer {
            padding: var(--space-6) var(--space-4);
          }
        }

        /* Very small screens (320px-374px) — prevent overflow */
        @media (max-width: 374px) {
          .landing-hero__headline {
            font-size: var(--text-2xl);
          }

          .landing-hero__subhead {
            font-size: var(--text-base);
          }

          .btn-large {
            padding: 0 var(--space-4);
            font-size: var(--text-sm);
          }
        }
      `}</style>
    </div>
  );
}
