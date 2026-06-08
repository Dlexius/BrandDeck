import { NextResponse } from "next/server";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { renderPptx } from "@/lib/renderPptx";
import {
  buildTemplateFrameMapArtifact,
  getTemplateKit
} from "@/lib/template-kit-store";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deckPlan = DeckPlanSchema.parse(body.deckPlan ?? body);
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : undefined;
    const templateKit = templateKitId ? getTemplateKit(templateKitId) : undefined;
    const fidelityMode =
      typeof body.fidelityMode === "string"
        ? body.fidelityMode
        : "default_coordinate_export";
    const frameMapArtifact = templateKit
      ? buildTemplateFrameMapArtifact(templateKit, deckPlan)
      : undefined;
    const frameMapCoverage = frameMapArtifact?.validation.coverage ?? "0/0";
    const brandContract = getActiveBrandContract();
    const validationReport = validateDeckPlan(deckPlan, brandContract);

    if (!validationReport.passed) {
      return NextResponse.json(
        {
          error: "Deck plan failed brand validation.",
          validationReport
        },
        { status: 422 }
      );
    }

    const pptxBuffer = await renderPptx(deckPlan, brandContract);
    const fileName = safeFileName(
      `${deckPlan.client_name}_${deckPlan.report_period}_${
        deckPlan.deck_recipe_id ?? deckPlan.deck_type
      }_coordinate_export`
    );

    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}.pptx"`,
        "Content-Length": String(pptxBuffer.length),
        "X-BrandDeck-Renderer": "deterministic-template-coordinate",
        "X-BrandDeck-Template-Kit": templateKit?.id ?? "procore-default",
        "X-BrandDeck-Template-Fingerprint":
          templateKit?.fingerprint ?? "procore-default-contract",
        "X-BrandDeck-Fidelity-Mode": fidelityMode,
        "X-BrandDeck-Frame-Map-Coverage": frameMapCoverage,
        "X-BrandDeck-Frame-Map-Min-Confidence": String(
          frameMapArtifact?.validation.minimumConfidence ?? 0
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to export the deck."
      },
      { status: 400 }
    );
  }
}
