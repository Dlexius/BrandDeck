import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import {
  SourceDocumentSchema,
  type SourceDocument
} from "@/lib/deck-plan-schema";
import { DeckRecipeSchema, type DeckRecipe } from "@/lib/deck-recipes";
import { auditDeckAccuracy } from "@/lib/auditDeckAccuracy";
import { type AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { generateDeckPlanWithOptionalOpenAI } from "@/lib/openaiDeckPlanner";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

export const runtime = "nodejs";

const GeneratePlanRequestSchema = z.object({
  prompt: z.string().max(1000).default(""),
  csvRows: z.array(z.record(z.unknown())).min(1),
  recipeId: z.string().min(1).max(80).optional(),
  sourceDocuments: z.array(SourceDocumentSchema).max(20).default([]),
  customRecipes: z.array(DeckRecipeSchema).max(12).default([])
});

export async function POST(request: Request) {
  try {
    const body = GeneratePlanRequestSchema.parse(await request.json());
    const brandContract = getActiveBrandContract();
    const csvRows = body.csvRows as AdoptionCsvRow[];
    const sourceDocuments = body.sourceDocuments as SourceDocument[];
    const customRecipes = body.customRecipes as DeckRecipe[];
    const planningResult = await generateDeckPlanWithOptionalOpenAI(
      body.prompt,
      csvRows,
      brandContract,
      {
        recipeId: body.recipeId,
        customRecipes,
        sourceDocuments
      }
    );
    const deckPlan = planningResult.deckPlan;
    const validationReport = validateDeckPlan(deckPlan, brandContract);
    const accuracyAudit = auditDeckAccuracy({
      deckPlan,
      parsedCsvData: csvRows,
      sourceDocuments
    });

    return NextResponse.json({
      schema: "branddeck.generate-plan/v1",
      deckPlan,
      validationReport,
      accuracyAudit,
      planningMode: planningResult.planningMode,
      plannerModel: planningResult.plannerModel,
      plannerFallbackReason: planningResult.fallbackReason
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate a deck."
      },
      { status: 400 }
    );
  }
}
