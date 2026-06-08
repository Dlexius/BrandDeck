import { NextResponse } from "next/server";
import {
  APPROVED_LAYOUT_IDS,
  DeckPlanSchema,
  type ApprovedLayoutId
} from "@/lib/deck-plan-schema";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
import {
  approveTemplateFrameMap,
  buildTemplateFrameMapArtifact,
  getTemplateKit,
  summarizeTemplateKit,
  updateTemplateFrameMapOverrides
} from "@/lib/template-kit-store";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

function parseApprovedLayoutId(value: string): ApprovedLayoutId {
  if ((APPROVED_LAYOUT_IDS as readonly string[]).includes(value)) {
    return value as ApprovedLayoutId;
  }

  throw new Error(`${value} is not an approved layout ID.`);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : "";

    if (body.action === "approve") {
      const templateKit = getTemplateKit(templateKitId);

      if (!templateKit) {
        return NextResponse.json(
          { error: "Template kit not found. Upload a PPTX template first." },
          { status: 404 }
        );
      }

      const preApprovalArtifact = buildTemplateFrameMapArtifact(templateKit);
      const preApprovalGovernance = buildTemplateEditGovernance(
        templateKit,
        preApprovalArtifact
      );

      if (preApprovalGovernance.summary.governanceScore !== 100) {
        return NextResponse.json(
          {
            error:
              "Frame map cannot be approved until every mapped source slide has required editable objects.",
            governance: preApprovalGovernance
          },
          {
            status: 422,
            headers: {
              "X-BrandDeck-Governance-Score": String(
                preApprovalGovernance.summary.governanceScore
              )
            }
          }
        );
      }

      const kit = approveTemplateFrameMap(templateKitId);
      const artifact = buildTemplateFrameMapArtifact(kit);

      return NextResponse.json(
        {
          templateKit: summarizeTemplateKit(kit),
          frameMapArtifact: artifact
        },
        {
          headers: {
            "X-BrandDeck-Frame-Map-Approval": kit.frameMap.approval.status,
            "X-BrandDeck-Frame-Map-Coverage": artifact.validation.coverage
          }
        }
      );
    }

    const mappings = Array.isArray(body.mappings)
      ? (body.mappings as Array<{ layoutId: string; sourceSlide: unknown }>)
      : [];

    const kit = updateTemplateFrameMapOverrides(
      templateKitId,
      mappings.map((mapping) => ({
        layoutId: parseApprovedLayoutId(mapping.layoutId),
        sourceSlide: Number(mapping.sourceSlide)
      }))
    );
    const artifact = buildTemplateFrameMapArtifact(kit);

    return NextResponse.json(
      {
        templateKit: summarizeTemplateKit(kit),
        frameMapArtifact: artifact
      },
      {
        headers: {
          "X-BrandDeck-Frame-Map-Coverage": artifact.validation.coverage,
          "X-BrandDeck-Frame-Map-Min-Confidence": String(
            artifact.validation.minimumConfidence
          )
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the template frame map."
      },
      { status: 400 }
    );
  }
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
    const artifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const fileName = safeFileName(
      `${templateKit.templateName.replace(/\.pptx$/i, "")}_template_frame_map`
    );

    return new Response(JSON.stringify(artifact, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}.json"`,
        "X-BrandDeck-Frame-Map-Coverage": artifact.validation.coverage,
        "X-BrandDeck-Frame-Map-Min-Confidence": String(
          artifact.validation.minimumConfidence
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export the template frame map."
      },
      { status: 400 }
    );
  }
}
