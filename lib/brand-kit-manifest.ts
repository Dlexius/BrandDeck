import type { BrandAssetSummary } from "@/lib/brand-asset-store";
import type { BrandContract, DeckPlan } from "@/lib/deck-plan-schema";
import { buildBrandPreflightReport } from "@/lib/brand-preflight";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
import {
  buildTemplateFrameMapArtifact,
  summarizeTemplateKit,
  type TemplateKit
} from "@/lib/template-kit-store";

export function buildBrandKitManifest({
  brandContract,
  templateKit,
  brandAssets,
  deckPlan
}: {
  brandContract: BrandContract;
  templateKit: TemplateKit;
  brandAssets: BrandAssetSummary[];
  deckPlan?: DeckPlan;
}) {
  const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
  const governance = buildTemplateEditGovernance(templateKit, frameMapArtifact);
  const preflight = buildBrandPreflightReport({
    brandContract,
    templateKit,
    brandAssets,
    deckPlan
  });
  const templateSummary = summarizeTemplateKit(templateKit);

  return {
    schema: "branddeck.brand-kit-manifest/v1" as const,
    generatedAt: new Date().toISOString(),
    brand: {
      companyName: brandContract.companyName,
      version: brandContract.version,
      approvedLayoutCount: brandContract.approved_layouts.length,
      approvedFonts: brandContract.approved_fonts,
      approvedColorTokens: brandContract.approved_color_tokens
    },
    template: {
      id: templateSummary.id,
      templateName: templateSummary.templateName,
      fingerprint: templateSummary.fingerprint,
      frameMapApproval: templateSummary.frameMap.approval,
      slideCount: templateSummary.slideCount,
      layoutCount: templateSummary.layoutCount,
      masterCount: templateSummary.masterCount,
      mediaCount: templateSummary.mediaCount,
      imageCount: templateSummary.imageCount,
      detectedFonts: templateSummary.detectedFonts,
      detectedColors: templateSummary.detectedColors,
      topAssets: templateSummary.topAssets.map((asset) => ({
        entry: asset.entry,
        extension: asset.extension,
        mimeType: asset.mimeType,
        bytes: asset.bytes,
        fingerprint: asset.fingerprint,
        width: asset.width,
        height: asset.height
      })),
      driftGuards: templateSummary.driftGuards
    },
    uploadedAssets: brandAssets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      role: asset.role,
      mimeType: asset.mimeType,
      extension: asset.extension,
      bytes: asset.bytes,
      fingerprint: asset.fingerprint,
      width: asset.width,
      height: asset.height,
      status: asset.status,
      driftGuards: asset.driftGuards
    })),
    frameMap: frameMapArtifact,
    editGovernance: governance,
    preflight,
    controlCertificate: {
      schema: "branddeck.control-certificate/v1" as const,
      status: preflight.status === "ready" ? "export_ready" : "needs_review",
      rendererBoundary:
        "AI may choose approved recipe/layout IDs and fill content only. Template geometry, assets, fonts, colors, and package assembly are deterministic.",
      templateFingerprint: templateSummary.fingerprint,
      frameMapApproval: templateSummary.frameMap.approval,
      frameMapCoverage: frameMapArtifact.validation.coverage,
      editableObjectGovernanceScore: governance.summary.governanceScore,
      sourcePackDocumentCount: deckPlan?.source_pack?.document_count ?? 0,
      approvedAssetCount: brandAssets.filter(
        (asset) => asset.status === "approved_for_review"
      ).length,
      governedAssetFingerprints: brandAssets.map((asset) => ({
        role: asset.role,
        fileName: asset.fileName,
        fingerprint: asset.fingerprint
      })),
      forbiddenDriftChecks: [
        "No unapproved layout IDs",
        "No AI-selected colors, fonts, or object positions",
        "Admin-approved frame-map fingerprint required for clone/edit export",
        "PPTX package audit required after export"
      ]
    },
    deckPlan: deckPlan
      ? {
          deck_type: deckPlan.deck_type,
          deck_recipe_id: deckPlan.deck_recipe_id,
          deck_recipe_name: deckPlan.deck_recipe_name,
          generation_mode: deckPlan.generation_mode,
          recipe_confidence: deckPlan.recipe_confidence,
          audience: deckPlan.audience,
          client_name: deckPlan.client_name,
          report_period: deckPlan.report_period,
          source_pack: deckPlan.source_pack ?? null,
          slideCount: deckPlan.slides.length,
          layoutIds: deckPlan.slides.map((slide) => slide.layout_id),
          sourceRefs: deckPlan.slides.map((slide) => ({
            title: slide.title,
            layout_id: slide.layout_id,
            refs: slide.source_refs ?? []
          }))
        }
      : null
  };
}
