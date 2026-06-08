import { NextResponse } from "next/server";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
import {
  buildTemplateFrameMapArtifact,
  getTemplateKit
} from "@/lib/template-kit-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : "";
    const templateKit = getTemplateKit(templateKitId);

    if (!templateKit) {
      return NextResponse.json(
        { error: "Template kit not found. Upload a PPTX template first." },
        { status: 404 }
      );
    }

    const deckPlan = body.deckPlan ? DeckPlanSchema.parse(body.deckPlan) : undefined;
    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const governance = buildTemplateEditGovernance(
      templateKit,
      frameMapArtifact
    );

    return NextResponse.json(governance, {
      headers: {
        "X-BrandDeck-Governance-Score": String(
          governance.summary.governanceScore
        ),
        "X-BrandDeck-Editable-Objects": String(
          governance.summary.editableObjectCount
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to build template governance report."
      },
      { status: 400 }
    );
  }
}
