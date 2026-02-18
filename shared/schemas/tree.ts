import { z } from "zod";

// --- Node schema (flat array element) ---
export const TreeNodeSchema = z.object({
  id: z.string().min(1).max(100),
  parentId: z.string().min(1).max(100).nullable(),
  name: z.string().min(1).max(200),
  value: z.number().finite(),
  targetValue: z.number().finite(),
  type: z.enum(["currency", "percentage", "count"]),
  computeType: z.enum(["input", "sum", "product"]),
  pinned: z.boolean().default(false),
  order: z.number().int().min(0).max(1000),
  collapsed: z.boolean().default(false),
});

export type TreeNode = z.infer<typeof TreeNodeSchema>;

// --- Tree inputs (onboarding form) ---
export const TreeInputsSchema = z.object({
  currentARR: z.number().positive(),
  targetARR: z.number().positive(),
  timeHorizon: z.enum(["quarterly", "annual"]),
  customerCount: z.number().int().positive(),
  averageACV: z.number().positive(),
  currentNRR: z.number().positive(),
  logoChurnRate: z.number().min(0).max(1),
  pipelineValue: z.number().positive().optional(),
  winRate: z.number().min(0).max(1).optional(),
  salesCycleLength: z.number().int().positive().optional(),
});

export type TreeInputs = z.infer<typeof TreeInputsSchema>;

// --- Full tree (API response) ---
export const TreeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(500),
  inputs: TreeInputsSchema,
  nodes: z.array(TreeNodeSchema).max(200),
  shareToken: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Tree = z.infer<typeof TreeSchema>;

// --- AI generation output (flat value map) ---
export const AIValueMapSchema = z.object({
  companyStage: z.enum(["early", "growth", "scale"]).describe(
    "Inferred company stage: early (<$5M ARR), growth ($5M-$50M), scale (>$50M)"
  ),
  values: z.object({
    // New Business — Pipeline
    new_business_mqls: z.number().describe("Marketing Qualified Leads per period"),
    new_business_mql_sql_rate: z.number().describe("MQL to SQL conversion rate (0.0-1.0)"),
    new_business_pipeline_value: z.number().describe("Total qualified pipeline value in dollars"),
    new_business_win_rate: z.number().describe("Pipeline win rate (0.0-1.0)"),
    new_business_acv: z.number().describe("Average new deal size in dollars"),
    new_business_arr: z.number().describe("Total new ARR from new business"),

    // Expansion
    expansion_eligible_base: z.number().describe("Number of customers eligible for expansion"),
    expansion_attach_rate: z.number().describe("Expansion attach rate (0.0-1.0)"),
    expansion_avg_acv: z.number().describe("Average expansion deal value in dollars"),
    expansion_arr: z.number().describe("Total ARR from expansion"),

    // Churn
    churn_voluntary_rate: z.number().describe("Voluntary churn rate annualized (0.0-1.0)"),
    churn_involuntary_rate: z.number().describe("Involuntary churn rate annualized (0.0-1.0)"),
    churn_revenue_rate: z.number().describe("Total revenue churn rate annualized (0.0-1.0)"),
    churn_churned_arr: z.number().describe("Total ARR lost to churn"),
    churn_saved_arr: z.number().describe("ARR saved through churn reduction initiatives"),

    // Price & Packaging
    price_asp_increase: z.number().describe("Average selling price increase (0.0-1.0)"),
    price_tier_migration_rate: z.number().describe("Rate of customers migrating to higher tier (0.0-1.0)"),
    price_arr: z.number().describe("Incremental ARR from pricing changes"),
  }),
});

export type AIValueMap = z.infer<typeof AIValueMapSchema>;

// --- Tree summary listing (dashboard) ---
export const TreeSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  targetARR: z.number(),
  currentPlanARR: z.number(),
  gap: z.number(),
  updatedAt: z.string(),
});

export type TreeSummary = z.infer<typeof TreeSummarySchema>;
