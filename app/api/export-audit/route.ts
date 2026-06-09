import { NextResponse } from "next/server";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import {
  auditCloneEditBindings,
  renderCloneEditedPptx
} from "@/lib/cloneStarterPptx";
import { auditDeckFit } from "@/lib/auditDeckFit";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { auditPptxPackage } from "@/lib/pptx-package-audit";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
import {
  buildTemplateFrameMapArtifact,
  getTemplateKit
} from "@/lib/template-kit-store";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

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

    if (templateKit.frameMap.approval.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Frame map is not admin-approved. Review and approve source-slide mappings before running the export audit."
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
          error: "Deck plan failed brand validation.",
          validationReport
        },
        { status: 422 }
      );
    }

    const fitAudit = auditDeckFit({ deckPlan, brandContract });

    if (!fitAudit.passed) {
      return NextResponse.json(
        {
          error: "Deck plan failed layout fit audit.",
          fitAudit
        },
        { status: 422 }
      );
    }

    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const editGovernance = buildTemplateEditGovernance(
      templateKit,
      frameMapArtifact
    );
    const bindingAudit = auditCloneEditBindings({
      templateKit,
      frameMapArtifact,
      deckPlan,
      allowLocalFallback: body.allowLocalBindingFallback === true
    });

    if (!bindingAudit.passed) {
      return NextResponse.json(
        {
          error: "Template export failed object binding governance.",
          bindingAudit
        },
        { status: 422 }
      );
    }
    const pptxBuffer = await renderCloneEditedPptx(
      templateKit,
      frameMapArtifact,
      deckPlan
    );
    const packageAudit = await auditPptxPackage(
      pptxBuffer,
      frameMapArtifact.outputSlides.length
    );

    return NextResponse.json(
      {
        schema: "branddeck.export-audit/v1",
        generatedAt: new Date().toISOString(),
        passed: packageAudit.passed,
        certificate: {
          renderer: "template-clone-edit",
          packageAudit: packageAudit.passed ? "passed" : "needs_review",
          frameMapApproval: templateKit.frameMap.approval.status,
          frameMapFingerprint: templateKit.frameMap.approval.mappingFingerprint,
          frameMapCoverage: frameMapArtifact.validation.coverage,
          objectGovernanceScore: `${editGovernance.summary.governanceScore}%`,
          editableObjects: String(editGovernance.summary.editableObjectCount),
          objectBindingSource: editGovernance.summary.bindingSource,
          objectBindingFingerprint: editGovernance.summary.bindingFingerprint,
          referencedSlides: String(packageAudit.referencedSlideCount),
          missingRelationships: String(packageAudit.missingRelationshipTargetCount),
          placeholderHits: String(packageAudit.forbiddenPlaceholderHitCount),
          brandValidationScore: `${validationReport.complianceScore}%`
        },
        packageAudit,
        frameMap: {
          coverage: frameMapArtifact.validation.coverage,
          minimumConfidence: frameMapArtifact.validation.minimumConfidence
        },
        objectGovernance: {
          governanceScore: editGovernance.summary.governanceScore,
          editableObjectCount: editGovernance.summary.editableObjectCount,
          readySlideCount: editGovernance.summary.readySlideCount,
          outputSlideCount: editGovernance.summary.outputSlideCount
        }
      },
      {
        status: packageAudit.passed ? 200 : 422,
        headers: {
          "X-BrandDeck-Export-Audit": packageAudit.passed
            ? "passed"
            : "needs_review",
          "X-BrandDeck-Referenced-Slides": String(packageAudit.referencedSlideCount),
          "X-BrandDeck-Frame-Map-Coverage": frameMapArtifact.validation.coverage,
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
          "X-BrandDeck-Placeholder-Hits": String(
            packageAudit.forbiddenPlaceholderHitCount
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
            : "Unable to run the export audit."
      },
      { status: 400 }
    );
  }
}
