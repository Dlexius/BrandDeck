"use client";

import { MetricImportDropzone } from "@/components/metric-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BiMetricImport } from "@/lib/bi-csv-import";
import type { BusinessSnapshotState } from "@/lib/ui-types";
import { Sparkles } from "lucide-react";

function SnapshotInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-brand-charcoal">
        {label}
      </span>
      <Input
        value={value}
        inputMode={inputMode}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SnapshotTextarea({
  label,
  value,
  onChange,
  placeholder,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-brand-charcoal">
        {label}
      </span>
      <Textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[86px]"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function BusinessDataCard({
  businessSnapshot,
  kpiSummary,
  workflowBusy,
  metricImport,
  importingMetrics,
  onImportMetricFile,
  onClearMetricImport,
  onSnapshotChange,
  onUseExample
}: {
  businessSnapshot: BusinessSnapshotState;
  kpiSummary: {
    client?: string;
    period?: string;
    activeUsers: number;
    licensedUsers: number;
    adoptionScore: number;
  } | null;
  workflowBusy: boolean;
  metricImport: BiMetricImport | null;
  importingMetrics: boolean;
  onImportMetricFile: (files: FileList | null) => void;
  onClearMetricImport: () => void;
  onSnapshotChange: (field: keyof BusinessSnapshotState, value: string) => void;
  onUseExample: () => void;
}) {
  const update =
    (field: keyof BusinessSnapshotState) => (value: string) =>
      onSnapshotChange(field, value);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Metrics Snapshot
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Drop a BI export or confirm the few numbers needed to ground the
            deck. Everything else can stay optional.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onUseExample}
          disabled={workflowBusy}
        >
          <Sparkles className="h-4 w-4" />
          Use Example Metrics
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricImportDropzone
          metricImport={metricImport}
          importing={importingMetrics}
          disabled={workflowBusy}
          onFiles={onImportMetricFile}
          onClear={onClearMetricImport}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SnapshotInput
                label="Client"
                value={businessSnapshot.client_name}
                disabled={workflowBusy}
                placeholder="Harborview Civil Partners"
                onChange={update("client_name")}
              />
              <SnapshotInput
                label="Current Period"
                value={businessSnapshot.report_period}
                disabled={workflowBusy}
                placeholder="June 2026"
                onChange={update("report_period")}
              />
              <SnapshotInput
                label="Adoption Score"
                value={businessSnapshot.adoption_score}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="76"
                onChange={update("adoption_score")}
              />
              <SnapshotInput
                label="Active Users"
                value={businessSnapshot.active_users}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="244"
                onChange={update("active_users")}
              />
              <SnapshotInput
                label="Licensed Users"
                value={businessSnapshot.licensed_users}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="325"
                onChange={update("licensed_users")}
              />
              <SnapshotInput
                label="Active Projects"
                value={businessSnapshot.projects_active}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="24"
                onChange={update("projects_active")}
              />
            </div>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Trend baseline and mobile usage
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <SnapshotInput
                  label="Prior Period"
                  value={businessSnapshot.previous_report_period}
                  disabled={workflowBusy}
                  placeholder="May 2026"
                  onChange={update("previous_report_period")}
                />
                <SnapshotInput
                  label="Prior Adoption"
                  value={businessSnapshot.previous_adoption_score}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="73"
                  onChange={update("previous_adoption_score")}
                />
                <SnapshotInput
                  label="Prior Users"
                  value={businessSnapshot.previous_active_users}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="213"
                  onChange={update("previous_active_users")}
                />
                <SnapshotInput
                  label="Mobile Usage"
                  value={businessSnapshot.mobile_usage_rate}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="61"
                  onChange={update("mobile_usage_rate")}
                />
                <SnapshotInput
                  label="Prior Mobile"
                  value={businessSnapshot.previous_mobile_usage_rate}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="59"
                  onChange={update("previous_mobile_usage_rate")}
                />
              </div>
            </details>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Workflow signals
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SnapshotInput
                  label="Daily Logs"
                  value={businessSnapshot.daily_logs_count}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="1840"
                  onChange={update("daily_logs_count")}
                />
                <SnapshotInput
                  label="RFIs"
                  value={businessSnapshot.rfi_count}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="286"
                  onChange={update("rfi_count")}
                />
                <SnapshotInput
                  label="Submittals"
                  value={businessSnapshot.submittals_count}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="350"
                  onChange={update("submittals_count")}
                />
                <SnapshotInput
                  label="Top Workflow"
                  value={businessSnapshot.top_feature}
                  disabled={workflowBusy}
                  placeholder="Daily Logs"
                  onChange={update("top_feature")}
                />
                <SnapshotInput
                  label="Lowest Workflow"
                  value={businessSnapshot.lowest_feature}
                  disabled={workflowBusy}
                  placeholder="Submittals"
                  onChange={update("lowest_feature")}
                />
              </div>
            </details>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Risks and actions
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SnapshotTextarea
                  label="Risk Summary"
                  value={businessSnapshot.risk_summary}
                  disabled={workflowBusy}
                  placeholder="What should the deck call out?"
                  onChange={update("risk_summary")}
                />
                <div className="space-y-3">
                  <SnapshotInput
                    label="Recommendation 1"
                    value={businessSnapshot.recommendation_1}
                    disabled={workflowBusy}
                    placeholder="Assign a workflow owner"
                    onChange={update("recommendation_1")}
                  />
                  <SnapshotInput
                    label="Recommendation 2"
                    value={businessSnapshot.recommendation_2}
                    disabled={workflowBusy}
                    placeholder="Review response targets weekly"
                    onChange={update("recommendation_2")}
                  />
                  <SnapshotInput
                    label="Recommendation 3"
                    value={businessSnapshot.recommendation_3}
                    disabled={workflowBusy}
                    placeholder="Reinforce field habits"
                    onChange={update("recommendation_3")}
                  />
                </div>
              </div>
            </details>
          </div>

          <div
            className={`border-l-2 px-4 py-3 transition ${
              kpiSummary
                ? "border-brand-orange bg-[#FFF7F2]"
                : "border-[#D7CABF] bg-[#F3F3F3]"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Current Snapshot
            </p>
            <p className="mt-2 text-sm font-bold text-brand-charcoal">
              {kpiSummary ? kpiSummary.client : "Add account details"}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
              {kpiSummary
                ? `${kpiSummary.period} | ${kpiSummary.activeUsers}/${kpiSummary.licensedUsers} users | ${kpiSummary.adoptionScore}% score`
                : "Client, period, active users, licensed users, and adoption score are required."}
            </p>
            <div className="mt-4 space-y-2 border-t border-[#E5E0DB] pt-3 text-xs font-semibold leading-5 text-[#787E89]">
              <p>Client profiles and source notes can enrich the plan.</p>
              <p>
                BrandDeck uses these values as evidence while the brand contract
                controls layout and visual decisions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
