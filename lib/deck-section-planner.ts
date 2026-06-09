import { MAX_DECK_SLIDES } from "@/lib/deck-plan-schema";
import type { DeckRecipe } from "@/lib/deck-recipes";
import type { ContextPack } from "@/lib/context-pack-schema";

export type DeckDepth = "quick" | "standard" | "deep" | "extended";

export type AdaptiveDeckSection =
  | "workflow_deep_dive"
  | "risk_deep_dive"
  | "recommendation_detail"
  | "product_tool_relevance"
  | "adoption_continuity"
  | "source_evidence_appendix"
  | "metric_appendix"
  | "next_90_day_plan";

export type AdaptiveDeckSectionPlan = {
  depth: DeckDepth;
  targetSlideCount: number;
  sections: AdaptiveDeckSection[];
  reasoningTags: string[];
};

function sourceCount(contextPack?: ContextPack) {
  return contextPack?.sourceDocuments.length ?? 0;
}

function sourceCharacterCount(contextPack?: ContextPack) {
  return (contextPack?.sourceDocuments ?? []).reduce(
    (sum, document) => sum + document.text.length,
    0
  );
}

function metricHistoryCount(contextPack?: ContextPack) {
  return contextPack?.metricSnapshots.length ?? 0;
}

function ownedToolCount(contextPack?: ContextPack) {
  return contextPack?.clientProfile?.ownedTools.length ?? 0;
}

function inferMeetingMinutes(prompt: string) {
  const match = prompt.match(/\b(\d{1,3})\s*(?:minute|min)\b/i);
  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferDepth({
  prompt,
  contextPack,
  productUpdateCount
}: {
  prompt: string;
  contextPack?: ContextPack;
  productUpdateCount: number;
}): { depth: DeckDepth; reasoningTags: string[] } {
  const normalized = prompt.toLowerCase();
  const minutes = inferMeetingMinutes(normalized);
  const reasoningTags: string[] = [];

  if (/\b(quick|brief|short|concise|snapshot|one[-\s]?pager)\b/.test(normalized)) {
    reasoningTags.push("Prompt requested a concise presentation.");
    return { depth: "quick", reasoningTags };
  }

  if (
    minutes >= 60 ||
    /\b(extended|comprehensive|deep dive|deep-dive|workshop|board-ready|board ready|full review)\b/.test(
      normalized
    )
  ) {
    reasoningTags.push("Prompt or meeting length requested extended depth.");
    return { depth: "extended", reasoningTags };
  }

  if (
    minutes >= 30 ||
    /\b(detailed|qbr|quarterly business review|risk plan|release review)\b/.test(
      normalized
    ) ||
    sourceCount(contextPack) >= 3 ||
    sourceCharacterCount(contextPack) >= 12000 ||
    productUpdateCount >= 8 ||
    metricHistoryCount(contextPack) >= 4
  ) {
    reasoningTags.push("Context supports a deeper presentation.");
    return { depth: "deep", reasoningTags };
  }

  reasoningTags.push("Standard presentation depth selected.");
  return { depth: "standard", reasoningTags };
}

function slideBand(depth: DeckDepth) {
  switch (depth) {
    case "quick":
      return { min: 6, max: 8 };
    case "deep":
      return { min: 13, max: 20 };
    case "extended":
      return { min: 21, max: MAX_DECK_SLIDES };
    default:
      return { min: 9, max: 12 };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function plannedSections({
  recipe,
  depth,
  contextPack,
  productUpdateCount
}: {
  recipe: DeckRecipe;
  depth: DeckDepth;
  contextPack?: ContextPack;
  productUpdateCount: number;
}): AdaptiveDeckSection[] {
  const sections: AdaptiveDeckSection[] = [];
  const hasSources = sourceCount(contextPack) > 0;
  const hasMetrics = metricHistoryCount(contextPack) > 1;
  const hasTools = ownedToolCount(contextPack) > 0;

  if (recipe.recipe_id === "product_update_deck" || hasTools) {
    sections.push("product_tool_relevance");
  }

  if (["deep", "extended"].includes(depth)) {
    sections.push("workflow_deep_dive", "risk_deep_dive", "recommendation_detail");
  }

  if (hasMetrics) {
    sections.push("adoption_continuity", "metric_appendix");
  }

  if (hasSources || productUpdateCount > 4) {
    sections.push("source_evidence_appendix");
  }

  if (depth !== "quick") {
    sections.push("next_90_day_plan");
  }

  return Array.from(new Set(sections));
}

export function planDeckSections({
  recipe,
  prompt,
  contextPack,
  productUpdateCount = 0
}: {
  recipe: DeckRecipe;
  prompt: string;
  contextPack?: ContextPack;
  productUpdateCount?: number;
}): AdaptiveDeckSectionPlan {
  const { depth, reasoningTags } = inferDepth({
    prompt,
    contextPack,
    productUpdateCount
  });
  const band = slideBand(depth);
  const baseCount = recipe.slide_sequence.length;
  const sections = plannedSections({
    recipe,
    depth,
    contextPack,
    productUpdateCount
  });
  const sourceBonus = Math.min(4, sourceCount(contextPack));
  const metricBonus = Math.min(3, Math.max(0, metricHistoryCount(contextPack) - 2));
  const toolBonus = Math.min(3, Math.ceil(ownedToolCount(contextPack) / 3));
  const productBonus =
    recipe.recipe_id === "product_update_deck"
      ? Math.min(22, productUpdateCount + Math.ceil(productUpdateCount / 3))
      : Math.min(3, Math.ceil(productUpdateCount / 4));
  const sectionBonus =
    depth === "quick"
      ? 0
      : depth === "standard"
        ? Math.min(2, sections.length)
        : Math.min(8, sections.length);
  const rawTarget =
    recipe.recipe_id === "product_update_deck"
      ? baseCount + productBonus + sourceBonus
      : baseCount + sourceBonus + metricBonus + toolBonus + sectionBonus;
  const targetSlideCount = clamp(
    rawTarget,
    Math.min(band.min, MAX_DECK_SLIDES),
    band.max
  );

  return {
    depth,
    targetSlideCount,
    sections,
    reasoningTags: [
      ...reasoningTags,
      `${recipe.name} base recipe: ${baseCount} slides.`,
      `${productUpdateCount} product update item(s), ${sourceCount(
        contextPack
      )} source document(s), ${metricHistoryCount(
        contextPack
      )} metric snapshot(s).`
    ]
  };
}
