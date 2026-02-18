import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

import { db, schema } from "../db/index.js";
import { getUserId } from "../middleware/auth.js";
import { generateTreeValues } from "../ai/generate-values.js";
import { summarizeTree } from "../ai/summarize-tree.js";
import { DEFAULT_TREE_TEMPLATE } from "../lib/tree-template.js";
import {
  TreeInputsSchema,
  TreeNodeSchema,
  type TreeNode,
  type TreeInputs,
  type Tree,
  type TreeSummary,
  type AIValueMap,
} from "../../../shared/schemas/tree.js";

const router = Router();

// ─── Helper: merge AI values into template ─────────────────────

function mergeValuesIntoTemplate(
  aiValues: AIValueMap,
  inputs: TreeInputs
): TreeNode[] {
  const v = aiValues.values;

  // Map from template node ID to { value, targetValue }
  const valueMap: Record<string, { value: number; targetValue: number }> = {
    // Root — computed as sum of children
    root: { value: 0, targetValue: inputs.targetARR - inputs.currentARR },

    // New Business
    "new-biz": { value: v.new_business_arr, targetValue: v.new_business_arr },
    "new-biz-pipeline": { value: v.new_business_pipeline_value, targetValue: v.new_business_pipeline_value },
    "new-biz-win-rate": { value: v.new_business_win_rate, targetValue: v.new_business_win_rate },
    "new-biz-acv": { value: v.new_business_acv, targetValue: v.new_business_acv },
    "pipeline-mqls": { value: v.new_business_mqls, targetValue: v.new_business_mqls },
    "pipeline-conversion": { value: v.new_business_mql_sql_rate, targetValue: v.new_business_mql_sql_rate },
    "pipeline-value-per-sql": {
      value: v.new_business_acv * v.new_business_mql_sql_rate,
      targetValue: v.new_business_acv * v.new_business_mql_sql_rate,
    },

    // Expansion
    expansion: { value: v.expansion_arr, targetValue: v.expansion_arr },
    "expansion-eligible-base": { value: v.expansion_eligible_base, targetValue: v.expansion_eligible_base },
    "expansion-attach-rate": { value: v.expansion_attach_rate, targetValue: v.expansion_attach_rate },
    "expansion-avg-acv": { value: v.expansion_avg_acv, targetValue: v.expansion_avg_acv },
    "expansion-nrr-impact": { value: inputs.currentNRR, targetValue: inputs.currentNRR },

    // Churn — stored as NEGATIVE
    churn: { value: -v.churn_churned_arr, targetValue: -v.churn_churned_arr },
    "churn-customer-base": { value: inputs.customerCount, targetValue: inputs.customerCount },
    "churn-avg-acv": { value: inputs.averageACV, targetValue: inputs.averageACV },
    "churn-logo-rate": { value: inputs.logoChurnRate, targetValue: inputs.logoChurnRate },

    // Pricing
    pricing: { value: v.price_arr, targetValue: v.price_arr },
    "pricing-asp-increase": {
      value: Math.round(inputs.currentARR * v.price_asp_increase),
      targetValue: Math.round(inputs.currentARR * v.price_asp_increase),
    },
    "pricing-tier-migration": {
      value: v.price_arr - Math.round(inputs.currentARR * v.price_asp_increase),
      targetValue: v.price_arr - Math.round(inputs.currentARR * v.price_asp_increase),
    },
  };

  // Compute root value as sum of children
  const rootValue =
    (valueMap["new-biz"]?.value ?? 0) +
    (valueMap["expansion"]?.value ?? 0) +
    (valueMap["churn"]?.value ?? 0) +
    (valueMap["pricing"]?.value ?? 0);
  valueMap["root"] = { value: rootValue, targetValue: inputs.targetARR - inputs.currentARR };

  // Merge into template
  return DEFAULT_TREE_TEMPLATE.map((templateNode) => {
    const vals = valueMap[templateNode.id] ?? { value: 0, targetValue: 0 };
    return {
      ...templateNode,
      value: vals.value,
      targetValue: vals.targetValue,
    };
  });
}

// ─── POST /api/trees — Create tree ─────────────────────────────

const CreateTreeSchema = z.object({
  name: z.string().optional(),
  inputs: TreeInputsSchema,
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Validate request body
  const parsed = CreateTreeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { inputs } = parsed.data;
  const horizon = inputs.timeHorizon === "quarterly" ? "Q" : "FY";
  const year = new Date().getFullYear();
  const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const defaultName =
    inputs.timeHorizon === "quarterly"
      ? `${horizon}${quarter} ${year} Revenue Plan`
      : `FY ${year} Revenue Plan`;
  const name = parsed.data.name || defaultName;

  try {
    // Generate AI values
    const aiValues = await generateTreeValues(inputs);

    // Merge values into the template
    const nodes = mergeValuesIntoTemplate(aiValues, inputs);

    // Save to database
    const [tree] = await db
      .insert(schema.trees)
      .values({
        clerkUserId,
        name,
        inputs: inputs as unknown as Record<string, unknown>,
        nodes: nodes as unknown as Record<string, unknown>[],
      })
      .returning();

    const response: Tree = {
      id: tree.id,
      name: tree.name,
      inputs: tree.inputs as unknown as TreeInputs,
      nodes: tree.nodes as unknown as TreeNode[],
      shareToken: tree.shareToken,
      createdAt: tree.createdAt.toISOString(),
      updatedAt: tree.updatedAt.toISOString(),
    };

    res.status(201).json({ tree: response });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        res.status(503).json({
          error: "Our AI is busy. Please try again in a few seconds.",
          retryAfter: 5,
        });
        return;
      }
      console.error("Anthropic API error:", error.message);
      res.status(500).json({ error: "Tree generation failed. Please try again." });
      return;
    }
    if (error instanceof z.ZodError) {
      console.error("AI returned invalid structure:", error.message);
      res.status(500).json({ error: "Tree generation failed. Please try again." });
      return;
    }
    console.error("Error creating tree:", error);
    res.status(500).json({ error: "Tree generation failed. Please try again." });
  }
});

// ─── GET /api/trees — List user's trees ─────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.clerkUserId, clerkUserId))
      .orderBy(desc(schema.trees.updatedAt));

    const trees: TreeSummary[] = rows.map((row) => {
      const inputs = row.inputs as unknown as TreeInputs;
      const nodes = row.nodes as unknown as TreeNode[];
      const rootNode = nodes.find((n) => n.parentId === null);
      const currentPlanARR = rootNode ? rootNode.value + inputs.currentARR : inputs.currentARR;
      return {
        id: row.id,
        name: row.name,
        targetARR: inputs.targetARR,
        currentPlanARR,
        gap: inputs.targetARR - currentPlanARR,
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    res.status(200).json({ trees });
  } catch (error) {
    console.error("Error listing trees:", error);
    res.status(500).json({ error: "Failed to load trees" });
  }
});

// ─── GET /api/trees/:id — Get full tree ─────────────────────────

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.id, req.params.id as string))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    if (row.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You don't have access to this tree" });
      return;
    }

    const response: Tree = {
      id: row.id,
      name: row.name,
      inputs: row.inputs as unknown as TreeInputs,
      nodes: row.nodes as unknown as TreeNode[],
      shareToken: row.shareToken,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    res.status(200).json({ tree: response });
  } catch (error) {
    console.error("Error getting tree:", error);
    res.status(500).json({ error: "Failed to load tree" });
  }
});

// ─── PUT /api/trees/:id — Save tree (auto-save) ────────────────

const UpdateTreeSchema = z.object({
  name: z.string().optional(),
  nodes: z.array(TreeNodeSchema),
});

router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = UpdateTreeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    // Verify ownership
    const [existing] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.id, req.params.id as string))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    if (existing.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You don't have access to this tree" });
      return;
    }

    const updateData: Record<string, unknown> = {
      nodes: parsed.data.nodes as unknown as Record<string, unknown>[],
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }

    const [updated] = await db
      .update(schema.trees)
      .set(updateData)
      .where(eq(schema.trees.id, req.params.id as string))
      .returning();

    const response: Tree = {
      id: updated.id,
      name: updated.name,
      inputs: updated.inputs as unknown as TreeInputs,
      nodes: updated.nodes as unknown as TreeNode[],
      shareToken: updated.shareToken,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    res.status(200).json({ tree: response });
  } catch (error) {
    console.error("Error saving tree:", error);
    res.status(500).json({ error: "Failed to save tree" });
  }
});

// ─── DELETE /api/trees/:id ──────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.id, req.params.id as string))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    if (existing.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You don't have access to this tree" });
      return;
    }

    await db.delete(schema.trees).where(eq(schema.trees.id, req.params.id as string));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting tree:", error);
    res.status(500).json({ error: "Failed to delete tree" });
  }
});

// ─── POST /api/trees/:id/duplicate ──────────────────────────────

router.post("/:id/duplicate", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.id, req.params.id as string))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    if (existing.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You don't have access to this tree" });
      return;
    }

    const duplicateName = req.body?.name || `${existing.name} (copy)`;

    const [duplicate] = await db
      .insert(schema.trees)
      .values({
        clerkUserId,
        name: duplicateName,
        inputs: existing.inputs,
        nodes: existing.nodes,
      })
      .returning();

    const response: Tree = {
      id: duplicate.id,
      name: duplicate.name,
      inputs: duplicate.inputs as unknown as TreeInputs,
      nodes: duplicate.nodes as unknown as TreeNode[],
      shareToken: duplicate.shareToken,
      createdAt: duplicate.createdAt.toISOString(),
      updatedAt: duplicate.updatedAt.toISOString(),
    };

    res.status(201).json({ tree: response });
  } catch (error) {
    console.error("Error duplicating tree:", error);
    res.status(500).json({ error: "Failed to duplicate tree" });
  }
});

// ─── POST /api/trees/:id/summarize ──────────────────────────────

router.post("/:id/summarize", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.id, req.params.id as string))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    if (row.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You don't have access to this tree" });
      return;
    }

    const tree: Tree = {
      id: row.id,
      name: row.name,
      inputs: row.inputs as unknown as TreeInputs,
      nodes: row.nodes as unknown as TreeNode[],
      shareToken: row.shareToken,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    const summary = await summarizeTree(tree);

    res.status(200).json({ summary });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error during summarization:", error.message);
      res.status(500).json({ error: "Summary generation failed. Please try again." });
      return;
    }
    console.error("Error summarizing tree:", error);
    res.status(500).json({ error: "Summary generation failed. Please try again." });
  }
});

// ─── POST /api/trees/:id/share ──────────────────────────────────

router.post("/:id/share", async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = getUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(schema.trees)
      .where(eq(schema.trees.id, req.params.id as string))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    if (existing.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You don't have access to this tree" });
      return;
    }

    // If already has a share token, return it
    if (existing.shareToken) {
      const appUrl = process.env.APP_URL || "http://localhost:5173";
      res.status(200).json({
        shareToken: existing.shareToken,
        shareUrl: `${appUrl}/shared/${existing.shareToken}`,
      });
      return;
    }

    // Generate a new share token
    const shareToken = nanoid(12);

    await db
      .update(schema.trees)
      .set({ shareToken, updatedAt: new Date() })
      .where(eq(schema.trees.id, req.params.id as string));

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    res.status(200).json({
      shareToken,
      shareUrl: `${appUrl}/shared/${shareToken}`,
    });
  } catch (error) {
    console.error("Error generating share link:", error);
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

export default router;
