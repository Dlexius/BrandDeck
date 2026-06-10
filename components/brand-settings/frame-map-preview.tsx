"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TemplateKitSummary } from "@/lib/ui-types";
import { AlertTriangle, CheckCircle2, Download, FileArchive, Loader2, Lock, ShieldCheck, Upload, X } from "lucide-react";

export function FrameMapPreview({
  templateKit,
  exportingFrameMap,
  exportingCloneStarter,
  approvingFrameMap,
  updatingLayoutId,
  updatingStaticSlides,
  onExportFrameMap,
  onExportCloneStarter,
  onApproveFrameMap,
  onUpdateFrameMapping,
  onUpdateStaticSlides
}: {
  templateKit: TemplateKitSummary | null;
  exportingFrameMap: boolean;
  exportingCloneStarter: boolean;
  approvingFrameMap: boolean;
  updatingLayoutId: string;
  updatingStaticSlides: boolean;
  onExportFrameMap: () => void;
  onExportCloneStarter: () => void;
  onApproveFrameMap: () => void;
  onUpdateFrameMapping: (layoutId: string, sourceSlide: number) => void;
  onUpdateStaticSlides: (
    slides: Array<{ sourceSlide: number; label: string }>
  ) => void;
}) {
  const [staticSlideNumber, setStaticSlideNumber] = useState("");
  const [staticSlideLabel, setStaticSlideLabel] = useState("");
  if (!templateKit) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Slide Mapping
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload a PPTX template to map approved BrandDeck layouts to source
            slides.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const visibleMappings = templateKit.frameMap.outputSlides.slice(0, 8);
  const averageConfidence = Math.round(
    visibleMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) /
      Math.max(visibleMappings.length, 1)
  );
  const frameMapApproved = templateKit.frameMap.approval.status === "approved";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Slide Mapping
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Approved layouts are bound to source slides before generation.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
              frameMapApproved
                ? "bg-[#F3F3F3] text-[#188038]"
                : "bg-[#FFF1E8] text-[#B43C00]"
            }`}
          >
            {frameMapApproved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {frameMapApproved ? "Admin approved" : "Suggested map"}
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <Lock className="h-3.5 w-3.5 text-brand-orange" />
            {averageConfidence}% confidence
          </div>
          <Button
            variant={frameMapApproved ? "secondary" : "primary"}
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={approvingFrameMap}
            onClick={onApproveFrameMap}
          >
            {approvingFrameMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Approve Map
          </Button>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={exportingFrameMap}
            onClick={onExportFrameMap}
          >
            {exportingFrameMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Map
          </Button>
          <Button
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={exportingCloneStarter}
            onClick={onExportCloneStarter}
          >
            {exportingCloneStarter ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
            Export Starter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {visibleMappings.map((mapping) => (
            <div
              key={mapping.layoutId}
              className="grid gap-3 border-b border-[#EFEAE5] px-5 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_170px_96px]"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-brand-charcoal">
                  {mapping.layoutId}
                </p>
                <p className="mt-1 text-xs font-semibold capitalize text-[#787E89]">
                  {mapping.narrativeRole}
                </p>
                <p className="mt-1 truncate text-[11px] font-medium text-[#787E89]">
                  {mapping.evidence.join(" | ")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Source Slide
                </p>
                <select
                  value={mapping.sourceSlide}
                  disabled={updatingLayoutId === mapping.layoutId}
                  onChange={(event) =>
                    onUpdateFrameMapping(
                      mapping.layoutId,
                      Number(event.currentTarget.value)
                    )
                  }
                  className="mt-1 h-8 w-full rounded-sm border border-[#D7CABF] bg-white px-2 font-mono text-xs font-black text-brand-charcoal outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 disabled:opacity-60"
                >
                  {templateKit.sourceSlides.map((slide) => (
                    <option key={slide.sourceSlide} value={slide.sourceSlide}>
                      {String(slide.sourceSlide).padStart(3, "0")} |{" "}
                      {((slide.layoutName ?? slide.textPreview) || "Slide").slice(
                        0,
                        42
                      )}
                    </option>
                  ))}
                </select>
                {mapping.evidence.some((item) => item.startsWith("admin_override")) && (
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-orange">
                    Admin override
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Confidence
                </p>
                <p className="mt-1 text-sm font-black text-brand-charcoal">
                  {mapping.confidence}%
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#E5E0DB] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Static Slides
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
            Mark template slides that ship word-for-word when a creator opts in
            - legal pages, fixed diagrams, brand statements. They are cloned
            verbatim; generation never edits them.
          </p>

          {(templateKit.staticSlides ?? []).length > 0 && (
            <div className="mt-3 space-y-2">
              {(templateKit.staticSlides ?? []).map((entry) => (
                <div
                  key={entry.sourceSlide}
                  className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-charcoal">
                      {entry.label}
                    </p>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                      Source slide {String(entry.sourceSlide).padStart(3, "0")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#787E89] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal disabled:opacity-50"
                    disabled={updatingStaticSlides}
                    aria-label={`Remove static slide ${entry.label}`}
                    onClick={() =>
                      onUpdateStaticSlides(
                        (templateKit.staticSlides ?? []).filter(
                          (item) => item.sourceSlide !== entry.sourceSlide
                        )
                      )
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
            <input
              type="number"
              min={1}
              max={templateKit.slideCount}
              value={staticSlideNumber}
              disabled={updatingStaticSlides}
              onChange={(event) => setStaticSlideNumber(event.target.value)}
              placeholder="Slide #"
              className="h-9 rounded-sm border border-[#D7CABF] bg-white px-2 font-mono text-xs font-black text-brand-charcoal outline-none transition focus:border-brand-orange"
            />
            <input
              type="text"
              maxLength={80}
              value={staticSlideLabel}
              disabled={updatingStaticSlides}
              onChange={(event) => setStaticSlideLabel(event.target.value)}
              placeholder="Label, e.g. Legal disclaimer"
              className="h-9 rounded-sm border border-[#D7CABF] bg-white px-2 text-xs font-semibold text-brand-charcoal outline-none transition focus:border-brand-orange"
            />
            <Button
              variant="secondary"
              className="h-9 px-3"
              disabled={
                updatingStaticSlides ||
                !Number.isInteger(Number(staticSlideNumber)) ||
                Number(staticSlideNumber) < 1 ||
                Number(staticSlideNumber) > templateKit.slideCount
              }
              onClick={() => {
                onUpdateStaticSlides([
                  ...(templateKit.staticSlides ?? []),
                  {
                    sourceSlide: Number(staticSlideNumber),
                    label:
                      staticSlideLabel.trim() ||
                      `Template slide ${staticSlideNumber}`
                  }
                ]);
                setStaticSlideNumber("");
                setStaticSlideLabel("");
              }}
            >
              {updatingStaticSlides ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Mark Static"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
