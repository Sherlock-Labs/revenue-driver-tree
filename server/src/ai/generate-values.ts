import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AIValueMapSchema, type AIValueMap, type TreeInputs } from "../../../shared/schemas/tree.js";

const client = new Anthropic({ timeout: 30_000 });

const SYSTEM_PROMPT = `You are a SaaS financial analyst generating a revenue decomposition tree. Given a company's current metrics and growth target, produce plausible values for every node in the tree.

## Company Stage Classification

Classify the company based on inputs, then apply the corresponding benchmarks:

- **Early stage** (<$5M ARR, <100 customers): Higher churn tolerance, lower win rates, smaller pipelines, more volatile metrics.
- **Growth stage** ($5M-$50M ARR, 100-1,000 customers): Improving unit economics, scaling sales motion, expansion becoming meaningful.
- **Scale stage** (>$50M ARR, >1,000 customers): Mature operations, lower churn, higher NRR, predictable pipeline.

## SaaS Benchmark Ranges

Use these as defaults when the user hasn't provided a value. Adjust based on company stage.

| Metric | Early | Growth | Scale |
|--------|-------|--------|-------|
| Logo churn rate (annual) | 8-15% | 5-8% | 2-5% |
| Net Revenue Retention | 95-110% | 105-120% | 115-140% |
| MQL to SQL conversion | 10-18% | 13-25% | 18-30% |
| Win rate (pipeline to closed) | 12-22% | 18-30% | 22-38% |
| Expansion attach rate | 8-15% | 15-25% | 22-35% |
| Avg expansion ACV (% of base ACV) | 15-25% | 20-35% | 25-45% |
| Voluntary/involuntary churn split | 70/30 | 65/35 | 60/40 |
| ASP increase (annual) | 0-3% | 2-5% | 3-8% |
| Tier migration rate | 2-5% | 5-10% | 8-15% |
| Churn save rate (% of at-risk) | 5-10% | 10-20% | 15-30% |

## Rules

1. **Anchor on user inputs.** If the user provides a value (ACV, NRR, churn rate, win rate, pipeline), use it as-is or very close. Do not override user-provided data.

2. **Internal consistency is mandatory.** The math must check out:
   - new_business_arr approx= new_business_pipeline_value x new_business_win_rate
   - new_business_pipeline_value approx= (new_business_mqls x new_business_mql_sql_rate) x new_business_acv
   - expansion_arr approx= expansion_eligible_base x expansion_attach_rate x expansion_avg_acv
   - churn_voluntary_rate + churn_involuntary_rate approx= user-provided churn rate (logo basis)
   - churn_churned_arr approx= customer_count x avg_acv x churn_revenue_rate
   - revenue_target approx= new_business_arr + expansion_arr - churn_churned_arr + churn_saved_arr + price_arr
   - The total should approximate (targetArr - currentArr).

3. **Growth gap allocation.** Distribute the growth target across the four levers (new business, expansion, churn reduction, pricing) in proportions that are realistic for the company stage:
   - Early: ~60-70% new business, ~15-20% expansion, ~10-15% churn reduction, ~5% pricing
   - Growth: ~45-55% new business, ~25-30% expansion, ~10-15% churn reduction, ~5-10% pricing
   - Scale: ~30-40% new business, ~30-40% expansion, ~15-20% churn reduction, ~10-15% pricing

4. **Time horizon adjustment.** If the horizon is quarterly, scale annual metrics to quarterly (divide annual rates by 4 where appropriate, adjust absolute numbers to a quarter's worth).

5. **Handle edge cases gracefully:**
   - If target < current (contraction): generate a realistic wind-down scenario. Expansion and new business should still be positive but small. Churn dominates.
   - If NRR > 150%: accept it — some PLG companies achieve this — but flag via a slightly conservative expansion assumption.
   - If customer count is very low (<10): skip expansion and churn subtrees (set to 0), focus on new business.

6. **Round sensibly.** Whole dollars for currency values. Two decimal places for percentages (e.g., 0.25 not 0.2537). Whole numbers for counts (MQLs, customers).`;

function buildUserPrompt(inputs: TreeInputs): string {
  let prompt = `Generate revenue tree values for this company:

Current ARR: $${inputs.currentARR.toLocaleString()}
Target ARR: $${inputs.targetARR.toLocaleString()}
Time horizon: ${inputs.timeHorizon}
Current customers: ${inputs.customerCount.toLocaleString()}
Average ACV: $${inputs.averageACV.toLocaleString()}
Net Revenue Retention: ${(inputs.currentNRR * 100).toFixed(0)}%
Logo churn rate: ${(inputs.logoChurnRate * 100).toFixed(1)}%`;

  if (inputs.pipelineValue !== undefined) {
    prompt += `\nCurrent pipeline value: $${inputs.pipelineValue.toLocaleString()}`;
  }
  if (inputs.winRate !== undefined) {
    prompt += `\nCurrent win rate: ${(inputs.winRate * 100).toFixed(0)}%`;
  }
  if (inputs.salesCycleLength !== undefined) {
    prompt += `\nSales cycle: ${inputs.salesCycleLength} days`;
  }

  prompt += "\n\nReturn the values for all nodes in the revenue decomposition tree.";
  return prompt;
}

/**
 * Validate and adjust AI-generated values for mathematical consistency.
 */
function validateAndAdjust(result: AIValueMap, inputs: TreeInputs): AIValueMap {
  const v = result.values;

  // 1. Sanity bounds — clamp obviously wrong values
  const checks: Array<{ key: keyof typeof v; min: number; max: number }> = [
    { key: "new_business_win_rate", min: 0.01, max: 0.80 },
    { key: "new_business_mql_sql_rate", min: 0.01, max: 0.60 },
    { key: "expansion_attach_rate", min: 0.0, max: 0.80 },
    { key: "churn_voluntary_rate", min: 0.0, max: 0.50 },
    { key: "churn_involuntary_rate", min: 0.0, max: 0.20 },
    { key: "price_asp_increase", min: 0.0, max: 0.30 },
    { key: "price_tier_migration_rate", min: 0.0, max: 0.40 },
  ];

  for (const check of checks) {
    const currentValue = v[check.key];
    if (currentValue < check.min || currentValue > check.max) {
      (v as Record<string, number>)[check.key] = Math.max(check.min, Math.min(check.max, currentValue));
    }
  }

  // 2. Mathematical consistency — adjust computed values to match their formulas

  // Pipeline: mqls * mql_sql_rate * acv should = pipeline_value
  const computedPipeline = v.new_business_mqls * v.new_business_mql_sql_rate * v.new_business_acv;
  v.new_business_pipeline_value = Math.round(computedPipeline);

  // New business: pipeline * win_rate should = new_business_arr
  v.new_business_arr = Math.round(v.new_business_pipeline_value * v.new_business_win_rate);

  // Expansion: base * attach_rate * avg_acv should = expansion_arr
  v.expansion_arr = Math.round(v.expansion_eligible_base * v.expansion_attach_rate * v.expansion_avg_acv);

  // Churn: total churn rate should = voluntary + involuntary
  v.churn_revenue_rate = v.churn_voluntary_rate + v.churn_involuntary_rate;
  v.churn_churned_arr = Math.round(inputs.customerCount * inputs.averageACV * v.churn_revenue_rate);

  // 3. Total growth check — all levers should sum to approximately the growth target
  const growthTarget = inputs.targetARR - inputs.currentARR;
  const totalPlan =
    v.new_business_arr + v.expansion_arr - v.churn_churned_arr + v.churn_saved_arr + v.price_arr;

  // If the plan is more than 20% off the growth target, proportionally scale
  if (growthTarget !== 0) {
    const ratio = totalPlan / growthTarget;
    if (ratio > 0 && (ratio < 0.8 || ratio > 1.2)) {
      const scale = growthTarget / totalPlan;
      v.new_business_arr = Math.round(v.new_business_arr * scale);
      v.expansion_arr = Math.round(v.expansion_arr * scale);
      v.churn_saved_arr = Math.round(v.churn_saved_arr * scale);
      v.price_arr = Math.round(v.price_arr * scale);
      // Don't scale churn_churned_arr — it's based on real base * rate
    }
  }

  // 4. No negative values for absolute amounts
  const arrKeys: (keyof typeof v)[] = [
    "new_business_arr",
    "new_business_pipeline_value",
    "expansion_arr",
    "churn_churned_arr",
    "churn_saved_arr",
    "price_arr",
  ];
  for (const key of arrKeys) {
    if (v[key] < 0) {
      (v as Record<string, number>)[key] = 0;
    }
  }

  return result;
}

/**
 * Generate plausible values for all nodes in the revenue driver tree.
 * Uses Claude Sonnet 4.6 with structured output (Zod schema).
 */
export async function generateTreeValues(inputs: TreeInputs): Promise<AIValueMap> {
  const userPrompt = buildUserPrompt(inputs);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    output_config: {
      format: zodOutputFormat(AIValueMapSchema),
    },
  });

  // Check for truncation
  if (response.stop_reason === "max_tokens") {
    throw new Error("AI response truncated — increase max_tokens");
  }

  const contentBlock = response.content[0];
  if (contentBlock.type !== "text") {
    throw new Error("Unexpected AI response format");
  }

  const result = AIValueMapSchema.parse(JSON.parse(contentBlock.text));

  // Run server-side sanity checks
  return validateAndAdjust(result, inputs);
}
