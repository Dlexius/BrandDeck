import {
  type BrandContract,
  type DeckPlan,
  type DeckSlide,
  type SourceDocument,
  type SourcePackSummary,
  DeckPlanSchema
} from "@/lib/deck-plan-schema";
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
    return `${slice.slice(0, wordBoundary).trim()}...`;
  }

  return `${slice.trim()}...`;
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

function recipeAudience(recipe: DeckRecipe, fallbackAudience: string) {
  return recipe.audience.startsWith("Prompt-selected")
    ? fallbackAudience
    : recipe.audience;
}

function agendaItemsForRecipe(recipe: DeckRecipe) {
  return recipe.slide_sequence
    .filter(
      (slide) =>
        !["title", "agenda", "appendix_source_notes"].includes(slide.slide_role)
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

  if (recipe.recipe_id === "ad_hoc_brand_safe_deck") {
    return `Brand-governed client brief | ${reportPeriod}`;
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
    ad_hoc_brand_safe_deck: {
      executive_summary: "Brief Summary",
      kpi_scorecard: "Relevant Metrics",
      usage_trend: "Signal Trend",
      risks_recommendations: "Implications",
      next_steps: "Next Steps",
      appendix_source_notes: "Source Notes"
    }
  };
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
      "Review CSV/source connector mapping."
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
  const boundedDocuments = sourceDocuments.slice(0, 6).map((document) => ({
    ...document,
    text: document.text.slice(0, 12000)
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
    /\b(recommend|next step|action|owner|mitigate|enable|train|review)\b/i,
    6
  );
  const trendNotes = findPrioritizedEvidenceSentences(
    boundedDocuments,
    /^\s*trend note:/i,
    /\b(adoption|usage|mobile|growth|active|trend|trajectory|volume)\b/i,
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
      `${sourceDocumentLabel(document)}: ${document.type}, ${document.text.length.toLocaleString()} characters reviewed locally.`
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
  if (parsedCsvData.length === 0) {
    throw new Error("At least one CSV row is required to generate a deck.");
  }

  const inputRows = parsedCsvData.map(normalizeRow);
  const latestInputRow = inputRows[inputRows.length - 1];
  const rowsWithMetricSignal = inputRows.filter(hasMetricSignal);
  const rows = rowsWithMetricSignal.length > 0 ? rowsWithMetricSignal : inputRows;
  const first = rows[0];
  const current = rows[rows.length - 1];
  const prior = rows.length > 1 ? rows[rows.length - 2] : rows[0];
  const usingFallbackMetrics = latestInputRow !== current;
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
  const recipeSelection = selectDeckRecipe(
    userPrompt,
    options.recipeId,
    options.customRecipes
  );
  const recipe = recipeSelection.recipe;
  const sourceRefsForRecipe = [
    `Recipe: ${recipe.name}`,
    `Recipe mode: ${recipe.mode}`,
    recipeSelection.reason
  ];
  const sourceEvidence = buildSourceEvidence(options.sourceDocuments);
  const sourceDocRefs = sourceEvidence.refs;
  const sourceCharacters = sourcePackCharacterCount(options.sourceDocuments);
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
    ]).slice(0, 3);
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
    const expansionSlides: DeckSlide[] = [
      {
        layout_id: "risks_recommendations",
        title:
          recipe.recipe_id === "risk_remediation_plan"
            ? "Additional Risk Actions"
            : "Context-Driven Actions",
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
          recommendations: additionalActions.slice(0, 3)
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
      title: "Context Follow-Up",
      fields: {
        deck_label: chromeLabel,
        steps: followUpSteps.slice(0, 3),
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
          "Opening slide rendered from the approved title_client_report layout.",
          source_refs: ["CSV: client_name", "CSV: report_period", ...sourceRefsForRecipe]
        };
      case "agenda":
        return {
        layout_id: "agenda",
        title: recipeSlide.title,
        fields: {
            deck_label: chromeLabel,
            agenda_items: agendaItemsForRecipe(recipe)
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
          ),
          business_impact: compactText(
              executiveBusinessImpact(recipe, current, metricsNeedConfirmation),
            78
          )
        },
        source_refs: [
          "CSV: adoption_score",
          "CSV: active_users",
          "CSV: licensed_users",
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
          "CSV: active_users",
          "CSV: licensed_users",
          "CSV: adoption_score",
          "CSV: projects_active",
            "CSV: mobile_usage_rate",
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
            "CSV: report_period",
            "CSV: adoption_score",
            "CSV: active_users",
            ...sourceRefsForRecipe
          ], sourceDocRefs)
        };
      case "feature_adoption":
        return {
        layout_id: "feature_adoption",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          chart_type: "bar",
          feature_metrics: [
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
          ],
          top_feature: current.top_feature,
          lowest_feature: current.lowest_feature
        },
        source_refs: [
          "CSV: daily_logs_count",
          "CSV: rfi_count",
          "CSV: submittals_count",
          "CSV: top_feature",
            "CSV: lowest_feature",
            ...sourceRefsForRecipe
        ]
        };
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
          "CSV: risk_summary",
          "CSV: recommendation_1",
          "CSV: recommendation_2",
            "CSV: recommendation_3",
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
            ["CSV: recommendations", "Prompt: action emphasis", ...sourceRefsForRecipe],
            sourceDocRefs
          )
        };
      case "appendix_source_notes":
        return {
        layout_id: "next_steps",
        title: clientFacingSlideTitle(recipe, recipeSlide),
        fields: {
            deck_label: chromeLabel,
          steps: [
            compactText(
              `Business data: ${inputRows.length} reporting periods reviewed for ${planClientName}.`,
              140
            ),
              sourceEvidence.summary.document_count > 0
                ? `Supporting context: ${sourceEvidence.summary.document_count} supporting document(s) reviewed.`
                : "Supporting context: CSV data and creator request only.",
              "Presentation assurance: generated from the selected brand kit."
          ],
            note: compactText(
              "Evidence boundary for this deck.",
              160
            )
        },
          source_refs: appendEvidence(
            ["CSV: all columns", "Brand contract: approved_layouts", ...sourceRefsForRecipe],
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

  const baseSlides = recipe.slide_sequence.map(buildSlide);
  const appendixIndex = recipe.slide_sequence.findIndex(
    (slide) => slide.slide_role === "appendix_source_notes"
  );
  const expansionSlides = buildContextExpansionSlides(
    Math.max(0, 16 - baseSlides.length)
  );
  const slides =
    expansionSlides.length > 0 && appendixIndex >= 0
      ? [
          ...baseSlides.slice(0, appendixIndex),
          ...expansionSlides,
          ...baseSlides.slice(appendixIndex)
        ]
      : [...baseSlides, ...expansionSlides];

  const deckPlan: DeckPlan = {
    deck_type: recipe.recipe_id,
    deck_recipe_id: recipe.recipe_id,
    deck_recipe_name: recipe.name,
    generation_mode: recipe.mode,
    recipe_confidence: recipeSelection.confidence,
    audience: recipeAudience(recipe, intent.audience),
    client_name: planClientName,
    report_period: reportPeriod,
    source_pack: sourceEvidence.summary.document_count > 0
      ? sourceEvidence.summary
      : undefined,
    slides
  };

  return DeckPlanSchema.parse(deckPlan);
}

export function createStructuredOutputsPlaceholder() {
  return {
    status: "not_enabled_for_mvp",
    reason:
      "The MVP uses deterministic local planning. A future OpenAI Structured Outputs call can produce the same DeckPlanSchema shape, then the validator and renderer remain unchanged.",
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
