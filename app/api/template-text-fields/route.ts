import { NextResponse } from "next/server";
import { extractTemplateTextObjects } from "@/lib/template-text-fields";
import { getTemplateKit } from "@/lib/template-kit-store";

export const runtime = "nodejs";

/**
 * Lists the text boxes and tables on each template slide the active Slide
 * Mapping points at, so the guided mapping walkthrough can offer real
 * template objects instead of asking admins for hand-authored JSON.
 */
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

    const mappings = templateKit.frameMap.outputSlides;
    const objectsBySlide = await extractTemplateTextObjects(
      templateKit.buffer,
      mappings.map((mapping) => mapping.sourceSlide)
    );

    return NextResponse.json({
      schema: "branddeck.template-text-fields/v1",
      templateKitId: templateKit.id,
      templateFingerprint: templateKit.fingerprint,
      generatedAt: new Date().toISOString(),
      slides: mappings.map((mapping) => ({
        outputSlide: mapping.outputSlide,
        layoutId: mapping.layoutId,
        sourceSlide: mapping.sourceSlide,
        narrativeRole: mapping.narrativeRole,
        objects: objectsBySlide[mapping.sourceSlide] ?? []
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read template text fields."
      },
      { status: 400 }
    );
  }
}
