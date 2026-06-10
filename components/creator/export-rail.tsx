"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DeckAccuracyAudit } from "@/lib/auditDeckAccuracy";
import type { DeckFitAudit } from "@/lib/auditDeckFit";
import type { BrandPreflightReport, ExportCertificate, TemplateGovernanceReport } from "@/lib/ui-types";
import { ValidationReport } from "@/lib/validateDeckPlan";
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, Lock, Presentation } from "lucide-react";

export function StatusStrip({
  report
}: {
  report: ValidationReport | null;
}) {
  if (!report) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-semibold text-[#787E89]">
        <FileText className="h-4 w-4" />
        No Deck Generated
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
        report.passed
          ? "bg-[#F3F3F3] text-[#188038]"
          : "bg-[#FFF1E8] text-[#B43C00]"
      }`}
    >
      {report.passed ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      {report.passed ? "Deck Ready" : "Needs Review"}
    </div>
  );
}

export function ExportQualityPanel({
  report,
  accuracyAudit,
  fitAudit,
  brandPreflight,
  templateGovernance,
  usingTemplateCloneEdit,
  exportCertificate,
  canExport,
  inputsStale = false
}: {
  report: ValidationReport | null;
  accuracyAudit: DeckAccuracyAudit | null;
  fitAudit: DeckFitAudit | null;
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  usingTemplateCloneEdit: boolean;
  exportCertificate: ExportCertificate | null;
  canExport: boolean;
  inputsStale?: boolean;
}) {
  const planReady = Boolean(report?.passed);
  const accuracyReady = Boolean(accuracyAudit?.passed);
  const fitReady = Boolean(fitAudit?.passed);
  const preflightReady = usingTemplateCloneEdit
    ? brandPreflight?.status === "ready"
    : planReady;
  const objectMapReady = usingTemplateCloneEdit
    ? templateGovernance?.summary.governanceScore === 100
    : true;
  const dryRunReady = usingTemplateCloneEdit
    ? exportCertificate?.packageAudit === "passed"
    : planReady;
  const qualityItems = [
    {
      label: "Deck structure",
      passed: planReady,
      detail: report
        ? `${report.complianceScore}% brand validation`
        : "Generate a deck"
    },
    {
      label: "Content accuracy",
      passed: accuracyReady,
      detail: accuracyAudit
        ? `${accuracyAudit.accuracyScore}% data and source grounding`
        : "Generate a deck"
    },
    {
      label: "Layout fit",
      passed: fitReady,
      detail: fitAudit ? `${fitAudit.fitScore}% fit score` : "Generate a deck"
    },
    {
      label: "Brand checks",
      passed: preflightReady,
      detail: usingTemplateCloneEdit
        ? brandPreflight
          ? `${brandPreflight.readinessScore}% template readiness${
              !preflightReady && canExport ? " (template export only)" : ""
            }`
          : "Waiting for template checks"
        : "Built-in brand layouts ready"
    },
    {
      label: "Template fit",
      passed: objectMapReady,
      detail: usingTemplateCloneEdit
        ? templateGovernance
          ? `${templateGovernance.summary.governanceScore}% approved${
              !objectMapReady && canExport ? " (template export only)" : ""
            }`
          : "Object map not loaded"
        : "No template object map required"
    },
    {
      label: "Export check",
      passed: dryRunReady,
      detail: usingTemplateCloneEdit
        ? exportCertificate?.packageAudit === "passed"
          ? `${exportCertificate.referencedSlides} slides, ${exportCertificate.placeholderHits} placeholder hits`
          : canExport
            ? "Template dry-run pending (template export only)"
            : "Runs after generation"
        : "No dry-run required"
    }
  ];
  const nextAction = canExport
    ? "Export PPTX"
    : inputsStale && planReady
      ? "Regenerate with Updated Inputs"
      : !planReady
        ? "Generate Presentation"
        : !accuracyReady
          ? "Review Sources or Generate Again"
          : !fitReady
            ? "Shorten Copy or Generate Again"
            : "Generate Presentation";

  return (
    <Card>
      <CardHeader>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
          Export Readiness
        </h3>
        <p className="mt-1 text-xs font-semibold text-[#787E89]">
          A simple status for the current deck.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border-l-2 border-brand-orange bg-[#F3F3F3] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
            Next Step
          </p>
          <p className="mt-1 text-sm font-black text-brand-charcoal">
            {nextAction}
          </p>
        </div>
        <div className="space-y-2">
          {qualityItems.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 border-b border-[#EFEAE5] pb-2 last:border-b-0 last:pb-0"
            >
              {item.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-charcoal">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#787E89]">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ValidationPanel({
  report,
  accuracyAudit,
  fitAudit,
  brandPreflight,
  templateGovernance,
  canExport,
  inputsStale = false,
  cloneEditReady = false,
  generating,
  preparingExport,
  exporting,
  auditingExport,
  usingTemplateCloneEdit,
  exportCertificate,
  onExport
}: {
  report: ValidationReport | null;
  accuracyAudit: DeckAccuracyAudit | null;
  fitAudit: DeckFitAudit | null;
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  canExport: boolean;
  inputsStale?: boolean;
  cloneEditReady?: boolean;
  generating: boolean;
  preparingExport: boolean;
  exporting: boolean;
  auditingExport: boolean;
  usingTemplateCloneEdit: boolean;
  exportCertificate: ExportCertificate | null;
  onExport: () => void;
}) {
  const exportChecksRunning = generating || preparingExport || auditingExport;
  const staleDeck = Boolean(report) && inputsStale;

  return (
    <aside className="border-l border-[#E5E0DB] bg-white p-6">
      <div className="space-y-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Ready to Export
          </h2>
          <div className="mt-3">
            <StatusStrip report={report} />
          </div>
        </div>

        <ExportQualityPanel
          report={report}
          accuracyAudit={accuracyAudit}
          fitAudit={fitAudit}
          brandPreflight={brandPreflight}
          templateGovernance={templateGovernance}
          usingTemplateCloneEdit={usingTemplateCloneEdit}
          exportCertificate={exportCertificate}
          canExport={canExport}
          inputsStale={inputsStale}
        />

        <div className="border-t border-[#E5E0DB] pt-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Export
          </h3>
          {canExport ? (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-bold text-[#188038]">
              <CheckCircle2 className="h-4 w-4" />
              Ready to export
            </div>
          ) : (
            <div
              className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${
                staleDeck && !exportChecksRunning
                  ? "bg-[#FFF7F2] text-[#A05A00]"
                  : "bg-[#F3F3F3] text-[#787E89]"
              }`}
            >
              {exportChecksRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : staleDeck ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {exportChecksRunning
                ? "Checking export readiness"
                : staleDeck
                  ? "Inputs changed - regenerate to refresh"
                  : "Generate deck to unlock export"}
            </div>
          )}
          <Button
            className="mt-3 w-full"
            disabled={!canExport || preparingExport || auditingExport || exporting}
            onClick={onExport}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PPTX
          </Button>
          {usingTemplateCloneEdit && (
            <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
              {cloneEditReady
                ? "Template checks passed. Exports use the uploaded template."
                : canExport
                  ? "Exports use approved brand layouts. Template export unlocks once Brand Settings mapping is complete."
                  : "Generation will run brand and template checks automatically."}
            </p>
          )}
        </div>

      </div>
    </aside>
  );
}
