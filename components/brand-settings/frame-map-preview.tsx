"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TemplateKitSummary } from "@/lib/ui-types";
import { AlertTriangle, CheckCircle2, Download, FileArchive, Loader2, Lock, ShieldCheck, Upload } from "lucide-react";

export function FrameMapPreview({
  templateKit,
  exportingFrameMap,
  exportingCloneStarter,
  approvingFrameMap,
  updatingLayoutId,
  onExportFrameMap,
  onExportCloneStarter,
  onApproveFrameMap,
  onUpdateFrameMapping
}: {
  templateKit: TemplateKitSummary | null;
  exportingFrameMap: boolean;
  exportingCloneStarter: boolean;
  approvingFrameMap: boolean;
  updatingLayoutId: string;
  onExportFrameMap: () => void;
  onExportCloneStarter: () => void;
  onApproveFrameMap: () => void;
  onUpdateFrameMapping: (layoutId: string, sourceSlide: number) => void;
}) {
  if (!templateKit) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Frame Map
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
            Template Frame Map
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
      </CardContent>
    </Card>
  );
}
