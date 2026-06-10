import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import {
  SourceDocumentSchema,
  type SourceDocument
} from "@/lib/deck-plan-schema";
import {
  DeckRecipeSchema,
  selectDeckRecipe,
  type DeckRecipe
} from "@/lib/deck-recipes";
import { auditDeckAccuracy } from "@/lib/auditDeckAccuracy";
import { auditDeckFit } from "@/lib/auditDeckFit";
import {
  buildContextPackFromInputs,
  contextPackHasAdoptionMetrics,
  ContextPackSchema
} from "@/lib/context-pack-schema";
import { type AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { generateDeckPlanWithOpenAISubagents } from "@/lib/openaiDeckPlanner";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

export const runtime = "nodejs";

const GeneratePlanRequestSchema = z.object({
  prompt: z.string().max(1000).default(""),
  csvRows: z.array(z.record(z.unknown())).default([]),
  contextPack: ContextPackSchema.optional(),
  recipeId: z.string().min(1).max(80).optional(),
  excludedSlideRoles: z.array(z.string().min(1).max(64)).max(24).default([]),
  sourceDocuments: z.array(SourceDocumentSchema).max(20).default([]),
  customRecipes: z.array(DeckRecipeSchema).max(12).default([])
});

const METRIC_REQUIRED_RECIPE_IDS = new Set([
  "client_adoption_report",
  "executive_adoption_update",
  "risk_remediation_plan",
  "quarterly_business_review"
]);

export async function POST(request: Request) {
  try {
    const body = GeneratePlanRequestSchema.parse(await request.json());
    const brandContract = getActiveBrandContract();
    const csvRows = body.csvRows as AdoptionCsvRow[];
    const sourceDocuments = body.sourceDocuments as SourceDocument[];
    const customRecipes = body.customRecipes as DeckRecipe[];
    const contextPack = buildContextPackFromInputs({
      contextPack: body.contextPack,
      csvRows,
      sourceDocuments
    });
    const recipeSelection = selectDeckRecipe(
      body.prompt,
      body.recipeId,
      customRecipes
    );

    if (
      METRIC_REQUIRED_RECIPE_IDS.has(recipeSelection.recipe.recipe_id) &&
      !contextPackHasAdoptionMetrics(contextPack)
    ) {
      return NextResponse.json(
        {
          error: `${recipeSelection.recipe.name} needs a client metrics snapshot with client name, reporting period, active users, licensed users, and adoption score. Add metrics or choose Product Update / Ad Hoc.`
        },
        { status: 422 }
      );
    }

    const planningResult = await generateDeckPlanWithOpenAISubagents(
      body.prompt,
      csvRows,
      brandContract,
      {
        recipeId: body.recipeId,
        excludedSlideRoles: body.recipeId ? body.excludedSlideRoles : [],
        customRecipes,
        sourceDocuments: contextPack.sourceDocuments,
        contextPack
      }
    );
    const deckPlan = planningResult.deckPlan;
    const validationReport = validateDeckPlan(deckPlan, brandContract);
    const accuracyAudit = auditDeckAccuracy({
      deckPlan,
      parsedCsvData: csvRows,
      sourceDocuments: contextPack.sourceDocuments,
      contextPack
    });
    const fitAudit = auditDeckFit({
      deckPlan,
      brandContract
    });

    return NextResponse.json({
      schema: "branddeck.generate-plan/v1",
      deckPlan,
      validationReport,
      accuracyAudit,
      fitAudit,
      planningMode: planningResult.planningMode,
      plannerModel: planningResult.plannerModel,
      agentTrace: planningResult.agentTrace,
      followUpQuestions: planningResult.followUpQuestions ?? []
    });
  } catch (error) {
    const details =
      error instanceof Error &&
      typeof (error as Error & { details?: unknown }).details === "string"
        ? ((error as Error & { details?: string }).details as string)
        : undefined;

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate a deck.",
        errorDetails: details
      },
      { status: 400 }
    );
  }
}
