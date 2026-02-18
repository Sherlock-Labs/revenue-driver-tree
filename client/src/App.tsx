/**
 * App — Root routes for Revenue Driver Tree.
 *
 * Route structure per tech approach Section 10b:
 * - / → LandingPage (public)
 * - /sign-in/* → SignInPage (Clerk)
 * - /sign-up/* → SignUpPage (Clerk)
 * - /shared/:token → SharedTreePage (public, read-only)
 * - /dashboard → DashboardPage (protected)
 * - /dashboard/new → NewTreePage (protected)
 * - /tree/:id → TreePage (protected)
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage.js";
import SignInPage from "./pages/SignInPage.js";
import SignUpPage from "./pages/SignUpPage.js";
import SharedTreePage from "./pages/SharedTreePage.js";
import DashboardPage from "./pages/DashboardPage.js";
import TreePage from "./pages/TreePage.js";
import NewTreePage from "./pages/NewTreePage.js";

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

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
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
        path="/dashboard/new"
        element={
          <ProtectedRoute>
            <NewTreePage />
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

      {/* Fallback: redirect unknown paths to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
