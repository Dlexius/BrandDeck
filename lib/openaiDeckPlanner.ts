import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { auditDeckAccuracy } from "@/lib/auditDeckAccuracy";
import {
  DeckPlanSchema,
  MAX_DECK_SLIDES,
  MAX_SOURCE_DOCUMENT_CHARS,
  type BrandContract,
  type DeckPlan,
  type SourceDocument
} from "@/lib/deck-plan-schema";
import {
  generateDeckPlan,
  type AdoptionCsvRow
} from "@/lib/generateDeckPlan";
import type { DeckRecipe } from "@/lib/deck-recipes";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

const TrendPointSchema = z.object({
  label: z.string().min(1).max(24),
  adoption_score: z.number().min(0).max(100),
  active_users: z.number().min(0)
});

const FeatureMetricSchema = z.object({
  feature: z.string().min(1).max(40),
  count: z.number().min(0)
});

const DeckFieldsSchema = z.object({
  deck_label: z.string().min(1).max(40).nullable(),
  client_name: z.string().min(1).max(80).nullable(),
  report_period: z.string().min(1).max(60).nullable(),
  subtitle: z.string().min(1).max(120).nullable(),
  agenda_items: z.array(z.string().min(1).max(100)).max(8).nullable(),
  summary_points: z.array(z.string().min(1).max(110)).max(6).nullable(),
  business_impact: z.string().min(1).max(120).nullable(),
  chart_type: z
    .enum(["scorecard", "line", "bar", "table", "none"])
    .nullable(),
  active_users: z.number().min(0).nullable(),
  licensed_users: z.number().min(0).nullable(),
  adoption_score: z.number().min(0).max(100).nullable(),
  projects_active: z.number().min(0).nullable(),
  mobile_usage_rate: z.number().min(0).max(100).nullable(),
  lowest_feature: z.string().min(1).max(80).nullable(),
  metric_context: z.string().min(1).max(140).nullable(),
  trend_points: z.array(TrendPointSchema).max(12).nullable(),
  trend_summary: z.string().min(1).max(120).nullable(),
  feature_metrics: z.array(FeatureMetricSchema).max(8).nullable(),
  top_feature: z.string().min(1).max(80).nullable(),
  risk_summary: z.string().min(1).max(220).nullable(),
  recommendations: z.array(z.string().min(1).max(160)).max(6).nullable(),
  steps: z.array(z.string().min(1).max(150)).max(6).nullable(),
  note: z.string().min(1).max(180).nullable()
});

const PlannerDeckSlideSchema = z.object({
  layout_id: z.enum([
    "title_client_report",
    "agenda",
    "executive_summary",
    "adoption_kpi_scorecard",
    "usage_trend",
    "feature_adoption",
    "risks_recommendations",
    "next_steps"
  ]),
  title: z.string().min(1).max(120),
  fields: DeckFieldsSchema,
  speaker_notes: z.string().max(1000).nullable(),
  source_refs: z.array(z.string().min(1).max(160)).max(12).nullable()
});

const PlannerSourcePackSummarySchema = z.object({
  document_count: z.number().int().min(0).max(20),
  evidence_refs: z.array(z.string().min(1).max(160)).max(12),
  constraints: z.array(z.string().min(1).max(160)).max(12)
});

const PlannerDeckPlanSchema = z.object({
  deck_type: z.string().min(1).max(80),
  deck_recipe_id: z.string().min(1).max(80).nullable(),
  deck_recipe_name: z.string().min(1).max(80).nullable(),
  generation_mode: z.enum(["predefined", "ad_hoc_blueprint"]).nullable(),
  recipe_confidence: z.number().min(0).max(100).nullable(),
  audience: z.string().min(1).max(80),
  client_name: z.string().min(1).max(80),
  report_period: z.string().min(1).max(60),
  source_pack: PlannerSourcePackSummarySchema.nullable(),
  slides: z.array(PlannerDeckSlideSchema).min(1).max(MAX_DECK_SLIDES)
});

type GenerateDeckPlanOptions = {
  recipeId?: string;
  customRecipes?: DeckRecipe[];
  sourceDocuments?: SourceDocument[];
};

export type PlannerMode =
  | "deterministic"
  | "openai_structured_outputs"
  | "openai_fallback_deterministic";

export type GeneratedDeckPlanResult = {
  deckPlan: DeckPlan;
  planningMode: PlannerMode;
  plannerModel?: string;
  fallbackReason?: string;
};

const OPENAI_PLANNER_DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

function compactForModel(value: unknown, maxLength = 4000) {
  const serialized = JSON.stringify(value, null, 2);

  if (serialized.length <= maxLength) {
    return value;
  }

  return `${serialized.slice(0, maxLength - 3)}...`;
}

function compactSourceDocuments(sourceDocuments: SourceDocument[] = []) {
  return sourceDocuments.slice(0, 6).map((document) => ({
    id: document.id,
    name: document.name,
    type: document.type,
    text: document.text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, Math.min(MAX_SOURCE_DOCUMENT_CHARS, 18000))
  }));
}

function stripNullValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNullValues);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== null)
        .map(([key, entryValue]) => [key, stripNullValues(entryValue)])
    );
  }

  return value;
}

function approvedLayoutSummary(brandContract: BrandContract) {
  return brandContract.approved_layouts.map((layout) => ({
    layout_id: layout.layout_id,
    required_placeholders: layout.required_placeholders,
    max_text_lengths: layout.max_text_lengths,
    approved_chart_types: layout.approved_chart_types
  }));
}

function modelCandidates() {
  return Array.from(
    new Set(
      [
        process.env.OPENAI_MODEL,
        "gpt-5.5",
        "gpt-4o-mini"
      ].filter((model): model is string => Boolean(model))
    )
  );
}

function openAIPlannerTimeoutMs() {
  const parsed = Number(process.env.OPENAI_TIMEOUT_MS);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120000;
}

function shouldUseOpenAIPlanner() {
  const flag = process.env.BRANDDECK_USE_OPENAI;

  if (flag && OPENAI_PLANNER_DISABLED_VALUES.has(flag.toLowerCase())) {
    return false;
  }

  return Boolean(process.env.OPENAI_API_KEY);
}

function assertCandidateIsUsable(
  candidate: DeckPlan,
  brandContract: BrandContract,
  csvRows: AdoptionCsvRow[],
  sourceDocuments: SourceDocument[]
) {
  const validation = validateDeckPlan(candidate, brandContract);

  if (!validation.passed) {
    const failures = validation.checks
      .filter((check) => !check.passed)
      .map((check) => check.detail)
      .slice(0, 4)
      .join("; ");

    throw new Error(`AI plan failed brand validation: ${failures}`);
  }

  const accuracy = auditDeckAccuracy({
    deckPlan: candidate,
    parsedCsvData: csvRows,
    sourceDocuments
  });

  if (!accuracy.passed) {
    const failures = accuracy.checks
      .filter((check) => !check.passed)
      .map((check) => check.detail)
      .slice(0, 4)
      .join("; ");

    throw new Error(`AI plan failed grounding audit: ${failures}`);
  }
}

async function generateOpenAIDeckPlan({
  userPrompt,
  parsedCsvData,
  brandContract,
  options,
  baselineDeckPlan
}: {
  userPrompt: string;
  parsedCsvData: AdoptionCsvRow[];
  brandContract: BrandContract;
  options: GenerateDeckPlanOptions;
  baselineDeckPlan: DeckPlan;
}) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: openAIPlannerTimeoutMs()
  });
  const sourceDocuments = options.sourceDocuments ?? [];
  const payload = {
    user_prompt: userPrompt,
    business_data_rows: compactForModel(parsedCsvData, 12000),
    source_documents: compactSourceDocuments(sourceDocuments),
    brand_contract: {
      companyName: brandContract.companyName,
      approved_layouts: approvedLayoutSummary(brandContract),
      forbidden_rules: brandContract.forbidden_rules
    },
    deterministic_baseline_deck_plan: baselineDeckPlan,
    planning_rules: [
      "Return a complete deck plan using only approved layout IDs.",
      "Preserve the baseline slide order unless the baseline already includes context-expansion slides.",
      "Product update decks may repeat approved layout IDs for release-detail slides and may exceed 10 slides when the source context or meeting length supports it.",
      "Do not introduce colors, fonts, logos, image choices, geometry, object IDs, renderer language, model language, or API language.",
      "Use exact numeric values from the business data. Do not invent metrics.",
      "Use source documents only for claims, risks, recommendations, and next steps.",
      "Keep copy concise enough for inherited PowerPoint text boxes."
    ]
  };
  const instructions = [
    "You are BrandDeck Studio's structured deck planner.",
    "Improve the baseline deck plan's business wording and evidence use while preserving brand governance.",
    "The deterministic renderer, validator, and template object map control all visual design decisions.",
    "Client-visible copy must not mention AI, OpenAI, APIs, models, renderers, MVPs, placeholders, or internal governance details."
  ].join(" ");
  let lastError: Error | null = null;

  for (const model of modelCandidates()) {
    try {
      const response = await client.responses.parse({
        model,
        instructions,
        input: [
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ],
        text: {
          format: zodTextFormat(PlannerDeckPlanSchema, "branddeck_deck_plan")
        },
        max_output_tokens: 12000
      });
      const parsed = response.output_parsed;

      if (!parsed) {
        throw new Error("OpenAI response did not include a parsed deck plan.");
      }

      const candidate = DeckPlanSchema.parse(stripNullValues(parsed));
      assertCandidateIsUsable(
        candidate,
        brandContract,
        parsedCsvData,
        sourceDocuments
      );

      return {
        deckPlan: candidate,
        model
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("OpenAI planner failed.");
}

export async function generateDeckPlanWithOptionalOpenAI(
  userPrompt: string,
  parsedCsvData: AdoptionCsvRow[],
  brandContract: BrandContract,
  options: GenerateDeckPlanOptions = {}
): Promise<GeneratedDeckPlanResult> {
  const deterministicDeckPlan = generateDeckPlan(
    userPrompt,
    parsedCsvData,
    brandContract,
    options
  );

  if (!shouldUseOpenAIPlanner()) {
    return {
      deckPlan: deterministicDeckPlan,
      planningMode: "deterministic"
    };
  }

  try {
    const openAIResult = await generateOpenAIDeckPlan({
      userPrompt,
      parsedCsvData,
      brandContract,
      options,
      baselineDeckPlan: deterministicDeckPlan
    });

    return {
      deckPlan: openAIResult.deckPlan,
      planningMode: "openai_structured_outputs",
      plannerModel: openAIResult.model
    };
  } catch (error) {
    return {
      deckPlan: deterministicDeckPlan,
      planningMode: "openai_fallback_deterministic",
      fallbackReason:
        error instanceof Error ? error.message : "OpenAI planner failed."
    };
  }
}
