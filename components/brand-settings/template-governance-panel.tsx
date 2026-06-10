"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TemplateGovernanceReport, TemplateKitSummary } from "@/lib/ui-types";
import { AlertTriangle, CheckCircle2, Download, Fingerprint, Loader2, Lock, RotateCcw, ShieldCheck, Upload } from "lucide-react";

export function TemplateGovernancePanel({
  templateKit,
  governance,
  exportingObjectMap,
  importingObjectMap,
  resettingObjectMap,
  onExportObjectMap,
  onImportObjectMap,
  onResetObjectMap
}: {
  templateKit: TemplateKitSummary | null;
  governance: TemplateGovernanceReport | null;
  exportingObjectMap: boolean;
  importingObjectMap: boolean;
  resettingObjectMap: boolean;
  onExportObjectMap: () => void;
  onImportObjectMap: (file: File | null) => void;
  onResetObjectMap: () => void;
}) {
  if (!templateKit) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Governance
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload a template to inspect editable objects, data bindings, and
            edit permissions.
          </p>
        </CardHeader>
      </Card>
    );
  }

  if (!governance) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Governance
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Governance report is pending for this template kit.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const summaryItems = [
    ["Score", `${governance.summary.governanceScore}%`],
    ["Ready Slides", `${governance.summary.readySlideCount}/${governance.summary.outputSlideCount}`],
    ["Editable Objects", String(governance.summary.editableObjectCount)],
    ["Tables", String(governance.summary.tableCellGroupCount)]
  ];
  const bindingSourceLabel =
    governance.summary.bindingSource === "admin_import"
      ? "Admin imported"
      : governance.summary.bindingSource === "built_in_procore"
        ? "Built-in template map"
        : "Needs import";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Governance
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Admin-approved editable objects for template-based generation.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-orange" />
            {governance.summary.governanceScore}% governed
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <Lock className="h-3.5 w-3.5 text-brand-orange" />
            {bindingSourceLabel}
          </div>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={exportingObjectMap}
            onClick={onExportObjectMap}
          >
            {exportingObjectMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Mapping File
          </Button>
          <label
            className={`inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#D7CABF] bg-[#F3F3F3] px-3 text-sm font-bold text-brand-charcoal transition hover:bg-[#E8E5E1] ${
              importingObjectMap ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {importingObjectMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Map
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={importingObjectMap}
              onChange={(event) => {
                onImportObjectMap(event.currentTarget.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={resettingObjectMap}
            onClick={onResetObjectMap}
          >
            {resettingObjectMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset Map
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded-md bg-[#F3F3F3] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Binding Fingerprint
            </p>
            <p className="mt-1 truncate font-mono text-[11px] font-semibold text-brand-ink">
              {governance.summary.bindingFingerprint || "No object bindings imported"}
            </p>
          </div>
          <div className="rounded-md bg-[#F3F3F3] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Binding Targets
            </p>
            <p className="mt-1 text-sm font-black text-brand-charcoal">
              {governance.summary.bindingTargetCount}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="border-l-2 border-brand-orange bg-[#F3F3F3] px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                {label}
              </p>
              <p className="mt-1 text-lg font-black text-brand-charcoal">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden border-t border-[#EFEAE5]">
          {governance.outputSlides.map((slide) => (
            <div
              key={`${slide.outputSlide}-${slide.layoutId}`}
              className="grid gap-3 border-b border-[#EFEAE5] py-3 last:border-b-0 md:grid-cols-[44px_minmax(0,1fr)_118px_120px]"
            >
              <span className="font-mono text-xs font-bold text-[#787E89]">
                {String(slide.outputSlide).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-brand-charcoal">
                  {slide.layoutId}
                </p>
                <div className="mt-2 grid gap-1">
                  {slide.targets.slice(0, 4).map((target) => (
                    <div
                      key={`${target.objectId}-${target.dataBinding}`}
                      className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[#787E89]"
                    >
                      <span className="shrink-0 rounded-sm bg-[#F3F3F3] px-1.5 py-0.5 font-mono text-[10px] font-black text-brand-ink">
                        {target.objectId}
                      </span>
                      <span className="truncate">{target.role}</span>
                      <span className="hidden truncate font-mono text-[10px] text-[#9AA0A6] md:inline">
                        {target.dataBinding}
                      </span>
                    </div>
                  ))}
                  {slide.targets.length > 4 && (
                    <p className="text-[11px] font-semibold text-[#787E89]">
                      +{slide.targets.length - 4} more mapped object
                      {slide.targets.length - 4 === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Objects
                </p>
                <p className="mt-1 text-sm font-black text-brand-charcoal">
                  {slide.editTargetCount}
                </p>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] ${
                  slide.status === "ready" ? "text-[#188038]" : "text-[#B43C00]"
                }`}
              >
                {slide.status === "ready" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {slide.status.replaceAll("_", " ")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
