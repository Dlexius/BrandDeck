import type { BrandAssetSummary } from "@/lib/brand-asset-store";
import type { BrandContract, DeckPlan } from "@/lib/deck-plan-schema";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
import {
  buildTemplateFrameMapArtifact,
  type TemplateKit
} from "@/lib/template-kit-store";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

export type BrandPreflightCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type BrandPreflightReport = {
  schema: "branddeck.brand-preflight/v1";
  generatedAt: string;
  status: "ready" | "needs_review";
  readinessScore: number;
  checks: BrandPreflightCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

function check(
  id: string,
  label: string,
  passed: boolean,
  detail: string
): BrandPreflightCheck {
  return { id, label, passed, detail };
}

export function buildBrandPreflightReport({
  brandContract,
  templateKit,
  brandAssets,
  deckPlan
}: {
  brandContract: BrandContract;
  templateKit?: TemplateKit;
  brandAssets: BrandAssetSummary[];
  deckPlan?: DeckPlan;
}): BrandPreflightReport {
  const checks: BrandPreflightCheck[] = [];
  const uploadedNeedsLabel = brandAssets.filter(
    (asset) => asset.status === "needs_admin_label"
  );
  const hasLogoAsset =
    brandAssets.some((asset) => asset.role === "logo") ||
    Boolean(brandContract.template_assets?.wordmark_black);
  const hasHeroAsset =
    brandAssets.some((asset) => asset.role === "hero_image") ||
    Boolean(brandContract.template_assets?.hero_photo);
  const optionalAssetLabelsReady =
    uploadedNeedsLabel.length === 0 || (hasLogoAsset && hasHeroAsset);

  checks.push(
    check(
      "template:fingerprint",
      "Template fingerprint lock",
      Boolean(templateKit?.fingerprint),
      templateKit
        ? `Locked to ${templateKit.fingerprint.slice(0, 16)}.`
        : "Upload a PPTX template to lock the source package."
    )
  );

  checks.push(
    check(
      "assets:logo",
      "Approved logo asset",
      hasLogoAsset,
      hasLogoAsset
        ? "Logo or wordmark asset is available."
        : "Upload or approve a logo/wordmark asset."
    )
  );

  checks.push(
    check(
      "assets:hero",
      "Approved hero image",
      hasHeroAsset,
      hasHeroAsset
        ? "Hero/supporting image asset is available."
        : "Upload or approve a hero/supporting image asset."
    )
  );

  checks.push(
    check(
      "assets:labels",
      "Optional asset labels",
      optionalAssetLabelsReady,
      uploadedNeedsLabel.length === 0
        ? `${brandAssets.length} uploaded assets are role labeled.`
        : `${uploadedNeedsLabel.length} optional uploaded asset${
            uploadedNeedsLabel.length === 1 ? "" : "s"
          } still need admin labels; approved contract assets are available for export.`
    )
  );

  if (templateKit) {
    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const governance = buildTemplateEditGovernance(templateKit, frameMapArtifact);
    const frameMapApproved = templateKit.frameMap.approval.status === "approved";

    checks.push(
      check(
        "frame-map:coverage",
        "Frame map coverage",
        frameMapArtifact.validation.unmappedOutputSlides.length === 0,
        `${frameMapArtifact.validation.coverage} slides mapped.`
      )
    );

    checks.push(
      check(
        "frame-map:approval",
        "Admin-approved frame map",
        frameMapApproved,
        frameMapApproved
          ? `Approved by ${templateKit.frameMap.approval.approvedBy ?? "brand admin"}.`
          : "Review and approve source-slide mappings before export."
      )
    );

    checks.push(
      check(
        "template:governance",
        "Editable object governance",
        governance.summary.governanceScore === 100,
        `${governance.summary.readySlideCount}/${governance.summary.outputSlideCount} output slides ready.`
      )
    );
  } else {
    checks.push(
      check(
        "frame-map:coverage",
        "Frame map coverage",
        false,
        "Upload a template before template-based export."
      )
    );
    checks.push(
      check(
        "template:governance",
        "Editable object governance",
        false,
        "No template governance report is available yet."
      )
    );
    checks.push(
      check(
        "frame-map:approval",
        "Admin-approved frame map",
        false,
        "No frame map is available to approve yet."
      )
    );
  }

  if (deckPlan) {
    const validationReport = validateDeckPlan(deckPlan, brandContract);

    checks.push(
      check(
        "deck-plan:validation",
        "Deck validation",
        validationReport.passed,
        `${validationReport.summary.passed}/${validationReport.summary.total} plan checks passed.`
      )
    );

    checks.push(
      check(
        "source-context:boundary",
        "Source context boundary",
        true,
        deckPlan.source_pack
          ? `${deckPlan.source_pack.document_count} source document(s) converted to bounded evidence references.`
          : "No supporting source documents attached to this deck."
      )
    );
  } else {
    checks.push(
      check(
        "deck-plan:validation",
        "Deck validation",
        false,
        "Generate a deck before export."
      )
    );
    checks.push(
      check(
        "source-context:boundary",
        "Source context boundary",
        false,
        "Generate a deck before checking source evidence boundaries."
      )
    );
  }

  const passed = checks.filter((item) => item.passed).length;
  const readinessScore = Math.round((passed / Math.max(checks.length, 1)) * 100);

  return {
    schema: "branddeck.brand-preflight/v1",
    generatedAt: new Date().toISOString(),
    status: checks.every((item) => item.passed) ? "ready" : "needs_review",
    readinessScore,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed: checks.length - passed
    }
  };
}
