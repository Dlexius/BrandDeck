"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { BrandPreflightReport } from "@/lib/ui-types";
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";

export function BrandPreflightPanel({
  report,
  canExportManifest,
  exportingManifest,
  onExportManifest
}: {
  report: BrandPreflightReport | null;
  canExportManifest: boolean;
  exportingManifest: boolean;
  onExportManifest: () => void;
}) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Preflight
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload a template and generate a plan to run the export readiness
            audit.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const needsDeckPlan = report.checks.some(
    (check) => check.id === "deck-plan:validation" && !check.passed
  );
  const visibleChecks = [
    ...report.checks.filter((check) => !check.passed),
    ...report.checks.filter((check) => check.passed)
  ].slice(0, 7);
  const statusLabel =
    report.status === "ready"
      ? "Ready to export"
      : needsDeckPlan
        ? "Needs generated deck"
        : "Needs review";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Preflight
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Deterministic export gate for template, assets, governance, and the generated deck.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
              report.status === "ready"
                ? "bg-[#F3F3F3] text-[#188038]"
                : "bg-[#FFF1E8] text-[#B43C00]"
            }`}
          >
            {report.status === "ready" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {statusLabel}
          </div>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={!canExportManifest || exportingManifest}
            onClick={onExportManifest}
          >
            {exportingManifest ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Manifest
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Readiness
            </p>
            <p className="mt-1 text-3xl font-black text-brand-charcoal">
              {report.readinessScore}%
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              {report.summary.passed}/{report.summary.total} checks
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {visibleChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-2 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5]"
              >
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-brand-charcoal">
                    {check.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-[#787E89]">
                    {check.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
