import { NextResponse } from "next/server";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import { renderCloneEditedPptx } from "@/lib/cloneStarterPptx";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { auditPptxPackage } from "@/lib/pptx-package-audit";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
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
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : "";
    const templateKit = getTemplateKit(templateKitId);

    if (!templateKit) {
      return NextResponse.json(
        { error: "Template kit not found. Upload a PPTX template first." },
        { status: 404 }
      );
    }

    if (templateKit.frameMap.approval.status !== "approved") {
      return NextResponse.json(
          {
            error:
              "Frame map is not admin-approved. Review and approve source-slide mappings before template export."
          },
        { status: 422 }
      );
    }

    const deckPlan = DeckPlanSchema.parse(body.deckPlan);
    const brandContract = getActiveBrandContract();
    const validationReport = validateDeckPlan(deckPlan, brandContract);

    if (!validationReport.passed) {
      return NextResponse.json(
          {
          error: "Generated deck failed brand validation.",
          validationReport
        },
        { status: 422 }
      );
    }

    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const editGovernance = buildTemplateEditGovernance(
      templateKit,
      frameMapArtifact
    );
    const pptxBuffer = await renderCloneEditedPptx(
      templateKit,
      frameMapArtifact,
      deckPlan
    );
    const packageAudit = await auditPptxPackage(
      pptxBuffer,
      frameMapArtifact.outputSlides.length
    );

    if (!packageAudit.passed) {
      return NextResponse.json(
        {
          error: "Generated PPTX failed package audit.",
          packageAudit
        },
        { status: 422 }
      );
    }

    const fileName = safeFileName(
      `${deckPlan.client_name}_${deckPlan.report_period}_${
        deckPlan.deck_recipe_id ?? deckPlan.deck_type
      }`
    );

    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}.pptx"`,
        "Content-Length": String(pptxBuffer.length),
        "X-BrandDeck-Renderer": "template-clone-edit",
        "X-BrandDeck-Template-Kit": templateKit.id,
        "X-BrandDeck-Template-Fingerprint": templateKit.fingerprint,
        "X-BrandDeck-Frame-Map-Coverage": frameMapArtifact.validation.coverage,
        "X-BrandDeck-Frame-Map-Approval": templateKit.frameMap.approval.status,
        "X-BrandDeck-Frame-Map-Fingerprint":
          templateKit.frameMap.approval.mappingFingerprint,
        "X-BrandDeck-Object-Governance-Score": String(
          editGovernance.summary.governanceScore
        ),
        "X-BrandDeck-Editable-Objects": String(
          editGovernance.summary.editableObjectCount
        ),
        "X-BrandDeck-Object-Binding-Source":
          editGovernance.summary.bindingSource,
        "X-BrandDeck-Object-Binding-Fingerprint":
          editGovernance.summary.bindingFingerprint,
        "X-BrandDeck-Frame-Map-Min-Confidence": String(
          frameMapArtifact.validation.minimumConfidence
        ),
        "X-BrandDeck-Brand-Validation-Score": String(
          validationReport.complianceScore
        ),
        "X-BrandDeck-Package-Audit": packageAudit.passed ? "passed" : "needs_review",
        "X-BrandDeck-Referenced-Slides": String(packageAudit.referencedSlideCount),
        "X-BrandDeck-Missing-Relationships": String(
          packageAudit.missingRelationshipTargetCount
        ),
        "X-BrandDeck-Placeholder-Hits": String(
          packageAudit.forbiddenPlaceholderHitCount
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
          error:
            error instanceof Error
              ? error.message
            : "Unable to export the template-based deck."
      },
      { status: 400 }
    );
  }
}
