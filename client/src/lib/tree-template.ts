/**
 * Default SaaS Revenue Tree Template
 *
 * This defines the structure of the default revenue decomposition tree.
 * Values are omitted — they come from AI generation.
 * This file is identical in client/src/lib/ and server/src/lib/ — keep them in sync.
 */

export interface TreeTemplateNode {
  id: string;
  parentId: string | null;
  name: string;
  type: "currency" | "percentage" | "count";
  computeType: "input" | "sum" | "product";
  pinned: boolean;
  order: number;
  collapsed: boolean;
}

export const DEFAULT_TREE_TEMPLATE: TreeTemplateNode[] = [
  // Root
  {
    id: "root",
    parentId: null,
    name: "Revenue Target",
    type: "currency",
    computeType: "sum",
    pinned: false,
    order: 0,
    collapsed: false,
  },

  // ─── Level 1: Revenue Levers ───────────────────────────────────

  // New Business ARR (product of pipeline, win rate, ACV — but computed as
  // the product node "new-biz" which is pipeline_value * win_rate effectively.
  // The tree structure follows Andrei's spec: new-biz is a product node.)
  {
    id: "new-biz",
    parentId: "root",
    name: "New Business ARR",
    type: "currency",
    computeType: "product",
    pinned: false,
    order: 0,
    collapsed: false,
  },
  {
    id: "expansion",
    parentId: "root",
    name: "Expansion Revenue",
    type: "currency",
    computeType: "product",
    pinned: false,
    order: 1,
    collapsed: false,
  },
  {
    id: "churn",
    parentId: "root",
    name: "Churn (Lost ARR)",
    type: "currency",
    computeType: "product",
    pinned: false,
    order: 2,
    collapsed: true,
  },
  {
    id: "pricing",
    parentId: "root",
    name: "Price & Packaging",
    type: "currency",
    computeType: "sum",
    pinned: false,
    order: 3,
    collapsed: true,
  },

  // ─── Level 2: New Business Branch ──────────────────────────────

  {
    id: "new-biz-pipeline",
    parentId: "new-biz",
    name: "Qualified Pipeline",
    type: "currency",
    computeType: "product",
    pinned: false,
    order: 0,
    collapsed: true,
  },
  {
    id: "new-biz-win-rate",
    parentId: "new-biz",
    name: "Win Rate",
    type: "percentage",
    computeType: "input",
    pinned: false,
    order: 1,
    collapsed: false,
  },
  {
    id: "new-biz-acv",
    parentId: "new-biz",
    name: "Average Deal Size",
    type: "currency",
    computeType: "input",
    pinned: false,
    order: 2,
    collapsed: false,
  },

  // ─── Level 3: Pipeline Sub-branch ─────────────────────────────

  {
    id: "pipeline-mqls",
    parentId: "new-biz-pipeline",
    name: "Marketing Qualified Leads",
    type: "count",
    computeType: "input",
    pinned: false,
    order: 0,
    collapsed: false,
  },
  {
    id: "pipeline-conversion",
    parentId: "new-biz-pipeline",
    name: "MQL to SQL Rate",
    type: "percentage",
    computeType: "input",
    pinned: false,
    order: 1,
    collapsed: false,
  },
  {
    id: "pipeline-value-per-sql",
    parentId: "new-biz-pipeline",
    name: "Avg Pipeline per SQL",
    type: "currency",
    computeType: "input",
    pinned: false,
    order: 2,
    collapsed: false,
  },

  // ─── Level 2: Expansion Branch ─────────────────────────────────

  {
    id: "expansion-eligible-base",
    parentId: "expansion",
    name: "Eligible Expansion Base",
    type: "count",
    computeType: "input",
    pinned: false,
    order: 0,
    collapsed: false,
  },
  {
    id: "expansion-attach-rate",
    parentId: "expansion",
    name: "Expansion Attach Rate",
    type: "percentage",
    computeType: "input",
    pinned: false,
    order: 1,
    collapsed: false,
  },
  {
    id: "expansion-avg-acv",
    parentId: "expansion",
    name: "Average Expansion ACV",
    type: "currency",
    computeType: "input",
    pinned: false,
    order: 2,
    collapsed: false,
  },
  {
    id: "expansion-nrr-impact",
    parentId: "expansion",
    name: "Net Revenue Retention Impact",
    type: "percentage",
    computeType: "input",
    pinned: false,
    order: 3,
    collapsed: false,
  },

  // ─── Level 2: Churn Branch ─────────────────────────────────────
  // Churn is stored as NEGATIVE value. Revenue Target = New Biz + Expansion + (-Churn) + Pricing

  {
    id: "churn-customer-base",
    parentId: "churn",
    name: "Customer Base at Risk",
    type: "count",
    computeType: "input",
    pinned: false,
    order: 0,
    collapsed: false,
  },
  {
    id: "churn-avg-acv",
    parentId: "churn",
    name: "Avg ACV of Churning Customers",
    type: "currency",
    computeType: "input",
    pinned: false,
    order: 1,
    collapsed: false,
  },
  {
    id: "churn-logo-rate",
    parentId: "churn",
    name: "Logo Churn Rate",
    type: "percentage",
    computeType: "input",
    pinned: false,
    order: 2,
    collapsed: false,
  },

  // ─── Level 2: Price & Packaging Branch ─────────────────────────

  {
    id: "pricing-asp-increase",
    parentId: "pricing",
    name: "ASP Increase Revenue",
    type: "currency",
    computeType: "input",
    pinned: false,
    order: 0,
    collapsed: false,
  },
  {
    id: "pricing-tier-migration",
    parentId: "pricing",
    name: "Tier Migration Revenue",
    type: "currency",
    computeType: "input",
    pinned: false,
    order: 1,
    collapsed: false,
  },
];
