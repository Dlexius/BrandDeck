"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BrandContract } from "@/lib/deck-plan-schema";
import { DeckRecipe, approvedDeckRecipes } from "@/lib/deck-recipes";
import type { BrandAssetSummary, BrandPreflightReport, TemplateGovernanceReport, TemplateKitSummary } from "@/lib/ui-types";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";

export function TemplateOnboardingWorkbench({
  brandContract,
  templateKit,
  brandAssets,
  brandPreflight,
  templateGovernance,
  customRecipes
}: {
  brandContract: BrandContract;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  customRecipes: DeckRecipe[];
}) {
  const allRecipes = [...approvedDeckRecipes, ...customRecipes];
  const readyLayoutIds = new Set(
    templateGovernance?.outputSlides
      .filter((slide) => slide.status === "ready")
      .map((slide) => slide.layoutId) ?? []
  );
  const approvedLayoutIds = brandContract.approved_layouts.map(
    (layout) => layout.layout_id
  );
  const coveredApprovedLayoutCount = approvedLayoutIds.filter((layoutId) =>
    readyLayoutIds.has(layoutId)
  ).length;
  const coveredRecipes = allRecipes.filter((recipe) =>
    recipe.slide_sequence.every((slide) => readyLayoutIds.has(slide.layout_id))
  );
  const labeledAssets = brandAssets.filter(
    (asset) => asset.status === "approved_for_review"
  );
  const uploadedNeedsLabel = brandAssets.filter(
    (asset) => asset.status === "needs_admin_label"
  );
  const roleSet = new Set(labeledAssets.map((asset) => asset.role));
  const hasLogo = roleSet.has("logo") || Boolean(brandContract.template_assets?.wordmark_black);
  const hasVisualAsset =
    roleSet.has("hero_image") ||
    roleSet.has("supporting_image") ||
    roleSet.has("texture") ||
    Boolean(brandContract.template_assets?.hero_photo);
  const frameMapApproved = templateKit?.frameMap.approval.status === "approved";
  const objectMapReady = templateGovernance?.summary.governanceScore === 100;
  const brandReady = brandPreflight?.status === "ready";

  const setupSteps = [
    {
      label: "Template locked",
      passed: Boolean(templateKit),
      detail: templateKit
        ? `${templateKit.slideCount} slides fingerprinted`
        : "Upload an approved PPTX template"
    },
    {
      label: "Assets labeled",
      passed: hasLogo && hasVisualAsset && uploadedNeedsLabel.length === 0,
      detail:
        uploadedNeedsLabel.length > 0
          ? `${uploadedNeedsLabel.length} uploaded asset${uploadedNeedsLabel.length === 1 ? "" : "s"} need labels`
          : labeledAssets.length > 0
            ? `${labeledAssets.length} uploaded asset${labeledAssets.length === 1 ? "" : "s"} plus contract assets`
            : `${Array.from(
                new Set([
                  ...Array.from(roleSet),
                  brandContract.template_assets?.wordmark_black ? "logo" : "",
                  brandContract.template_assets?.hero_photo ? "hero_image" : ""
                ].filter(Boolean))
              )
              .map((role) => role.replaceAll("_", " "))
              .join(", ")} from brand contract`
    },
    {
      label: "Slide mapping approved",
      passed: Boolean(frameMapApproved),
      detail: frameMapApproved
        ? `${templateKit?.frameMap.outputSlides.length ?? 0} output slide mappings approved`
        : "Review and approve source slide mappings"
    },
    {
      label: "Text fields mapped",
      passed: Boolean(objectMapReady),
      detail: templateGovernance
        ? `${templateGovernance.summary.editableObjectCount} editable objects mapped`
        : "Generate governance report for editable objects"
    },
    {
      label: "Deck type coverage",
      passed: coveredRecipes.length === allRecipes.length && allRecipes.length > 0,
      detail: `${coveredRecipes.length}/${allRecipes.length} recipe${allRecipes.length === 1 ? "" : "s"} fully covered`
    },
    {
      label: "Current deck preflight",
      passed: Boolean(brandReady),
      detail: brandPreflight
        ? `${brandPreflight.readinessScore}% readiness for the active deck request`
        : "Generate or prepare a deck to run preflight"
    }
  ];
  const setupScore = Math.round(
    (setupSteps.filter((step) => step.passed).length / setupSteps.length) * 100
  );
  const nextStep =
    setupSteps.find((step) => !step.passed) ??
    setupSteps[setupSteps.length - 1];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Readiness
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#787E89]">
            Track how close your uploaded template is to powering template-native exports.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
            setupScore === 100
              ? "bg-[#F3F3F3] text-[#188038]"
              : "bg-[#FFF1E8] text-[#B43C00]"
          }`}
        >
          {setupScore === 100 ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {setupScore}% ready
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-l-2 border-brand-orange bg-[#111111] px-4 py-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60">
              Next Admin Action
            </p>
            <p className="mt-2 text-base font-black leading-6">
              {nextStep.label}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/72">
              {nextStep.detail}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {setupSteps.map((step) => (
              <div
                key={step.label}
                className="flex min-w-0 items-start gap-2 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5]"
              >
                {step.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-brand-charcoal">
                    {step.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-[#787E89]">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-[#EFEAE5] pt-4 md:grid-cols-3">
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Layout Coverage
            </p>
            <p className="mt-1 text-2xl font-black text-brand-charcoal">
              {coveredApprovedLayoutCount}/{approvedLayoutIds.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              approved layouts ready for template export
            </p>
          </div>
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Deck Recipe Coverage
            </p>
            <p className="mt-1 text-2xl font-black text-brand-charcoal">
              {coveredRecipes.length}/{allRecipes.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              predefined and admin recipes supported
            </p>
          </div>
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Brand Lock
            </p>
            <p className="mt-1 text-sm font-black text-brand-charcoal">
              Your slides, your styling
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              Exports copy your template slides and fill approved text only
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
