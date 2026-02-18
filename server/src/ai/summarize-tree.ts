import Anthropic from "@anthropic-ai/sdk";
import type { Tree, TreeNode } from "../../../shared/schemas/tree.js";

const client = new Anthropic({ timeout: 30_000 });

const SYSTEM_PROMPT = `You are a senior revenue strategy consultant writing an executive summary of a SaaS revenue plan. Your client is presenting this plan to their board or leadership team. Write with the authority of someone who has reviewed hundreds of SaaS growth plans.

## Output Format

Write exactly 4 paragraphs:

**Paragraph 1 — The Plan Summary.** State what the plan achieves in concrete terms. "This plan targets $X ARR, representing Y% growth from the current $Z base over [horizon]. The path relies on [2-3 key levers]." Be specific with numbers. No vague language.

**Paragraph 2 — The Growth Engine.** Identify the 2-3 biggest contributors to the growth target. Quantify each. "New business contributes $X (Y% of the growth target), driven by Z new logos at $W average deal size." Call out which assumptions are conservative vs. aggressive relative to SaaS benchmarks.

**Paragraph 3 — The Risk Map.** Identify the 2-3 biggest risks. Where is the plan most aggressive? Where does a small miss cascade into a large gap? "The plan assumes a Z% win rate, which sits at the [Xth] percentile of SaaS benchmarks for companies at this stage. A 5-point miss on win rate alone would reduce new business ARR by $Y." Be concrete about the consequences of misses.

**Paragraph 4 — What Needs To Be True.** Synthesize the 3-4 critical assumptions that must hold for this plan to work. Frame as testable statements: "Churn must stay below X%," "The expansion motion must convert Y% of the eligible base," "Pipeline generation must sustain Z MQLs/quarter." End with a one-sentence overall assessment: is this plan conservative, moderate, or aggressive for a company at this stage?

## Tone

- **Direct and specific.** No filler, no "in today's competitive landscape" preamble. Every sentence should contain a number or a specific insight.
- **Calibrated.** Compare assumptions against SaaS benchmarks where relevant. "A 28% win rate is above the median for growth-stage SaaS (18-30%) but achievable with a strong sales team."
- **Honest about risks.** Don't sugarcoat. If the plan is aggressive, say so. If churn assumptions are optimistic, flag it. The reader is a VP or CEO — they want the truth, not encouragement.
- **Board-ready.** This should read like something a VP of Product could paste into a board deck with confidence.

## SaaS Benchmark Context

Use these ranges to calibrate your assessment:

| Metric | Early (<$5M) | Growth ($5M-$50M) | Scale (>$50M) |
|--------|-------------|-------------------|----------------|
| Logo churn | 8-15% | 5-8% | 2-5% |
| NRR | 95-110% | 105-120% | 115-140% |
| MQL to SQL | 10-18% | 13-25% | 18-30% |
| Win rate | 12-22% | 18-30% | 22-38% |
| Expansion attach | 8-15% | 15-25% | 22-35% |`;

/**
 * Format a value for display in the summary prompt.
 * Duplicated from tree-engine to avoid cross-workspace imports at compile time.
 */
function formatValue(value: number, type: "currency" | "percentage" | "count"): string {
  switch (type) {
    case "currency": {
      const absValue = Math.abs(value);
      const sign = value < 0 ? "-" : "";
      if (absValue >= 1_000_000) {
        return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
      }
      if (absValue >= 1_000) {
        return `${sign}$${(absValue / 1_000).toFixed(0)}K`;
      }
      return `${sign}$${absValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "count":
      return Math.round(value).toLocaleString("en-US");
  }
}

function buildSummaryPrompt(tree: Tree): string {
  const inputs = tree.inputs;
  const growthGap = inputs.targetARR - inputs.currentARR;
  const growthPercent = ((growthGap / inputs.currentARR) * 100).toFixed(1);

  // Find key nodes for the summary
  const nodeMap = new Map(tree.nodes.map((n) => [n.id, n]));
  const newBizNode = nodeMap.get("new-biz");
  const expansionNode = nodeMap.get("expansion");
  const churnNode = nodeMap.get("churn");
  const pricingNode = nodeMap.get("pricing");

  const newBusinessArr = newBizNode?.value ?? 0;
  const expansionArr = expansionNode?.value ?? 0;
  const churnedArr = Math.abs(churnNode?.value ?? 0);
  const priceArr = pricingNode?.value ?? 0;

  const newBusinessPct = growthGap !== 0 ? ((newBusinessArr / growthGap) * 100).toFixed(0) : "0";
  const expansionPct = growthGap !== 0 ? ((expansionArr / growthGap) * 100).toFixed(0) : "0";
  const pricePct = growthGap !== 0 ? ((priceArr / growthGap) * 100).toFixed(0) : "0";

  // Format nodes for the prompt
  const nodeLines = tree.nodes
    .map((n) => {
      const formatted = formatValue(n.value, n.type);
      const target = n.targetValue !== 0 ? ` (target: ${formatValue(n.targetValue, n.type)}, gap: ${formatValue(n.value - n.targetValue, n.type)})` : "";
      return `- ${n.name}: ${formatted}${target}`;
    })
    .join("\n");

  return `Summarize this revenue plan:

**${tree.name}** — ${inputs.timeHorizon} plan

Starting position: $${inputs.currentARR.toLocaleString()} ARR, ${inputs.customerCount.toLocaleString()} customers, $${inputs.averageACV.toLocaleString()} average ACV, ${(inputs.currentNRR * 100).toFixed(0)}% NRR, ${(inputs.logoChurnRate * 100).toFixed(1)}% logo churn.

Target: $${inputs.targetARR.toLocaleString()} ARR (${growthPercent}% growth, $${growthGap.toLocaleString()} gap to close).

Current plan breakdown:
${nodeLines}

Key metrics:
- New business ARR: $${newBusinessArr.toLocaleString()} (${newBusinessPct}% of growth target)
- Expansion ARR: $${expansionArr.toLocaleString()} (${expansionPct}% of growth target)
- Churn impact: -$${churnedArr.toLocaleString()} lost
- Pricing uplift: +$${priceArr.toLocaleString()} (${pricePct}% of growth target)`;
}

/**
 * Generate an executive summary of a revenue plan.
 * Uses Claude Sonnet 4.6 with plain text output (no structured schema).
 */
export async function summarizeTree(tree: Tree): Promise<string> {
  const userPrompt = buildSummaryPrompt(tree);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const contentBlock = response.content[0];
  if (contentBlock.type !== "text") {
    throw new Error("Unexpected AI response format");
  }

  return contentBlock.text;
}
