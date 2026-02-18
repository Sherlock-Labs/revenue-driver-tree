import { Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from "@clerk/clerk-react";

/**
 * App Routes — skeleton for Alice to implement page components.
 *
 * Route structure per tech approach Section 10b:
 * - / → LandingPage (public)
 * - /sign-in → Clerk <SignIn />
 * - /sign-up → Clerk <SignUp />
 * - /shared/:token → SharedTreePage (public)
 * - /dashboard → DashboardPage (protected)
 * - /tree/:id → TreePage (protected)
 */

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

// Placeholder pages — Alice will implement these
function LandingPage() {
  return <div>Landing Page — Alice will implement</div>;
}

function DashboardPage() {
  return <div>Dashboard — Alice will implement</div>;
}

function TreePage() {
  return <div>Tree Editor — Alice will implement</div>;
}

function SharedTreePage() {
  return <div>Shared Tree View — Alice will implement</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/sign-in/*"
        element={<SignIn routing="path" path="/sign-in" />}
      />
      <Route
        path="/sign-up/*"
        element={<SignUp routing="path" path="/sign-up" />}
      />
      <Route path="/shared/:token" element={<SharedTreePage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tree/:id"
        element={
          <ProtectedRoute>
            <TreePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
