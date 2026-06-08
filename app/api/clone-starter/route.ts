import { NextResponse } from "next/server";
import { renderCloneStarterPptx } from "@/lib/cloneStarterPptx";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import {
  buildTemplateFrameMapArtifact,
  getTemplateKit
} from "@/lib/template-kit-store";

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
    const pptxBuffer = await renderCloneStarterPptx(templateKit, frameMapArtifact);
    const fileName = safeFileName(
      `${templateKit.templateName.replace(/\.pptx$/i, "")}_clone_starter`
    );

    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}.pptx"`,
        "Content-Length": String(pptxBuffer.length),
        "X-BrandDeck-Renderer": "clone-starter-duplicate-slides",
        "X-BrandDeck-Template-Kit": templateKit.id,
        "X-BrandDeck-Template-Fingerprint": templateKit.fingerprint,
        "X-BrandDeck-Frame-Map-Coverage": frameMapArtifact.validation.coverage,
        "X-BrandDeck-Frame-Map-Min-Confidence": String(
          frameMapArtifact.validation.minimumConfidence
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export the clone starter deck."
      },
      { status: 400 }
    );
  }
}
