import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { clerkMiddleware } from "@clerk/express";
import { eq } from "drizzle-orm";

import { handleClerkWebhook } from "./webhooks/clerk.js";
import { requireAuth } from "./middleware/auth.js";
import apiRouter from "./routes/index.js";
import { db, schema } from "./db/index.js";
import type { TreeInputs, TreeNode, Tree } from "../../shared/schemas/tree.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ─── Middleware Stack (ORDER MATTERS — see tech approach Section 4c) ───

// 1. CORS
app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:5173",
    credentials: true,
  })
);

// 2. Webhook routes — express.raw() BEFORE express.json()
app.post(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  handleClerkWebhook
);

// 3. JSON parser (after webhooks)
app.use(express.json());

// 4. Clerk middleware
app.use(
  clerkMiddleware({
    authorizedParties: [process.env.APP_URL || "http://localhost:5173"],
  })
);

// ─── Public Routes (no auth required) ──────────────────────────

// 5. Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// 6. Shared tree view (public, no auth)
app.get("/api/shared/:token", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.shareToken, req.params.token as string))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Shared tree not found" });
      return;
    }

    // Look up owner name for attribution
    const [owner] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.clerkUserId, row.clerkUserId))
      .limit(1);

    const tree: Tree = {
      id: row.id,
      name: row.name,
      inputs: row.inputs as unknown as TreeInputs,
      nodes: row.nodes as unknown as TreeNode[],
      shareToken: row.shareToken,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    res.status(200).json({
      tree,
      ownerName: owner?.name ?? null,
    });
  } catch (error) {
    console.error("Error loading shared tree:", error);
    res.status(500).json({ error: "Failed to load shared tree" });
  }
});

// ─── Protected Routes (auth required) ──────────────────────────

// 7. All /api/* routes require auth
app.use("/api", requireAuth(), apiRouter);

// ─── Static Files (production) ─────────────────────────────────

// 8. In production: serve Vite build and fallback to index.html for SPA routing
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA fallback — serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Error Handler ─────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── Start Server ──────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
