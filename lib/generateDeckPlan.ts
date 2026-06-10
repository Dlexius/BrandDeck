import {
  type BrandContract,
  type DeckPlan,
  type DeckSlide,
  type SourceDocument,
  type SourcePackSummary,
  DeckPlanSchema,
  MAX_DECK_SLIDES,
  MAX_SOURCE_DOCUMENT_CHARS
} from "@/lib/deck-plan-schema";
import { chunkDeckPlanContent } from "@/lib/deck-content-chunker";
import {
  contextPackToMetricRows,
  latestContextMetricRow,
  metricDatumsByKey,
  normalizedMetricKey,
  numericMetricValue,
  standardMetricKeys,
  type ContextPack
} from "@/lib/context-pack-schema";
import { planDeckSections } from "@/lib/deck-section-planner";
import {
  selectDeckRecipe,
  type DeckRecipe,
  type DeckRecipeSlide
} from "@/lib/deck-recipes";

export type AdoptionCsvRow = {
  client_name?: string;
  report_period?: string;
  active_users?: string | number | null;
  licensed_users?: string | number | null;
  adoption_score?: string | number | null;
  projects_active?: string | number | null;
  mobile_usage_rate?: string | number | null;
  daily_logs_count?: string | number | null;
  rfi_count?: string | number | null;
  submittals_count?: string | number | null;
  top_feature?: string;
  lowest_feature?: string;
  risk_summary?: string;
  recommendation_1?: string;
  recommendation_2?: string;
  recommendation_3?: string;
};

type NormalizedRow = {
  client_name: string;
  report_period: string;
  active_users: number;
  licensed_users: number;
  adoption_score: number;
  projects_active: number;
  mobile_usage_rate: number;
  daily_logs_count: number;
  rfi_count: number;
  submittals_count: number;
  top_feature: string;
  lowest_feature: string;
  risk_summary: string;
  recommendation_1: string;
  recommendation_2: string;
  recommendation_3: string;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(String(value).replace(/[,%]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toCount(value: unknown) {
  return Math.round(Math.max(0, toNumber(value)));
}

function toPercent(value: unknown) {
  return Math.round(clamp(toNumber(value), 0, 100));
}

function toText(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function adoptionCoverage(activeUsers: number, licensedUsers: number) {
  if (activeUsers <= 0 && licensedUsers <= 0) {
    return 0;
  }

  if (licensedUsers <= 0) {
    return 0;
  }

  const denominator = Math.max(licensedUsers, 1);
  return Math.round(clamp((activeUsers / denominator) * 100, 0, 100));
}

function normalizeRow(row: AdoptionCsvRow): NormalizedRow {
  return {
    client_name: toText(row.client_name, "Unknown Client"),
    report_period: toText(row.report_period, "Current Period"),
    active_users: toCount(row.active_users),
    licensed_users: toCount(row.licensed_users),
    adoption_score: toPercent(row.adoption_score),
    projects_active: toCount(row.projects_active),
    mobile_usage_rate: toPercent(row.mobile_usage_rate),
    daily_logs_count: toCount(row.daily_logs_count),
    rfi_count: toCount(row.rfi_count),
    submittals_count: toCount(row.submittals_count),
    top_feature: toText(row.top_feature, "Daily Logs"),
    lowest_feature: toText(row.lowest_feature, "Submittals"),
    risk_summary: toText(
      row.risk_summary,
      "Adoption risk needs review because the loaded data is incomplete."
    ),
    recommendation_1: toText(
      row.recommendation_1,
      "Confirm the next adoption owner and review cadence."
    ),
    recommendation_2: toText(
      row.recommendation_2,
      "Review workflow gaps with project operations leaders."
    ),
    recommendation_3: toText(
      row.recommendation_3,
      "Refresh onboarding for the teams with the lowest usage."
    )
  };
}

function compactText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  function withEllipsis(value: string) {
    if (maxLength <= 3) {
      return ".".repeat(Math.max(0, maxLength));
    }

    return `${value.slice(0, maxLength - 3).trim()}...`.slice(0, maxLength);
  }

  const slice = normalized.slice(0, Math.max(0, maxLength - 1)).trim();
  const punctuationBoundary = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf(";"),
    slice.lastIndexOf(",")
  );

  if (punctuationBoundary >= Math.floor(maxLength * 0.58)) {
    return `${slice.slice(0, punctuationBoundary).trim()}.`;
  }

  const wordBoundary = slice.lastIndexOf(" ");

  if (wordBoundary >= Math.floor(maxLength * 0.7)) {
    return withEllipsis(slice.slice(0, wordBoundary).trim());
  }

  return withEllipsis(slice.trim());
}

function buildPromptIntent(prompt: string) {
  const normalized = prompt.toLowerCase();
  const wantsExecutive = /executive|leadership|board|sponsor/.test(normalized);
  const wantsAction = /recommend|next step|action|risk/.test(normalized);
  const wantsTrend = /trend|growth|usage|adoption/.test(normalized);

  return {
    audience: wantsExecutive ? "Executive sponsors and customer success leaders" : "Customer success and implementation teams",
    emphasis: [
      wantsTrend ? "adoption trajectory" : "current adoption health",
      wantsAction ? "risk mitigation and next steps" : "operational summary",
      prompt.trim() ? "user prompt priorities" : "standard construction adoption report"
    ]
  };
}

type GenerateDeckPlanOptions = {
  recipeId?: string;
  customRecipes?: DeckRecipe[];
  sourceDocuments?: SourceDocument[];
  contextPack?: ContextPack;
};

type SourceEvidence = {
  refs: string[];
  constraints: string[];
  recommendations: string[];
  risks: string[];
  trendNotes: string[];
  appendixNotes: string[];
  summary: SourcePackSummary;
};

type ProductReleaseUpdate = {
  title: string;
  solutionArea: string;
  tool: string;
  launchType: string;
  region: string;
  whatPoints: string[];
  whyPoints: string[];
  sourceRef: string;
  relevanceScore?: number;
  relevanceReasons?: string[];
};

const METRIC_REQUIRED_RECIPE_IDS = new Set([
  "client_adoption_report",
  "executive_adoption_update",
  "risk_remediation_plan",
  "quarterly_business_review"
]);

function recipeRequiresAccountMetrics(recipe: DeckRecipe) {
  return METRIC_REQUIRED_RECIPE_IDS.has(recipe.recipe_id);
}

function rowsFromContextPack(contextPack?: ContextPack): AdoptionCsvRow[] {
  return contextPackToMetricRows(contextPack) as AdoptionCsvRow[];
}

function hasUsableMetricRows(rows: AdoptionCsvRow[]) {
  return rows.map(normalizeRow).some(hasMetricSignal);
}

function fallbackRowFromContextPack(
  contextPack: ContextPack | undefined,
  recipe: DeckRecipe
): AdoptionCsvRow {
  const latestRow = latestContextMetricRow(contextPack) as AdoptionCsvRow | undefined;
  const clientName =
    latestRow?.client_name ??
    contextPack?.clientProfile?.name ??
    "Selected Client";
  const reportPeriod =
    latestRow?.report_period ??
    contextPack?.metricSnapshots[contextPack.metricSnapshots.length - 1]?.period ??
    "Current Period";
  const ownedTools = contextPack?.clientProfile?.ownedTools ?? [];
  const topFeature = String(latestRow?.top_feature ?? ownedTools[0] ?? "Owned tools");
  const lowestFeature = String(
    latestRow?.lowest_feature ?? ownedTools[ownedTools.length - 1] ?? "Enablement"
  );
  const risk =
    contextPack?.continuityMemory.openRisks[0] ??
    contextPack?.clientProfile?.risks[0] ??
    "Review rollout readiness against the selected context before the next meeting.";
  const recommendation =
    contextPack?.continuityMemory.priorRecommendations[0] ??
    contextPack?.clientProfile?.businessGoals[0] ??
    "Align the presentation to the selected client context and audience.";

  return {
    client_name: String(clientName),
    report_period: String(reportPeriod),
    active_users: 0,
    licensed_users: 0,
    adoption_score: 0,
    projects_active: 0,
    mobile_usage_rate: 0,
    daily_logs_count: 0,
    rfi_count: 0,
    submittals_count: 0,
    top_feature: compactText(topFeature, 80),
    lowest_feature: compactText(lowestFeature, 80),
    risk_summary:
      recipe.recipe_id === "product_update_deck"
        ? "Release relevance should be reviewed against owned tools, rollout stage, and source context."
        : compactText(risk, 220),
    recommendation_1: compactText(recommendation, 160),
    recommendation_2: "Use selected source context to confirm priorities.",
    recommendation_3: "Capture owner, timing, and next-step decisions."
  };
}

function contextOwnedTools(contextPack?: ContextPack) {
  return (contextPack?.clientProfile?.ownedTools ?? []).map((tool) =>
    tool.toLowerCase()
  );
}

function contextMetricFeatureRows(
  contextPack: ContextPack | undefined,
  productUpdates: ProductReleaseUpdate[],
  current: NormalizedRow
) {
  const metricIndex = metricDatumsByKey(contextPack);
  const standardKeys = standardMetricKeys();
  const metricRows = Array.from(metricIndex.entries())
    .filter(([key]) => !standardKeys.has(key))
    .flatMap(([key, metrics]) => {
      const metric = metrics[metrics.length - 1];
      const value = metric ? numericMetricValue(metric) : Number.NaN;

      if (!metric || !Number.isFinite(value)) {
        return [];
      }

      return [
        {
          feature: compactText(metric.label ?? key.replace(/_/g, " "), 32),
          count: Math.round(Math.max(0, value))
        }
      ];
    });

  if (metricRows.length > 0) {
    return metricRows;
  }

  if (productUpdates.length > 0) {
    return groupProductUpdatesBySolutionArea(productUpdates).map((group) => ({
      feature: compactText(group.solutionArea, 32),
      count: group.updates.length
    }));
  }

  const ownedTools = contextPack?.clientProfile?.ownedTools ?? [];

  if (ownedTools.length > 0) {
    return ownedTools.map((tool) => ({
      feature: compactText(tool, 32),
      count: 1
    }));
  }

  return [
    {
      feature: "Daily Logs",
      count: current.daily_logs_count
    },
    {
      feature: "RFIs",
      count: current.rfi_count
    },
    {
      feature: "Submittals",
      count: current.submittals_count
    }
  ];
}

function recipeAudience(recipe: DeckRecipe, fallbackAudience: string) {
  return recipe.audience.startsWith("Prompt-selected")
    ? fallbackAudience
    : recipe.audience;
}

function agendaItemsForRecipe(recipe: DeckRecipe) {
  return recipe.slide_sequence
    .filter(
      (slide) =>
        !["title", "agenda", "statement", "appendix_source_notes"].includes(
          slide.slide_role
        )
    )
    .map((slide) => clientFacingSlideTitle(recipe, slide))
    .slice(0, 6);
}

function clientFacingReportSubtitle(recipe: DeckRecipe, reportPeriod: string) {
  if (recipe.recipe_id === "executive_adoption_update") {
    return `Executive adoption update | ${reportPeriod}`;
  }

  if (recipe.recipe_id === "risk_remediation_plan") {
    return `90-day adoption risk plan | ${reportPeriod}`;
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return `Quarterly business review | ${reportPeriod}`;
  }

  if (recipe.recipe_id === "product_update_deck") {
    return `Client-targeted product update | ${reportPeriod}`;
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return `Client brief | ${reportPeriod}`;
  }

  return `Client adoption report | ${reportPeriod}`;
}

function deckChromeLabel(recipe: DeckRecipe) {
  if (recipe.recipe_id === "executive_adoption_update") {
    return "EXECUTIVE UPDATE";
  }

  if (recipe.recipe_id === "risk_remediation_plan") {
    return "RISK PLAN";
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return "QBR";
  }

  if (recipe.recipe_id === "product_update_deck") {
    return "PRODUCT UPDATE";
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return "BRAND-SAFE BRIEF";
  }

  return "ADOPTION REPORT";
}

function clientFacingSlideTitle(recipe: DeckRecipe, recipeSlide: DeckRecipeSlide) {
  const recipeTitles: Record<string, Partial<Record<string, string>>> = {
    client_adoption_report: {
      executive_summary: "Executive Readout",
      kpi_scorecard: "Current Adoption Health",
      usage_trend: "Usage Trend",
      feature_adoption: "Workflow Adoption Mix",
      risks_recommendations: "Risks & Recommended Actions",
      next_steps: "90-Day Adoption Plan",
      appendix_source_notes: "Source Notes"
    },
    executive_adoption_update: {
      executive_summary: "Leadership Readout",
      kpi_scorecard: "Executive Health Signals",
      usage_trend: "Momentum",
      risks_recommendations: "Sponsor Actions",
      next_steps: "Decision Plan",
      appendix_source_notes: "Source Notes"
    },
    risk_remediation_plan: {
      executive_summary: "Risk Readout",
      kpi_scorecard: "Risk Indicators",
      feature_adoption: "Workflow Gaps",
      risks_recommendations: "Priority Risk Actions",
      next_steps: "30-60-90 Plan",
      appendix_source_notes: "Source Notes"
    },
    quarterly_business_review: {
      executive_summary: "Executive Value Readout",
      kpi_scorecard: "Quarterly Health Signals",
      usage_trend: "Momentum",
      feature_adoption: "Product Usage Mix",
      risks_recommendations: "Value Risks & Decisions",
      next_steps: "Next-Quarter Plan",
      appendix_source_notes: "Source Notes"
    },
    product_update_deck: {
      executive_summary: "Client Relevance",
      feature_adoption: "Installed Tool Fit",
      kpi_scorecard: "Readiness Signals",
      usage_trend: "Readiness",
      risks_recommendations: "Rollout Risks & Enablement",
      next_steps: "Client-Specific Rollout Plan",
      appendix_source_notes: "Source Notes"
    },
    ad_hoc_brand_safe_deck: {
      executive_summary: "Brief Summary",
      kpi_scorecard: "Relevant Metrics",
      usage_trend: "Signal Trend",
      risks_recommendations: "Implications",
      next_steps: "Next Steps",
      appendix_source_notes: "Source Notes"
    }
  };
  if (
    recipe.recipe_id === "quarterly_business_review" &&
    recipeSlide.title === "Expansion Opportunities"
  ) {
    return recipeSlide.title;
  }

  const recipeTitle = recipeTitles[recipe.recipe_id]?.[recipeSlide.slide_role];

  if (recipeTitle) {
    return recipeTitle;
  }

  switch (recipeSlide.slide_role) {
    case "executive_summary":
      return "Executive Readout";
    case "kpi_scorecard":
      return "Current Adoption Health";
    case "usage_trend":
      return "Usage Trend";
    case "feature_adoption":
      return "Workflow Adoption Mix";
    case "risks_recommendations":
      return "Risks & Recommended Actions";
    case "next_steps":
      return "90-Day Adoption Plan";
    case "appendix_source_notes":
      return "Source Notes";
    default:
      return recipeSlide.title;
  }
}

function workflowNoun(value: string) {
  const normalized = value.trim();

  if (/^submittals$/i.test(normalized)) {
    return "submittal";
  }

  if (/^rfis$/i.test(normalized)) {
    return "RFI";
  }

  if (/^daily logs$/i.test(normalized)) {
    return "daily log";
  }

  return normalized.toLowerCase();
}

function executiveSummaryPoints(
  recipe: DeckRecipe,
  current: NormalizedRow,
  adoptionDelta: number,
  adoptionRate: number,
  mobileDelta: number,
  usingFallbackMetrics: boolean
) {
  if (usingFallbackMetrics) {
    return [
      "Latest period metrics need confirmation.",
      `${current.report_period} values shown where available.`,
      `${current.active_users} active users in available data.`,
      "Review account metrics or connector mapping."
    ];
  }

  if (recipe.recipe_id === "executive_adoption_update") {
    return [
      `${current.adoption_score}% adoption; ${adoptionDelta >= 0 ? "up" : "down"} ${Math.abs(adoptionDelta)} pts.`,
      `${adoptionRate}% licensed coverage.`,
      `${current.projects_active} active projects need sponsor cadence.`,
      `Decision focus: ${current.lowest_feature}.`
    ];
  }

  if (recipe.recipe_id === "risk_remediation_plan") {
    return [
      `Weakest workflow: ${current.lowest_feature}.`,
      `${current.adoption_score}% adoption; backslide risk remains.`,
      `${current.projects_active} active projects need launch governance.`,
      `${current.mobile_usage_rate}% mobile usage; reinforce field habits.`
    ];
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return [
      `${current.adoption_score}% adoption supports the quarterly value story.`,
      `${adoptionRate}% licensed coverage across ${current.projects_active} active projects.`,
      `${current.top_feature} is the strongest workflow signal.`,
      `Next-quarter focus: ${current.lowest_feature}.`
    ];
  }

  if (recipe.recipe_id === "product_update_deck") {
    return [
      `${current.adoption_score}% adoption indicates rollout readiness.`,
      `${current.top_feature} usage creates a strong product-update entry point.`,
      `${current.lowest_feature} needs targeted enablement.`,
      "Update content should match owned tools and active workflows."
    ];
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return [
      `${current.adoption_score}% adoption anchors the brief.`,
      `${current.projects_active} active projects provide context.`,
      `Key workflow gap: ${current.lowest_feature}.`,
      "Next steps stay clear and practical."
    ];
  }

  return [
    `${current.adoption_score}% adoption; ${adoptionDelta >= 0 ? "up" : "down"} ${Math.abs(adoptionDelta)} pts.`,
    `${current.active_users} of ${current.licensed_users} users active.`,
    `${current.mobile_usage_rate}% mobile usage; ${mobileDelta >= 0 ? "up" : "down"} ${Math.abs(mobileDelta)} pts.`,
    `${adoptionRate}% licensed coverage.`
  ];
}

function executiveBusinessImpact(
  recipe: DeckRecipe,
  current: NormalizedRow,
  usingFallbackMetrics: boolean
) {
  if (usingFallbackMetrics) {
    return "Latest period is missing metrics; confirm source data before sharing.";
  }

  if (recipe.recipe_id === "executive_adoption_update") {
    return `Leadership focus: protect adoption gains and assign ${workflowNoun(
      current.lowest_feature
    )} response owners.`;
  }

  if (recipe.recipe_id === "risk_remediation_plan") {
    return `Backslide risk: ${String(
      workflowNoun(current.lowest_feature)
    ).toLowerCase()} habits and new-project onboarding.`;
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return `QBR focus: connect adoption health to value delivered and next-quarter priorities.`;
  }

  if (recipe.recipe_id === "product_update_deck") {
    return `Product focus: target updates to tools already in use and workflow gaps that need enablement.`;
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return "Brief focus: connect current adoption signals to a brand-safe operating plan.";
  }

  return `${current.adoption_score}% adoption across ${current.projects_active} projects. Next focus: ${String(current.lowest_feature).toLowerCase()} and onboarding.`;
}

function metricContextForRecipe(
  recipe: DeckRecipe,
  current: NormalizedRow,
  adoptionRate: number,
  metricsNeedConfirmation: boolean
) {
  if (metricsNeedConfirmation) {
    return `Metrics need confirmation; ${current.active_users} active users loaded.`;
  }

  if (recipe.recipe_id === "executive_adoption_update") {
    return `${adoptionRate}% licensed coverage across ${current.projects_active} active projects.`;
  }

  if (recipe.recipe_id === "risk_remediation_plan") {
    return `${adoptionRate}% coverage; ${current.projects_active} projects need consistent workflow ownership.`;
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return `${adoptionRate}% licensed coverage frames the quarterly value and renewal conversation.`;
  }

  if (recipe.recipe_id === "product_update_deck") {
    return `${current.projects_active} active projects and ${current.mobile_usage_rate}% mobile usage shape rollout readiness.`;
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return "Metrics summarize current adoption signals for the requested brief.";
  }

  return `${adoptionRate}% of licensed users are active across ${current.projects_active} active projects.`;
}

function trendSummaryForRecipe(
  recipe: DeckRecipe,
  first: NormalizedRow,
  current: NormalizedRow,
  usingFallbackMetrics = false
) {
  if (usingFallbackMetrics) {
    return "Latest period metrics need confirmation; trend uses available rows.";
  }

  if (recipe.recipe_id === "executive_adoption_update") {
    return `Adoption climbed from ${first.adoption_score}% to ${current.adoption_score}%; active users reached ${current.active_users}.`;
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return `Quarterly adoption moved from ${first.adoption_score}% to ${current.adoption_score}%; active users reached ${current.active_users}.`;
  }

  if (recipe.recipe_id === "product_update_deck") {
    return `Readiness rose from ${first.adoption_score}% to ${current.adoption_score}%; target updates to proven workflows.`;
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return `Signals rose ${first.adoption_score}% to ${current.adoption_score}%; focus follow-up on repeatability.`;
  }

  return `Adoption rose ${first.adoption_score}% to ${current.adoption_score}%; active users grew ${first.active_users} to ${current.active_users}.`;
}

function recommendationsForRecipe(
  recipe: DeckRecipe,
  current: NormalizedRow,
  safeSourceActions: string[]
) {
  if (recipe.recipe_id === "executive_adoption_update") {
    return [
      "Name the sponsor cadence for the next adoption checkpoint.",
      safeSourceActions[0] ??
        `Assign accountable owners for ${String(
          workflowNoun(current.lowest_feature)
        ).toLowerCase()} response targets.`,
      "Review risk progress in the next steering committee."
    ];
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return [
      "Translate the brief into one owner, one workflow target, and one follow-up date.",
      safeSourceActions[0] ?? current.recommendation_1,
      "Keep follow-up content consistent with this deck."
    ];
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return [
      safeSourceActions[0] ?? "Confirm the value narrative for the next executive business review.",
      safeSourceActions[1] ?? `Prioritize ${String(workflowNoun(current.lowest_feature)).toLowerCase()} enablement for next quarter.`,
      safeSourceActions[2] ?? "Tie adoption follow-up to renewal, expansion, or value-realization owners."
    ];
  }

  if (recipe.recipe_id === "product_update_deck") {
    return [
      safeSourceActions[0] ?? "Map product updates to the client's owned tools and active workflows.",
      safeSourceActions[1] ?? `Use ${String(workflowNoun(current.top_feature)).toLowerCase()} momentum as the enablement entry point.`,
      safeSourceActions[2] ?? `Build targeted enablement for ${String(workflowNoun(current.lowest_feature)).toLowerCase()}.`
    ];
  }

  return [
    safeSourceActions[0] ?? current.recommendation_1,
    safeSourceActions[1] ?? current.recommendation_2,
    safeSourceActions[2] ?? current.recommendation_3
  ];
}

function actionStepsForRecipe(recipe: DeckRecipe, current: NormalizedRow) {
  if (recipe.recipe_id === "executive_adoption_update") {
    return [
      "Confirm the executive sponsor for the next adoption checkpoint.",
      "Assign owners for the highest-risk workflow gap.",
      "Review progress in the next steering committee."
    ];
  }

  if (recipe.recipe_id === "risk_remediation_plan") {
    return [
      current.recommendation_1,
      current.recommendation_2,
      current.recommendation_3
    ].map((recommendation) => compactText(recommendation, 130));
  }

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return [
      "Confirm the audience-specific decision needed from this brief.",
      compactText(current.recommendation_1, 130),
      "Keep follow-up content inside the approved template library."
    ];
  }

  if (recipe.recipe_id === "quarterly_business_review") {
    return [
      "Align QBR narrative to value delivered and next-quarter priorities.",
      compactText(current.recommendation_1, 130),
      "Confirm executive owners for renewal or expansion follow-up."
    ];
  }

  if (recipe.recipe_id === "product_update_deck") {
    return [
      "Confirm which owned tools should anchor the product update.",
      compactText(current.recommendation_2, 130),
      "Turn relevant release notes into workflow-specific enablement actions."
    ];
  }

  return [
    "Confirm executive sponsor for the 90-day adoption cadence.",
    "Prioritize submittal response targets in project health reviews.",
    "Refresh role-based onboarding for all new active projects."
  ];
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function compactSourceSnippet(text: string, maxLength = 140) {
  const normalized = normalizeWhitespace(text);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function splitSentences(text: string) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sourceDocumentLabel(document: SourceDocument) {
  return compactSourceSnippet(document.name, 48);
}

function findEvidenceSentences(
  sourceDocuments: SourceDocument[],
  pattern: RegExp,
  maxItems: number
) {
  const matches: string[] = [];

  for (const document of sourceDocuments) {
    const sentences = splitSentences(document.text);

    for (const sentence of sentences) {
      if (!pattern.test(sentence)) {
        continue;
      }

      matches.push(
        `${sourceDocumentLabel(document)}: ${compactSourceSnippet(sentence, 240)}`
      );

      if (matches.length >= maxItems) {
        return matches;
      }
    }
  }

  return matches;
}

function findPrioritizedEvidenceSentences(
  sourceDocuments: SourceDocument[],
  primaryPattern: RegExp,
  fallbackPattern: RegExp,
  maxItems: number
) {
  const primaryMatches = findEvidenceSentences(
    sourceDocuments,
    primaryPattern,
    maxItems
  );

  return primaryMatches.length > 0
    ? primaryMatches
    : findEvidenceSentences(sourceDocuments, fallbackPattern, maxItems);
}

function buildSourceEvidence(sourceDocuments: SourceDocument[] = []): SourceEvidence {
  const boundedDocuments = sourceDocuments.slice(0, 20).map((document) => ({
    ...document,
    text: document.text.slice(0, MAX_SOURCE_DOCUMENT_CHARS)
  }));
  const refs = boundedDocuments.map(
    (document) => `Source doc: ${sourceDocumentLabel(document)}`
  );
  const risks = findPrioritizedEvidenceSentences(
    boundedDocuments,
    /^\s*(risk|blocker|concern|gap|issue):/i,
    /\b(risk|blocker|concern|gap|delay|late|stalled|issue|low|lowest)\b/i,
    6
  );
  const recommendations = findPrioritizedEvidenceSentences(
    boundedDocuments,
    /^\s*(recommendation|next step|action):/i,
    /\b(recommend|next step|action|owner|mitigate|enable|train|review|rollout|launch|product update|release)\b/i,
    6
  );
  const trendNotes = findPrioritizedEvidenceSentences(
    boundedDocuments,
    /^\s*trend note:/i,
    /\b(adoption|usage|mobile|growth|active|trend|trajectory|volume|tool|tools|module|modules|product|release|roadmap|feature)\b/i,
    6
  );
  const constraints = findPrioritizedEvidenceSentences(
    boundedDocuments,
    /^\s*constraint:/i,
    /\b(must|cannot|do not|approved|brand|template|logo|asset|legal|compliance)\b/i,
    4
  );
  const appendixNotes = boundedDocuments.map(
    (document) =>
      `${sourceDocumentLabel(document)}: ${document.type}, ${document.text.length.toLocaleString()} characters reviewed.`
  );

  return {
    refs,
    constraints,
    recommendations,
    risks,
    trendNotes,
    appendixNotes,
    summary: {
      document_count: boundedDocuments.length,
      evidence_refs: refs,
      constraints: constraints.map(sourceRefText)
    }
  };
}

function cleanProductUpdatePoint(value: string) {
  return normalizeWhitespace(value)
    .replace(
      /^(what|what it is|why|why it matters|who it'?s for|how to get started)\s*:\s*/i,
      ""
    )
    .replace(/^[-:|•●○\s]+/, "")
    .trim();
}

function splitProductUpdatePoints(block: string, maxItems: number) {
  const normalized = normalizeWhitespace(block);

  if (!normalized) {
    return [];
  }

  const bulletParts = normalized
    .split(/\s*[•●○]\s*/g)
    .map(cleanProductUpdatePoint)
    .filter((point) => point.length >= 12);
  const parts =
    bulletParts.length > 1
      ? bulletParts
      : splitSentences(normalized).map(cleanProductUpdatePoint);

  return uniqueClientLines(parts)
    .filter(isSafeClientSourceCopy)
    .map((point) => compactClientSourceCopy(point, 138))
    .slice(0, maxItems);
}

function firstUsefulPoint(points: string[], fallback: string) {
  return points.find((point) => point.length > 0) ?? fallback;
}

function normalizeMetadataValue(value: string, fallback: string) {
  const cleaned = normalizeWhitespace(value)
    .replace(/^[:|\s]+/, "")
    .replace(/[|]+$/g, "")
    .trim();

  return compactText(cleaned || fallback, 54);
}

function extractTitleFromProductBlock(block: string) {
  const beforeWhat = block.match(/^(.{4,140}?)\s+What(?: it is)?\s*:/i)?.[1];

  if (beforeWhat) {
    return beforeWhat;
  }

  const afterWhy = block
    .replace(/[\s\S]*\bWhy(?: it matters)?\s*:/i, "")
    .split(/\bSolution Area\s*:/i)[0]
    ?.trim();

  if (afterWhy) {
    const tail = normalizeWhitespace(afterWhy.replace(/[•●○]/g, " "));
    const lastBoundary = Math.max(
      tail.lastIndexOf("."),
      tail.lastIndexOf("?"),
      tail.lastIndexOf("!")
    );
    const titleTail =
      lastBoundary >= 0 ? tail.slice(lastBoundary + 1).trim() : tail;

    if (titleTail.length >= 4 && titleTail.length <= 100) {
      return titleTail;
    }
  }

  if (afterWhy && afterWhy.length <= 120) {
    return afterWhy;
  }

  return "";
}

function productBlockForMetadata(
  text: string,
  metadataStart: number,
  metadataEnd: number,
  nextMetadataStart: number
) {
  const after = text.slice(metadataEnd, nextMetadataStart).trim();
  const before = text.slice(Math.max(0, metadataStart - 2400), metadataStart).trim();
  const afterHasWhat = /\bWhat(?: it is)?\s*:/i.test(after);
  const beforeHasWhat = /\bWhat(?: it is)?\s*:/i.test(before);

  if (afterHasWhat || !beforeHasWhat) {
    return after;
  }

  return before;
}

function extractWhatAndWhyBlocks(block: string) {
  const whatMatch = block.match(
    /\bWhat(?: it is)?\s*:\s*([\s\S]*?)(?=\bWhy(?: it matters)?\s*:|\bWho it'?s for\s*:|\bHow to get started\s*:|$)/i
  );
  const whyMatch = block.match(
    /\bWhy(?: it matters)?\s*:\s*([\s\S]*?)(?=\bHow to get started\s*:|\bSolution Area\s*:|$)/i
  );

  return {
    what: whatMatch?.[1] ?? "",
    why: whyMatch?.[1] ?? ""
  };
}

function extractProductReleaseUpdates(
  sourceDocuments: SourceDocument[] = []
): ProductReleaseUpdate[] {
  const updates: ProductReleaseUpdate[] = [];
  const metadataPattern =
    /Solution Area\s*:?\s*([^|]{1,100})\|\s*Tool\s*:?\s*([^|]{1,100})\|\s*Launch Type\s*:?\s*([^|]{1,80})\|\s*Region\s*:?\s*((?:All Regions|US Only|US|ANZ,\s*UKI|APAC,\s*NAMER,\s*UKI|NAMER|APAC|UKI|EMEA|EU|Global|North America|[^|]{1,42}?)(?=\s+(?:[A-Z][A-Za-z0-9]+|What(?: it is)?\s*:)|$))/gi;

  for (const document of sourceDocuments.slice(0, 10)) {
    const text = normalizeWhitespace(document.text.slice(0, MAX_SOURCE_DOCUMENT_CHARS));
    const matches = Array.from(text.matchAll(metadataPattern));

    matches.forEach((match, index) => {
      const metadataStart = match.index ?? 0;
      const metadataEnd = metadataStart + match[0].length;
      const nextMetadataStart = matches[index + 1]?.index ?? text.length;
      const block = productBlockForMetadata(
        text,
        metadataStart,
        metadataEnd,
        nextMetadataStart
      );
      const solutionArea = normalizeMetadataValue(match[1] ?? "", "Product");
      const tool = normalizeMetadataValue(match[2] ?? "", "Tool");
      const launchType = normalizeMetadataValue(match[3] ?? "", "Update");
      const region = normalizeMetadataValue(match[4] ?? "", "All regions");
      const extractedTitle = compactText(
        cleanProductUpdatePoint(extractTitleFromProductBlock(block)) ||
          tool,
        56
      );
      const title =
        extractedTitle.toLowerCase() === solutionArea.toLowerCase() ||
        /^[\d\s._-]+/.test(extractedTitle)
          ? compactText(`${tool} Update`, 56)
          : extractedTitle;
      const { what, why } = extractWhatAndWhyBlocks(block);
      const whatPoints = splitProductUpdatePoints(what, 3);
      const whyPoints = splitProductUpdatePoints(why, 3);

      if (whatPoints.length === 0 && whyPoints.length === 0) {
        return;
      }

      updates.push({
        title,
        solutionArea,
        tool,
        launchType,
        region,
        whatPoints,
        whyPoints,
        sourceRef: sourceRefText(
          `${sourceDocumentLabel(document)}: ${title} (${launchType})`
        )
      });
    });
  }

  const seen = new Set<string>();

  return updates.filter((update) => {
    const key = `${update.title}|${update.tool}|${update.launchType}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function groupProductUpdatesBySolutionArea(updates: ProductReleaseUpdate[]) {
  const groups: Array<{ solutionArea: string; updates: ProductReleaseUpdate[] }> = [];
  const indexByArea = new Map<string, number>();

  updates.forEach((update) => {
    const key = update.solutionArea.toLowerCase();
    const existingIndex = indexByArea.get(key);

    if (existingIndex !== undefined) {
      groups[existingIndex]?.updates.push(update);
      return;
    }

    indexByArea.set(key, groups.length);
    groups.push({
      solutionArea: update.solutionArea,
      updates: [update]
    });
  });

  return groups;
}

function tokenSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3)
  );
}

function scoreProductUpdate({
  update,
  userPrompt,
  contextPack,
  current
}: {
  update: ProductReleaseUpdate;
  userPrompt: string;
  contextPack?: ContextPack;
  current: NormalizedRow;
}) {
  let score = 0;
  const reasons: string[] = [];
  const ownedTools = contextOwnedTools(contextPack);
  const haystack = `${update.solutionArea} ${update.tool} ${update.title} ${
    update.whatPoints.join(" ")
  } ${update.whyPoints.join(" ")}`.toLowerCase();

  if (
    ownedTools.some(
      (tool) => haystack.includes(tool) || tool.includes(update.tool.toLowerCase())
    )
  ) {
    score += 45;
    reasons.push("Matches an owned client tool.");
  }

  const profileTerms = [
    contextPack?.clientProfile?.segment,
    contextPack?.clientProfile?.stage,
    ...(contextPack?.clientProfile?.businessGoals ?? []),
    ...(contextPack?.clientProfile?.risks ?? [])
  ]
    .filter((term): term is string => Boolean(term))
    .join(" ");
  const profileTokens = tokenSet(profileTerms);
  const matchedProfileTokens = Array.from(profileTokens).filter((token) =>
    haystack.includes(token)
  );

  if (matchedProfileTokens.length > 0) {
    score += Math.min(25, matchedProfileTokens.length * 5);
    reasons.push("Matches client segment, stage, goals, or risks.");
  }

  const adoptionGap = `${current.lowest_feature} ${current.top_feature}`.toLowerCase();

  if (adoptionGap && haystack.includes(adoptionGap.split(/\s+/)[0] ?? "")) {
    score += 15;
    reasons.push("Connects to current workflow signals.");
  }

  const promptTokens = tokenSet(userPrompt);
  const matchedPromptTokens = Array.from(promptTokens).filter((token) =>
    haystack.includes(token)
  );

  if (matchedPromptTokens.length > 0) {
    score += Math.min(15, matchedPromptTokens.length * 3);
    reasons.push("Matches prompt priorities.");
  }

  if (/ga|general availability/i.test(update.launchType)) {
    score += 4;
  }

  if (/beta|preview/i.test(update.launchType)) {
    score += 2;
  }

  return {
    ...update,
    relevanceScore: score,
    relevanceReasons:
      reasons.length > 0 ? reasons : ["Included from selected product context."]
  };
}

function rankProductUpdates({
  updates,
  userPrompt,
  contextPack,
  current
}: {
  updates: ProductReleaseUpdate[];
  userPrompt: string;
  contextPack?: ContextPack;
  current: NormalizedRow;
}) {
  return updates
    .map((update) =>
      scoreProductUpdate({
        update,
        userPrompt,
        contextPack,
        current
      })
    )
    .sort(
      (a, b) =>
        (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
        a.solutionArea.localeCompare(b.solutionArea)
    );
}

function parseMeetingLengthMinutes(prompt: string) {
  const hourMatch = prompt.match(/\b(\d{1,2})\s*(hour|hr)s?\b/i);

  if (hourMatch) {
    return Number(hourMatch[1]) * 60;
  }

  const minuteMatch = prompt.match(/\b(\d{1,3})\s*(minute|min)s?\b/i);

  return minuteMatch ? Number(minuteMatch[1]) : 0;
}

function targetDeckSlideCount({
  recipe,
  userPrompt,
  sourceEvidence,
  sourceCharacters,
  productUpdates
}: {
  recipe: DeckRecipe;
  userPrompt: string;
  sourceEvidence: SourceEvidence;
  sourceCharacters: number;
  productUpdates: ProductReleaseUpdate[];
}) {
  const requestedMinutes = parseMeetingLengthMinutes(userPrompt);
  const promptRequestsDepth = EXPANDED_DECK_PROMPT_PATTERN.test(userPrompt);

  if (recipe.recipe_id === "product_update_deck") {
    if (requestedMinutes >= 60) {
      return MAX_DECK_SLIDES;
    }

    if (requestedMinutes >= 45) {
      return 28;
    }

    if (requestedMinutes >= 30) {
      return 22;
    }

    if (productUpdates.length >= 12 && promptRequestsDepth) {
      return 28;
    }

    if (productUpdates.length >= 8) {
      return 22;
    }

    if (productUpdates.length >= 4) {
      return 16;
    }

    return shouldExpandDeckForContext({
      userPrompt,
      sourceEvidence,
      sourceCharacters
    })
      ? 14
      : 12;
  }

  if (requestedMinutes >= 45 || promptRequestsDepth) {
    return Math.min(MAX_DECK_SLIDES, Math.max(16, recipe.slide_sequence.length + 4));
  }

  return Math.min(MAX_DECK_SLIDES, 16);
}

function appendEvidence(base: string[], additions: string[], maxItems = 3) {
  return [...base, ...additions.slice(0, maxItems)].map(sourceRefText);
}

function hasMetricSignal(row: NormalizedRow) {
  return (
    row.active_users > 0 ||
    row.licensed_users > 0 ||
    row.adoption_score > 0 ||
    row.projects_active > 0 ||
    row.mobile_usage_rate > 0 ||
    row.daily_logs_count > 0 ||
    row.rfi_count > 0 ||
    row.submittals_count > 0
  );
}

const UNSAFE_SOURCE_COPY_PATTERNS = [
  /\bignore\b.*\b(brand|template|layout|logo|governance)\b/i,
  /\b(change|move|replace|redesign)\b.*\b(logo|brand|template|layout|font|color)\b/i,
  /\b(unapproved|unauthorized|off-brand)\b/i,
  /\b(purple|gradient|icon|asset|logo placement|brand governance)\b/i,
  /\b(openai|api|model|prompt|renderer|pptxgen|layout id|object id)\b/i
];

function stripSourceLabel(value: string) {
  return value
    .replace(/^[^:]{1,64}:\s*/, "")
    .replace(/^(recommendation|next step|action|risk):\s*/i, "")
    .trim();
}

function isSafeClientSourceCopy(value: string) {
  return !UNSAFE_SOURCE_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

function sentenceCase(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function sourceRefText(value: string) {
  return compactText(value, 156);
}

function compactClientSourceCopy(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const commaBoundary = normalized.indexOf(",");

  if (commaBoundary >= 48 && commaBoundary <= maxLength - 1) {
    return `${normalized.slice(0, commaBoundary).trim()}.`;
  }

  const conjunctionBoundary = Array.from(
    normalized.matchAll(/\s+(and|while|because|but)\s+/gi)
  )
    .map((match) => match.index ?? -1)
    .find((index) => index >= 48 && index <= maxLength - 1);

  if (conjunctionBoundary !== undefined) {
    return `${normalized.slice(0, conjunctionBoundary).trim()}.`;
  }

  return compactText(normalized, maxLength);
}

function safeSourceRecommendations(sourceEvidence: SourceEvidence) {
  return sourceEvidence.recommendations
    .map(stripSourceLabel)
    .filter((recommendation) => recommendation.length > 0)
    .filter(isSafeClientSourceCopy)
    .map((recommendation) =>
      compactClientSourceCopy(sentenceCase(recommendation), 118)
    );
}

function safeSourceRisks(sourceEvidence: SourceEvidence) {
  return sourceEvidence.risks
    .map(stripSourceLabel)
    .filter((risk) => risk.length > 0)
    .filter(isSafeClientSourceCopy)
    .map(sentenceCase);
}

function riskSummaryForRecipe(
  current: NormalizedRow,
  sourceEvidence: SourceEvidence
) {
  const [sourceRisk] = safeSourceRisks(sourceEvidence);

  if (!sourceRisk) {
    return current.risk_summary;
  }

  return `${compactClientSourceCopy(sourceRisk, 98)} ${compactClientSourceCopy(
    current.risk_summary,
    88
  )}`;
}

function uniqueClientLines(lines: string[]) {
  const seen = new Set<string>();

  return lines.filter((line) => {
    const key = line.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

const EXPANDED_DECK_PROMPT_PATTERN =
  /\b(comprehensive|detailed|deep dive|deep-dive|board packet|appendix|more slides|longer deck|full deck|expanded|thorough)\b/i;

function sourcePackCharacterCount(sourceDocuments: SourceDocument[] = []) {
  return sourceDocuments.reduce(
    (total, document) => total + normalizeWhitespace(document.text).length,
    0
  );
}

function shouldExpandDeckForContext({
  userPrompt,
  sourceEvidence,
  sourceCharacters
}: {
  userPrompt: string;
  sourceEvidence: SourceEvidence;
  sourceCharacters: number;
}) {
  const safeEvidenceCount =
    safeSourceRecommendations(sourceEvidence).length +
    safeSourceRisks(sourceEvidence).length +
    sourceEvidence.trendNotes.filter(isSafeClientSourceCopy).length;
  const promptRequestsDepth = EXPANDED_DECK_PROMPT_PATTERN.test(userPrompt);
  const sourcePackIsDense =
    sourceEvidence.summary.document_count >= 2 ||
    sourceCharacters >= 1600 ||
    safeEvidenceCount >= 6;

  return sourceEvidence.summary.document_count > 0 && (promptRequestsDepth || sourcePackIsDense);
}

export function generateDeckPlan(
  userPrompt: string,
  parsedCsvData: AdoptionCsvRow[],
  brandContract: BrandContract,
  options: GenerateDeckPlanOptions = {}
): DeckPlan {
  const recipeSelection = selectDeckRecipe(
    userPrompt,
    options.recipeId,
    options.customRecipes
  );
  const recipe = recipeSelection.recipe;
  const contextRows = rowsFromContextPack(options.contextPack);
  const sourceRows = parsedCsvData.length > 0 ? parsedCsvData : contextRows;
  const hasAccountMetrics = hasUsableMetricRows(sourceRows);

  if (sourceRows.length === 0 && recipeRequiresAccountMetrics(recipe)) {
    throw new Error(
      `${recipe.name} needs client, period, active user, licensed user, and adoption score metrics. Add a metrics snapshot or choose a source-only deck type.`
    );
  }

  if (!hasAccountMetrics && recipeRequiresAccountMetrics(recipe)) {
    throw new Error(
      `${recipe.name} needs adoption/account metrics before BrandDeck can generate the deck. Add a metrics snapshot with client name, period, active users, licensed users, and adoption score.`
    );
  }

  const rowsForPlanning =
    sourceRows.length > 0
      ? sourceRows
      : [fallbackRowFromContextPack(options.contextPack, recipe)];
  const inputRows = rowsForPlanning.map(normalizeRow);
  const latestInputRow = inputRows[inputRows.length - 1];
  const rowsWithMetricSignal = inputRows.filter(hasMetricSignal);
  const rows = rowsWithMetricSignal.length > 0 ? rowsWithMetricSignal : inputRows;
  const first = rows[0];
  const current = rows[rows.length - 1];
  const prior = rows.length > 1 ? rows[rows.length - 2] : rows[0];
  const usingFallbackMetrics = latestInputRow !== current || !hasAccountMetrics;
  const metricsNeedConfirmation =
    usingFallbackMetrics ||
    (current.licensed_users === 0 && current.active_users > 0);
  const intent = buildPromptIntent(userPrompt);
  const adoptionRate = adoptionCoverage(
    current.active_users,
    current.licensed_users
  );
  const adoptionDelta = current.adoption_score - prior.adoption_score;
  const mobileDelta = current.mobile_usage_rate - prior.mobile_usage_rate;
  const sourceRefsForRecipe = [
    `Recipe: ${recipe.name}`,
    `Recipe mode: ${recipe.mode}`,
    recipeSelection.reason
  ];
  const sourceEvidence = buildSourceEvidence(options.sourceDocuments);
  const sourceDocRefs = sourceEvidence.refs;
  const sourceCharacters = sourcePackCharacterCount(options.sourceDocuments);
  const extractedProductUpdates = extractProductReleaseUpdates(options.sourceDocuments);
  const productUpdates = rankProductUpdates({
    updates: extractedProductUpdates,
    userPrompt,
    contextPack: options.contextPack,
    current
  });
  const sectionPlan = planDeckSections({
    recipe,
    prompt: userPrompt,
    contextPack: options.contextPack,
    productUpdateCount: productUpdates.length
  });
  const slideBudget = sectionPlan.targetSlideCount;
  const chromeLabel = deckChromeLabel(recipe);
  const safeSourceActions = safeSourceRecommendations(sourceEvidence);
  const planClientName = compactText(current.client_name || first.client_name, 80);
  const titleClientName = compactText(current.client_name || first.client_name, 48);
  const reportPeriod = compactText(latestInputRow.report_period, 60);
  const shouldAddContextExpansion = shouldExpandDeckForContext({
    userPrompt,
    sourceEvidence,
    sourceCharacters
  });

  function nextStepLines() {
    return uniqueClientLines([
      ...safeSourceActions,
      ...actionStepsForRecipe(recipe, current)
    ]);
  }

  function productUpdateAgendaItems() {
    const solutionAreas = groupProductUpdatesBySolutionArea(productUpdates)
      .map((group) => group.solutionArea);

    return uniqueClientLines([
      "Audience relevance",
      "Client tool fit",
      ...solutionAreas.map((area) => `${area} updates`),
      "Rollout risks",
      "Client-specific next steps"
    ]).map((item) => compactText(item, 68));
  }

  function sourceTrendFollowUps() {
    return sourceEvidence.trendNotes
      .map(stripSourceLabel)
      .filter((note) => note.length > 0)
      .filter(isSafeClientSourceCopy)
      .map((note) =>
        compactClientSourceCopy(sentenceCase(note), 118)
      );
  }

  function buildContextExpansionSlides(availableSlots: number): DeckSlide[] {
    if (!shouldAddContextExpansion || availableSlots <= 0) {
      return [];
    }

    const riskLines = safeSourceRisks(sourceEvidence);
    const trendFollowUps = sourceTrendFollowUps();
    const additionalActions = uniqueClientLines([
      ...safeSourceActions.slice(3),
      `Assign an owner for ${String(
        workflowNoun(current.lowest_feature)
      ).toLowerCase()} follow-through.`,
      `Review ${current.projects_active} active projects for repeatable adoption habits.`,
      `Use ${String(workflowNoun(current.top_feature)).toLowerCase()} wins to reinforce lower-usage teams.`
    ]).map((action) => compactText(action, 150));
    const actionExpansionTitle =
      recipe.recipe_id === "product_update_deck"
        ? "Client Tool Enablement"
        : recipe.recipe_id === "quarterly_business_review"
          ? "Additional Value Actions"
          : recipe.recipe_id === "risk_remediation_plan"
            ? "Additional Risk Actions"
            : "Context-Driven Actions";
    const followUpExpansionTitle =
      recipe.recipe_id === "product_update_deck"
        ? "Product Rollout Follow-Up"
        : recipe.recipe_id === "quarterly_business_review"
          ? "QBR Follow-Up"
          : "Context Follow-Up";
    const expansionSlides: DeckSlide[] = [
      {
        layout_id: "risks_recommendations",
        title: actionExpansionTitle,
        fields: {
          deck_label: chromeLabel,
          risk_summary: compactText(
            uniqueClientLines([
              ...riskLines.slice(1, 4),
              current.risk_summary
            ])
              .map((risk) => compactClientSourceCopy(risk, 92))
              .join(" "),
            190
          ),
          recommendations: additionalActions
        },
        source_refs: appendEvidence(
          ["Source context: additional action evidence", ...sourceRefsForRecipe],
          [...sourceDocRefs, ...sourceEvidence.recommendations, ...sourceEvidence.risks],
          6
        )
      }
    ];

    if (availableSlots <= 1) {
      return expansionSlides;
    }

    const followUpSteps = uniqueClientLines([
      ...trendFollowUps.slice(1, 4),
      ...safeSourceActions.slice(4),
      `Confirm decision owner for ${String(
        workflowNoun(current.lowest_feature)
      ).toLowerCase()} before the next checkpoint.`,
      `Review progress against ${current.adoption_score}% adoption in the next operating cadence.`
    ]).map((step) => compactText(step, 140));

    expansionSlides.push({
      layout_id: "next_steps",
      title: followUpExpansionTitle,
      fields: {
        deck_label: chromeLabel,
        steps: followUpSteps,
        note: compactText(
          "Added when source context supports a deeper deck.",
          160
        )
      },
      source_refs: appendEvidence(
        ["Source context: expanded follow-up", ...sourceRefsForRecipe],
        [...sourceDocRefs, ...sourceEvidence.trendNotes, ...sourceEvidence.appendixNotes],
        6
      )
    });

    return expansionSlides;
  }

  function buildSlide(recipeSlide: DeckRecipeSlide): DeckSlide {
    switch (recipeSlide.slide_role) {
      case "title":
        return {
        layout_id: "title_client_report",
        title: recipeSlide.title,
        fields: {
          client_name: titleClientName,
          report_period: reportPeriod,
            deck_label: chromeLabel,
            subtitle: compactText(
              clientFacingReportSubtitle(recipe, reportPeriod),
              120
            )
        },
        speaker_notes:
          `Welcome and introductions. Frame the goal of this ${reportPeriod} review for ${planClientName}.`,
          source_refs: ["Account metric: client_name", "Account metric: report_period", ...sourceRefsForRecipe]
        };
      case "agenda":
        return {
        layout_id: "agenda",
        title: recipeSlide.title,
        fields: {
            deck_label: chromeLabel,
            agenda_items:
              recipe.recipe_id === "product_update_deck"
                ? productUpdateAgendaItems()
                : agendaItemsForRecipe(recipe)
        },
          source_refs: ["Prompt: report structure", ...sourceRefsForRecipe]
        };
      case "executive_summary":
        return {
        layout_id: "executive_summary",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          summary_points: executiveSummaryPoints(
              recipe,
            current,
            adoptionDelta,
            adoptionRate,
            mobileDelta
            ,
            metricsNeedConfirmation
          ).map((point) => compactText(point, 42)),
          business_impact: compactText(
              executiveBusinessImpact(recipe, current, metricsNeedConfirmation),
            78
          )
        },
        source_refs: [
          "Account metric: adoption_score",
          "Account metric: active_users",
          "Account metric: licensed_users",
            "Prompt: user priorities",
            ...sourceRefsForRecipe,
            ...sourceDocRefs
        ]
        };
      case "kpi_scorecard":
        return {
        layout_id: "adoption_kpi_scorecard",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          chart_type: "scorecard",
          active_users: current.active_users,
          licensed_users: current.licensed_users,
          adoption_score: current.adoption_score,
          projects_active: current.projects_active,
          mobile_usage_rate: current.mobile_usage_rate,
          lowest_feature: current.lowest_feature,
          metric_context: metricContextForRecipe(
            recipe,
            current,
            adoptionRate,
            metricsNeedConfirmation
          )
        },
        source_refs: [
          "Account metric: active_users",
          "Account metric: licensed_users",
          "Account metric: adoption_score",
          "Account metric: projects_active",
            "Account metric: mobile_usage_rate",
            ...sourceRefsForRecipe
        ]
        };
      case "usage_trend":
        return {
        layout_id: "usage_trend",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          chart_type: "line",
          trend_points: rows.map((row) => ({
            label: compactText(row.report_period, 24),
            adoption_score: row.adoption_score,
            active_users: row.active_users
          })),
          trend_summary: compactText(
            sourceEvidence.trendNotes[0]
              ? trendSummaryForRecipe(
                  recipe,
                  first,
                  current,
                  metricsNeedConfirmation
                )
              : trendSummaryForRecipe(
                  recipe,
                  first,
                  current,
                  metricsNeedConfirmation
                ),
            72
          )
        },
          source_refs: appendEvidence([
            "Account metric: report_period",
            "Account metric: adoption_score",
            "Account metric: active_users",
            ...sourceRefsForRecipe
          ], sourceDocRefs)
        };
      case "feature_adoption":
        {
          const featureMetrics = contextMetricFeatureRows(
            options.contextPack,
            productUpdates,
            current
          ).sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

          // top_feature must agree with the highest bar on the chart, so it
          // is derived from the measured counts. The focus area is a declared
          // business judgment (account snapshot / sources), so the declared
          // value wins and the smallest count is only a fallback.
          const hasMeasuredCounts = featureMetrics.some(
            (metric) => (metric.count ?? 0) > 0
          );
          const derivedTop = hasMeasuredCounts
            ? featureMetrics[0]?.feature
            : undefined;
          const derivedLowest = hasMeasuredCounts
            ? featureMetrics[featureMetrics.length - 1]?.feature
            : undefined;

          return {
          layout_id: "feature_adoption",
          title: clientFacingSlideTitle(recipe, recipeSlide),
          fields: {
              deck_label: chromeLabel,
            chart_type: "bar",
            feature_metrics: featureMetrics,
            top_feature: compactText(
              derivedTop || current.top_feature || "Top workflow",
              48
            ),
            lowest_feature: compactText(
              current.lowest_feature ||
                derivedLowest ||
                "Focus workflow",
              48
            )
          },
          source_refs: [
            "Context metrics: feature signals",
            "Account metric: top_feature",
              "Account metric: lowest_feature",
              ...sourceRefsForRecipe
          ]
          };
        }
      case "risks_recommendations":
        return {
        layout_id: "risks_recommendations",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          risk_summary: compactText(riskSummaryForRecipe(current, sourceEvidence), 190),
          recommendations: recommendationsForRecipe(
            recipe,
            current,
            safeSourceActions
          ).map((recommendation) => compactText(recommendation, 150))
        },
        source_refs: appendEvidence([
          "Account context: risk_summary",
          "Account context: recommendation_1",
          "Account context: recommendation_2",
            "Account context: recommendation_3",
            ...sourceRefsForRecipe
        ], [...sourceDocRefs, ...sourceEvidence.risks])
        };
      case "next_steps":
        return {
        layout_id: "next_steps",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
            steps: nextStepLines().map((step) => compactText(step, 130))
        },
          source_refs: appendEvidence(
            ["Account context: recommendations", "Prompt: action emphasis", ...sourceRefsForRecipe],
            sourceDocRefs
          )
        };
      case "statement":
        return {
          layout_id: "statement",
          title: recipeSlide.title,
          fields: {
            deck_label: chromeLabel,
            statement_text: compactText(
              recipeSlide.content_focus.replaceAll("{client}", planClientName),
              180
            )
          },
          speaker_notes:
            "Frame the goal of the meeting before moving into the data.",
          source_refs: ["Meeting framing statement", ...sourceRefsForRecipe]
        };
      case "appendix_source_notes":
        return {
        layout_id: "next_steps",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          steps: [
            compactText(
              `Usage data: ${inputRows.length} reporting periods of account metrics for ${planClientName}.`,
              140
            ),
              sourceEvidence.summary.document_count > 0
                ? `Supporting documents: ${sourceEvidence.summary.document_count} reviewed for this report.`
                : "Supporting context: account snapshot and team input.",
              compactText(`Reporting window: ${reportPeriod}.`, 140)
          ],
            note: compactText(
              "All figures reflect the data sources listed above. Your account team can provide full detail on request.",
              160
            )
        },
          source_refs: appendEvidence(
            ["Account metrics: all fields", "Brand contract: approved_layouts", ...sourceRefsForRecipe],
            [...sourceDocRefs, ...sourceEvidence.appendixNotes],
            6
          )
        };
      default:
        return {
          layout_id: recipeSlide.layout_id,
          title: recipeSlide.title,
          fields: {
            steps: [compactText(recipeSlide.content_focus, 130)]
          },
          source_refs: sourceRefsForRecipe
        };
    }
  }

  function recipeSlideForRole(role: string) {
    return recipe.slide_sequence.find((slide) => slide.slide_role === role);
  }

  function productSectionSlide(
    solutionArea: string,
    updates: ProductReleaseUpdate[]
  ): DeckSlide {
    const launchTypes = uniqueClientLines(
      updates.map((update) => update.launchType).filter(Boolean)
    ).join(", ");
    const tools = uniqueClientLines(updates.map((update) => update.tool))
      .slice(0, 3)
      .join(", ");

    return {
      layout_id: "next_steps",
      title: compactText(solutionArea, 48),
      fields: {
        deck_label: chromeLabel,
        steps: [
          compactText(`${updates.length} update${updates.length === 1 ? "" : "s"} in this section.`, 130),
          compactText(`Tools: ${tools || "customer-owned workflows"}.`, 130),
          compactText(`Launch mix: ${launchTypes || "product update"}.`, 130)
        ],
        note: "Release chapter"
      },
      source_refs: appendEvidence(
        [`Product update section: ${solutionArea}`, ...sourceRefsForRecipe],
        updates.map((update) => update.sourceRef),
        6
      )
    };
  }

  function productUpdateFocusSlide(): DeckSlide {
    return {
      layout_id: "next_steps",
      title: "Update Focus",
      fields: {
        deck_label: chromeLabel,
        steps: [
          "Confirm the product update source for the session.",
          compactText(`Prioritize tools tied to ${current.top_feature}.`, 130),
          compactText(`Prepare enablement around ${current.lowest_feature}.`, 130)
        ],
        note: "Source context recommended"
      },
      source_refs: appendEvidence(
        ["Product update focus", ...sourceRefsForRecipe],
        sourceDocRefs,
        4
      )
    };
  }

  function productReleaseDetailSlide(
    update: ProductReleaseUpdate
  ): DeckSlide {
    const what = firstUsefulPoint(
      update.whatPoints,
      `${update.tool} update is available for ${update.region}.`
    );
    const why = firstUsefulPoint(
      update.whyPoints,
      "Review relevance against the client's owned tools and rollout plan."
    );
    const followUp =
      update.whatPoints[1] ??
      update.whyPoints[1] ??
      `Enable ${update.tool} owners before broader rollout.`;

    return {
      layout_id: "risks_recommendations",
      title: compactText(update.title, 56),
      fields: {
        deck_label: chromeLabel,
        risk_summary: compactText(
          `${update.solutionArea} | ${update.tool} | ${update.launchType} | ${update.region}`,
          190
        ),
        recommendations: [
          compactText(`What: ${what}`, 150),
          compactText(`Why: ${why}`, 150),
          compactText(`Enablement: ${followUp}`, 150)
        ]
      },
      source_refs: appendEvidence(
        [update.sourceRef, ...sourceRefsForRecipe],
        sourceDocRefs,
        4
      )
    };
  }

  function productUpdateOverviewSlide(
    selectedUpdates: ProductReleaseUpdate[]
  ): DeckSlide {
    const groups = groupProductUpdatesBySolutionArea(selectedUpdates);
    const featureMetrics = (groups.length > 0
      ? groups.map((group) => ({
          feature: compactText(group.solutionArea, 32),
          count: group.updates.length
        }))
      : [
          { feature: "Owned tools", count: current.projects_active },
          { feature: "Active users", count: current.active_users },
          { feature: "Mobile usage", count: current.mobile_usage_rate }
        ]
    ).sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

    return {
      layout_id: "feature_adoption",
      title: "Release Mix",
      fields: {
        deck_label: chromeLabel,
        chart_type: "table",
        feature_metrics: featureMetrics,
        top_feature: compactText(
          featureMetrics[0]?.feature || current.top_feature,
          48
        ),
        lowest_feature: compactText(
          featureMetrics[featureMetrics.length - 1]?.feature ||
            current.lowest_feature,
          48
        )
      },
      source_refs: appendEvidence(
        ["Product update source: release mix", ...sourceRefsForRecipe],
        selectedUpdates.map((update) => update.sourceRef),
        6
      )
    };
  }

  function buildProductUpdateDeckSlides() {
    const introRoles = [
      "title",
      "agenda",
      "executive_summary",
      "feature_adoption",
      ...(hasAccountMetrics ? ["kpi_scorecard"] : [])
    ];
    const closingRoles = [
      "risks_recommendations",
      "next_steps",
      "appendix_source_notes"
    ];
    const introSlides = introRoles.flatMap((role) => {
      const slide = recipeSlideForRole(role);
      return slide ? [buildSlide(slide)] : [];
    });
    const closingSlides = closingRoles.flatMap((role) => {
      const slide = recipeSlideForRole(role);
      return slide ? [buildSlide(slide)] : [];
    });
    const availableMiddleSlots = Math.max(
      0,
      slideBudget - introSlides.length - closingSlides.length
    );

    if (productUpdates.length === 0 || availableMiddleSlots === 0) {
      const fallbackMiddle = [
        productUpdateFocusSlide(),
        productUpdateOverviewSlide([]),
        ...(hasAccountMetrics && recipeSlideForRole("usage_trend")
          ? [buildSlide(recipeSlideForRole("usage_trend") as DeckRecipeSlide)]
          : [])
      ].slice(0, availableMiddleSlots);

      return [...introSlides, ...fallbackMiddle, ...closingSlides].slice(
        0,
        slideBudget
      );
    }

    const middleSlides: DeckSlide[] = [];
    const groupedUpdates = groupProductUpdatesBySolutionArea(productUpdates);
    const selectedUpdates: ProductReleaseUpdate[] = [];
    const availableReleaseSlots = Math.max(0, availableMiddleSlots - 1);

    for (const group of groupedUpdates) {
      if (middleSlides.length >= availableReleaseSlots) {
        break;
      }

      const remainingAfterDivider = availableReleaseSlots - middleSlides.length - 1;

      if (remainingAfterDivider <= 0) {
        break;
      }

      middleSlides.push(productSectionSlide(group.solutionArea, group.updates));

      for (const update of group.updates) {
        if (middleSlides.length >= availableReleaseSlots) {
          break;
        }

        middleSlides.push(productReleaseDetailSlide(update));
        selectedUpdates.push(update);
      }
    }

    const overview = productUpdateOverviewSlide(
      selectedUpdates.length > 0 ? selectedUpdates : productUpdates.slice(0, 3)
    );
    const slides = [
      ...introSlides,
      ...[overview, ...middleSlides].slice(0, availableMiddleSlots),
      ...closingSlides
    ];

    return slides.slice(0, slideBudget);
  }

  const metricOnlyRoles = new Set(["kpi_scorecard", "usage_trend"]);
  const recipeSlidesForPlanning =
    hasAccountMetrics || recipeRequiresAccountMetrics(recipe)
      ? recipe.slide_sequence
      : recipe.slide_sequence.filter(
          (recipeSlide) => !metricOnlyRoles.has(recipeSlide.slide_role)
        );
  const baseSlides =
    recipe.recipe_id === "product_update_deck"
      ? buildProductUpdateDeckSlides()
      : recipeSlidesForPlanning.map(buildSlide);
  const appendixIndex = baseSlides.findIndex((slide) =>
    /source notes/i.test(slide.title)
  );
  const expansionSlides = buildContextExpansionSlides(
    Math.max(0, slideBudget - baseSlides.length)
  );
  const slides =
    expansionSlides.length > 0 && appendixIndex >= 0
      ? [
          ...baseSlides.slice(0, appendixIndex),
          ...expansionSlides,
          ...baseSlides.slice(appendixIndex)
        ]
      : [...baseSlides, ...expansionSlides];
  const visibleProductTitles = new Set(
    slides.map((slide) => slide.title.toLowerCase())
  );
  const omittedProductUpdates = productUpdates.filter(
    (update) => !visibleProductTitles.has(update.title.toLowerCase())
  );
  const omittedEvidence = [
    ...omittedProductUpdates.map((update, index) => ({
      id: `product-update-omitted-${index + 1}`,
      reason:
        "Lower relevance to the selected client context or outside the adaptive slide budget.",
      content_type: "product_update",
      item_count: 1,
      source_ref: update.sourceRef
    }))
  ];

  const deckPlan: DeckPlan = {
    deck_type: recipe.recipe_id,
    deck_recipe_id: recipe.recipe_id,
    deck_recipe_name: recipe.name,
    generation_mode: recipe.mode,
    recipe_confidence: recipeSelection.confidence,
    audience: compactText(recipeAudience(recipe, intent.audience), 80),
    client_name: planClientName,
    report_period: reportPeriod,
    source_pack: sourceEvidence.summary.document_count > 0
      ? sourceEvidence.summary
      : undefined,
    omitted_evidence: omittedEvidence.length > 0 ? omittedEvidence : undefined,
    slides
  };

  return DeckPlanSchema.parse(chunkDeckPlanContent(deckPlan));
}

export function createStructuredOutputsPlaceholder() {
  return {
    status: "available_when_configured",
    reason:
      "OpenAI Structured Outputs can produce the same DeckPlanSchema shape when configured. Validation and rendering remain deterministic so brand controls stay intact.",
    agent_orchestration_contract: "data/agent-orchestration-contract.json",
    suggested_specialists: [
      "intent_router",
      "source_analyst",
      "data_analyst",
      "deck_planner",
      "fit_editor",
      "compliance_reviewer"
    ],
    required_contract_boundary:
      "The model may choose approved layout IDs and fill placeholder content only. It must not choose colors, typography, geometry, or slide object positions."
  };
}
