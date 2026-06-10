"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandContract } from "@/lib/deck-plan-schema";
import type { BrandAssetSummary, TemplateKitSummary } from "@/lib/ui-types";
import { CheckCircle2, FileArchive, Fingerprint, Layers3, Loader2, Lock, Palette, ShieldCheck, Type, Upload } from "lucide-react";

export function BrandContractPanel({
  brandContract,
  templateFileName,
  templateStatus,
  templateKit,
  brandAssets,
  templateUploading,
  assetUploading,
  adoptingIdentity,
  onTemplateUpload,
  onAssetUpload,
  onAdoptTemplateIdentity
}: {
  brandContract: BrandContract;
  templateFileName: string;
  templateStatus: string;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  templateUploading: boolean;
  assetUploading: boolean;
  adoptingIdentity: boolean;
  onTemplateUpload: (file: File | null) => void;
  onAssetUpload: (files: FileList | null) => void;
  onAdoptTemplateIdentity: () => void;
}) {
  const colors = Object.entries(brandContract.approved_color_tokens).slice(0, 7);
  const approvedColorSet = new Set(
    Object.values(brandContract.approved_color_tokens).map((color) =>
      color.toUpperCase()
    )
  );
  const approvedDetectedColorCount =
    templateKit?.detectedColors.filter((color) =>
      approvedColorSet.has(color.toUpperCase())
    ).length ?? 0;

  return (
    <section className="rounded-md border border-[#E5E0DB] bg-white p-6">
      <div className="space-y-7">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Contract
          </h2>
          <div className="mt-3 flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-semibold text-brand-ink">
            <ShieldCheck className="h-4 w-4 text-brand-orange" />
            Active Brand Contract
          </div>
          <div className="mt-5">
            <div className="mb-4 flex h-9 items-center">
              <img
                src={brandContract.template_assets?.wordmark_black}
                alt="Procore template wordmark"
                className="h-6 w-auto object-contain"
              />
            </div>
            <p className="text-lg font-black text-brand-charcoal">
              {brandContract.companyName}
            </p>
            <p className="mt-1 text-sm text-[#787E89]">
              {brandContract.version}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Intake
          </h3>
          <div className="rounded-md border border-[#E5E0DB] bg-[#FBFAF9] p-3">
            <div className="flex items-start gap-3">
              {templateUploading ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-orange" />
              ) : (
                <FileArchive className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-brand-charcoal">
                  {templateFileName}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#787E89]">
                  {templateStatus}
                </p>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                Add PPTX Template
              </span>
              <Input
                type="file"
                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(event) =>
                  onTemplateUpload(event.currentTarget.files?.[0] ?? null)
                }
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                Add Supporting Assets
              </span>
              <Input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/svg+xml"
                disabled={assetUploading}
                onChange={(event) => onAssetUpload(event.currentTarget.files)}
              />
              {assetUploading && (
                <span className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#787E89]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
                  Inspecting asset metadata
                </span>
              )}
            </label>
          </div>
          <div className="grid gap-2 text-xs font-semibold text-brand-ink">
            {[
              "Upload approved PPTX",
              "Lock assets, fonts, and layout IDs",
              "Generate only approved placeholders"
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-brand-orange font-mono text-[10px] text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          {templateKit && (
            <div className="space-y-3 rounded-md bg-[#F3F3F3] p-3">
              <div className="flex items-start gap-2">
                <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Fingerprint
                  </p>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-brand-ink">
                    {templateKit.fingerprint}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Slides", templateKit.slideCount],
                  ["Layouts", templateKit.layoutCount],
                  ["Media", templateKit.mediaCount]
                ].map(([label, value]) => (
                  <div key={label} className="bg-white px-2 py-2">
                    <p className="text-base font-black text-brand-charcoal">
                      {value}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  <Type className="h-3.5 w-3.5 text-brand-orange" />
                  Fonts
                </div>
                <p className="mt-1 text-xs leading-5 text-brand-ink">
                  {templateKit.detectedFonts.slice(0, 4).join(", ") || "None detected"}
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                disabled={adoptingIdentity}
                onClick={onAdoptTemplateIdentity}
              >
                {adoptingIdentity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Adopt this template's brand identity
              </Button>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  <Palette className="h-3.5 w-3.5 text-brand-orange" />
                  Observed Colors
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[#787E89]">
                  {approvedDetectedColorCount}/{templateKit.detectedColors.length} match
                  active contract tokens
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {templateKit.detectedColors.slice(0, 10).map((color) => (
                    <span
                      key={color}
                      title={color}
                      className="h-4 w-4 border border-[#D7CABF]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {brandAssets.length > 0 && (
            <div className="rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-semibold leading-5 text-brand-ink">
              {brandAssets.length} governed supporting asset
              {brandAssets.length === 1 ? "" : "s"} ready for admin review
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Color Tokens
          </h3>
          {colors.map(([name, value]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="capitalize text-[#5F6368]">
                {name.replaceAll("_", " ")}
              </span>
              <span className="flex items-center gap-2 font-mono text-xs text-brand-ink">
                <span
                  className="h-4 w-4 rounded-sm border border-[#D7CABF]"
                  style={{ backgroundColor: value }}
                />
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Assets
          </h3>
          <div className="rounded-md bg-[#F3F3F3] px-3 py-3 text-sm leading-5 text-brand-ink">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-orange" />
              Approved PPTX assets loaded
            </div>
            <p className="mt-2 text-xs text-[#787E89]">
              Wordmark, texture, icon, and hero image assets are extracted from
              the 2025 presentation template.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Typography
          </h3>
          <div className="space-y-2 text-sm text-brand-ink">
            <div className="flex justify-between gap-4">
              <span className="text-[#787E89]">Heading</span>
              <span className="text-right font-semibold">
                {brandContract.approved_fonts.heading[0]}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#787E89]">Body</span>
              <span className="text-right font-semibold">
                {brandContract.approved_fonts.body[0]}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#787E89]">Mono</span>
              <span className="text-right font-semibold">
                {brandContract.approved_fonts.mono[0]}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Approved Layouts
            </h3>
            <span className="text-xs font-bold text-brand-orange">
              {brandContract.approved_layouts.length}
            </span>
          </div>
          <div className="space-y-2">
            {brandContract.approved_layouts.map((layout) => (
              <div
                key={layout.layout_id}
                className="flex items-center gap-2 text-sm text-brand-ink"
              >
                <Layers3 className="h-3.5 w-3.5 shrink-0 text-[#787E89]" />
                <span className="truncate font-medium">{layout.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E5E0DB] pt-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Rules Summary
          </h3>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2 text-sm leading-5 text-brand-ink">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              <span>
                BrandDeck drafts the story; your brand system makes every visual decision.
              </span>
            </div>
            {brandContract.forbidden_rules.slice(0, 4).map((rule) => (
              <div key={rule} className="flex gap-2 text-sm leading-5 text-brand-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
