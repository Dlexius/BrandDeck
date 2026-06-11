import { ApprovedLayoutId, BrandContract, DeckPlan, MAX_SOURCE_DOCUMENT_CHARS, SourceDocument } from "@/lib/deck-plan-schema";
import { DeckRecipe } from "@/lib/deck-recipes";
import { AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { MAX_ADMIN_RECIPE_LAYOUTS, defaultBrandContract } from "@/lib/ui-constants";
import type { BusinessSnapshotState, RecipeBuilderState, SourceDocumentSummary } from "@/lib/ui-types";

export function brandColorTokenLabel(token: string) {
  return token.replaceAll("_", " ");
}

export function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function cleanSnapshotValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Standard adoption row fields. Creator-named workflow metrics must not
 * overwrite these, so colliding labels are skipped when rows are built.
 */
const RESERVED_ROW_KEYS = new Set([
  "client_name",
  "report_period",
  "active_users",
  "licensed_users",
  "adoption_score",
  "projects_active",
  "mobile_usage_rate",
  "daily_logs_count",
  "rfi_count",
  "submittals_count",
  "top_feature",
  "lowest_feature",
  "risk_summary",
  "recommendation_1",
  "recommendation_2",
  "recommendation_3"
]);

/** Stable id for a saved client profile, derived from the client name. */
export function clientProfileIdFromName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "client"
  );
}

export function workflowMetricKey(label: string) {
  return cleanSnapshotValue(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Creator-named workflow metrics as flexible row columns - the same shape a
 * BI export produces, so manual entry and imports flow through one path.
 */
export function workflowMetricRowValues(
  metrics: BusinessSnapshotState["workflow_metrics"]
) {
  const values: Record<string, string> = {};

  for (const metric of metrics ?? []) {
    const key = workflowMetricKey(metric.label);
    const count = cleanSnapshotValue(metric.count);

    if (!key || !count || RESERVED_ROW_KEYS.has(key) || values[key]) {
      continue;
    }

    values[key] = count;
  }

  return values;
}

export function hasBusinessSnapshotMinimum(snapshot: BusinessSnapshotState) {
  return Boolean(
    cleanSnapshotValue(snapshot.client_name) &&
      cleanSnapshotValue(snapshot.report_period) &&
      cleanSnapshotValue(snapshot.active_users) &&
      cleanSnapshotValue(snapshot.adoption_score)
  );
}

export function businessSnapshotToRows(
  snapshot: BusinessSnapshotState
): AdoptionCsvRow[] {
  if (!hasBusinessSnapshotMinimum(snapshot)) {
    return [];
  }

  const clientName = cleanSnapshotValue(snapshot.client_name);
  const reportPeriod = cleanSnapshotValue(snapshot.report_period);
  const activeUsers = cleanSnapshotValue(snapshot.active_users);
  const licensedUsers = cleanSnapshotValue(snapshot.licensed_users);
  const adoptionScore = cleanSnapshotValue(snapshot.adoption_score);
  const projectsActive = cleanSnapshotValue(snapshot.projects_active);
  const mobileUsageRate = cleanSnapshotValue(snapshot.mobile_usage_rate);
  const workflowValues = workflowMetricRowValues(snapshot.workflow_metrics);
  const topFeature = cleanSnapshotValue(snapshot.top_feature);
  const lowestFeature = cleanSnapshotValue(snapshot.lowest_feature);
  const riskSummary = cleanSnapshotValue(snapshot.risk_summary);
  const recommendation1 = cleanSnapshotValue(snapshot.recommendation_1);
  const recommendation2 = cleanSnapshotValue(snapshot.recommendation_2);
  const recommendation3 = cleanSnapshotValue(snapshot.recommendation_3);

  const currentRow: AdoptionCsvRow = {
    ...workflowValues,
    client_name: clientName,
    report_period: reportPeriod,
    active_users: activeUsers,
    licensed_users: licensedUsers,
    adoption_score: adoptionScore,
    projects_active: projectsActive,
    mobile_usage_rate: mobileUsageRate,
    top_feature: topFeature,
    lowest_feature: lowestFeature,
    risk_summary: riskSummary,
    recommendation_1: recommendation1,
    recommendation_2: recommendation2,
    recommendation_3: recommendation3
  };

  const priorPeriod = cleanSnapshotValue(snapshot.previous_report_period);
  const priorAdoption = cleanSnapshotValue(snapshot.previous_adoption_score);
  const priorUsers = cleanSnapshotValue(snapshot.previous_active_users);
  const priorMobile = cleanSnapshotValue(snapshot.previous_mobile_usage_rate);

  if (!priorPeriod && !priorAdoption && !priorUsers && !priorMobile) {
    return [currentRow];
  }

  return [
    {
      ...currentRow,
      report_period: priorPeriod || `Prior ${reportPeriod}`,
      active_users: priorUsers || activeUsers,
      adoption_score: priorAdoption || adoptionScore,
      mobile_usage_rate: priorMobile || mobileUsageRate
    },
    currentRow
  ];
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function createSourceDocument(
  name: string,
  text: string,
  type: SourceDocument["type"] = "document"
): SourceDocumentSummary {
  const normalizedText = text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_DOCUMENT_CHARS);

  return {
    id: `${name}-${normalizedText.length}-${Date.now()}`.replace(
      /[^a-z0-9_-]+/gi,
      "_"
    ),
    name,
    type,
    text: normalizedText,
    characters: normalizedText.length
  };
}

export function mergeSourceDocuments(
  current: SourceDocumentSummary[],
  incoming: SourceDocumentSummary[]
) {
  const merged = new Map<string, SourceDocumentSummary>();

  for (const document of [...current, ...incoming]) {
    const key = document.id || `${document.name}:${document.type}`;

    if (!merged.has(key)) {
      merged.set(key, document);
    }
  }

  return Array.from(merged.values()).slice(0, 20);
}

export function slugifyRecipeId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return slug || "custom_recipe";
}

export function safeDownloadFileName(deckPlan: DeckPlan) {
  return `${deckPlan.client_name}_${deckPlan.report_period}_${
    deckPlan.deck_recipe_id ?? deckPlan.deck_type
  }.pptx`
    .replace(/[^a-z0-9_.-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function layoutDefinition(
  layoutId: ApprovedLayoutId,
  brandContract: BrandContract = defaultBrandContract
) {
  return brandContract.approved_layouts.find(
    (layout) => layout.layout_id === layoutId
  );
}

export function slideRoleForLayout(layoutId: ApprovedLayoutId, index: number) {
  if (layoutId === "title_client_report") {
    return "title";
  }

  if (layoutId === "adoption_kpi_scorecard") {
    return "kpi_scorecard";
  }

  return layoutId === "next_steps" && index > 0 ? "next_steps" : layoutId;
}

export function recipeFromBuilder(
  builder: RecipeBuilderState,
  existingRecipes: DeckRecipe[],
  brandContract: BrandContract = defaultBrandContract
): DeckRecipe {
  const recipeIdBase = `admin_custom_${slugifyRecipeId(builder.name)}`;
  const existing = new Set(existingRecipes.map((recipe) => recipe.recipe_id));
  const recipeId = existing.has(recipeIdBase)
    ? `${recipeIdBase}_${Date.now().toString(36).slice(-5)}`
    : recipeIdBase;
  const layoutIds = builder.layoutIds.slice(0, MAX_ADMIN_RECIPE_LAYOUTS);
  const keywords = builder.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (layoutIds.length < 3) {
    throw new Error("A governed recipe needs at least three approved layouts.");
  }

  return {
    recipe_id: recipeId,
    name: builder.name.trim(),
    mode: "predefined",
    description: builder.description.trim(),
    audience: builder.audience.trim(),
    intent_keywords: keywords.length > 0 ? keywords : ["custom"],
    slide_sequence: layoutIds.map((layoutId, index) => {
      const layout = layoutDefinition(layoutId);

      return {
        slide_role: slideRoleForLayout(layoutId, index),
        layout_id: layoutId,
        title: layout?.name ?? layoutId.replaceAll("_", " "),
        content_focus:
          layout?.purpose ??
          "Admin-governed custom recipe slide using an approved layout."
      };
    })
  };
}
