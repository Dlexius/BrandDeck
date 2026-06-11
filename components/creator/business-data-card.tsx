"use client";

import { MetricImportDropzone } from "@/components/metric-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BiMetricImport } from "@/lib/bi-csv-import";
import type { ActionPresets, BusinessSnapshotState, BusinessSnapshotTextField, PresentationMode, WorkflowMetricEntry } from "@/lib/ui-types";
import { Plus, Sparkles, X } from "lucide-react";

const MAX_WORKFLOW_METRICS = 24;

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
  presentationMode,
  businessSnapshot,
  kpiSummary,
  actionPresets,
  workflowBusy,
  metricImport,
  importingMetrics,
  onImportMetricFile,
  onClearMetricImport,
  onSnapshotChange,
  onWorkflowMetricsChange,
  onUseExample
}: {
  presentationMode: PresentationMode;
  businessSnapshot: BusinessSnapshotState;
  actionPresets: ActionPresets;
  kpiSummary: {
    client?: string;
    period?: string;
    activeUsers?: number;
    licensedUsers?: number;
    adoptionScore?: number;
  } | null;
  workflowBusy: boolean;
  metricImport: BiMetricImport | null;
  importingMetrics: boolean;
  onImportMetricFile: (files: FileList | null) => void;
  onClearMetricImport: () => void;
  onSnapshotChange: (field: BusinessSnapshotTextField, value: string) => void;
  onWorkflowMetricsChange: (metrics: WorkflowMetricEntry[]) => void;
  onUseExample: () => void;
}) {
  const update =
    (field: BusinessSnapshotTextField) => (value: string) =>
      onSnapshotChange(field, value);
  const internal = presentationMode === "internal";
  const workflowMetrics = businessSnapshot.workflow_metrics ?? [];

  function updateWorkflowMetric(
    index: number,
    patch: Partial<WorkflowMetricEntry>
  ) {
    onWorkflowMetricsChange(
      workflowMetrics.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, ...patch } : metric
      )
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Metrics Snapshot
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Drop a Power BI PDF/PPTX or CSV export, or type the few numbers
            needed to ground the deck. License counts can stay optional.
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
                label={internal ? "Prepared For" : "Client"}
                value={businessSnapshot.client_name}
                disabled={workflowBusy}
                placeholder={
                  internal ? "Field Operations Team" : "Harborview Civil Partners"
                }
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
                label="Licensed Users (Optional)"
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
                Trend baseline
              </summary>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
                Add the prior period when you want the deck to show movement
                over time. Imports with multiple periods fill this
                automatically.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
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
              </div>
            </details>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Workflow usage
                {workflowMetrics.length > 0 && (
                  <span className="ml-2 rounded-sm bg-[#F3F3F3] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#787E89]">
                    {workflowMetrics.length} tracked
                  </span>
                )}
              </summary>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
                Name the workflows your client uses and how many times each ran
                this period. Use counts, not percentages - these become the
                feature usage evidence in the deck.
              </p>
              <div className="mt-3 space-y-2">
                {workflowMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_120px_36px] items-center gap-2"
                  >
                    <Input
                      value={metric.label}
                      disabled={workflowBusy}
                      placeholder="Workflow name, e.g. Inspections"
                      onChange={(event) =>
                        updateWorkflowMetric(index, {
                          label: event.target.value
                        })
                      }
                    />
                    <Input
                      value={metric.count}
                      inputMode="numeric"
                      disabled={workflowBusy}
                      placeholder="Count"
                      onChange={(event) =>
                        updateWorkflowMetric(index, {
                          count: event.target.value
                        })
                      }
                    />
                    <button
                      type="button"
                      disabled={workflowBusy}
                      aria-label={`Remove ${metric.label || "workflow metric"}`}
                      className="grid h-9 w-9 place-items-center rounded-md text-[#787E89] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal disabled:opacity-50"
                      onClick={() =>
                        onWorkflowMetricsChange(
                          workflowMetrics.filter(
                            (_, metricIndex) => metricIndex !== index
                          )
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {workflowMetrics.length < MAX_WORKFLOW_METRICS && (
                  <Button
                    variant="secondary"
                    className="h-9 px-3"
                    disabled={workflowBusy}
                    onClick={() =>
                      onWorkflowMetricsChange([
                        ...workflowMetrics,
                        { label: "", count: "" }
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add workflow
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SnapshotInput
                  label="Top Workflow"
                  value={businessSnapshot.top_feature}
                  disabled={workflowBusy}
                  placeholder="Strongest workflow this period"
                  onChange={update("top_feature")}
                />
                <SnapshotInput
                  label="Focus Workflow"
                  value={businessSnapshot.lowest_feature}
                  disabled={workflowBusy}
                  placeholder="Workflow that needs attention"
                  onChange={update("lowest_feature")}
                />
              </div>
            </details>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Risks and actions
              </summary>

              {(actionPresets.risks.length > 0 ||
                actionPresets.recommendations.length > 0) && (
                <div className="mt-3 space-y-3">
                  {actionPresets.risks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                        Risk quick picks
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {actionPresets.risks.map((preset) => {
                          const applied =
                            businessSnapshot.risk_summary.trim() === preset;

                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={workflowBusy || applied}
                              title={preset}
                              onClick={() => update("risk_summary")(preset)}
                              className={`max-w-full truncate rounded-sm px-2 py-1 text-left text-[11px] font-semibold transition ${
                                applied
                                  ? "bg-brand-orange text-white"
                                  : "bg-[#F3F3F3] text-brand-ink hover:bg-[#FFF1E8] hover:text-[#6B2A00]"
                              } disabled:cursor-default`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {actionPresets.recommendations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                        Recommendation quick picks
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {actionPresets.recommendations.map((preset) => {
                          const slots: BusinessSnapshotTextField[] = [
                            "recommendation_1",
                            "recommendation_2",
                            "recommendation_3"
                          ];
                          const applied = slots.some(
                            (slot) =>
                              String(businessSnapshot[slot]).trim() === preset
                          );
                          const openSlot = slots.find(
                            (slot) => !String(businessSnapshot[slot]).trim()
                          );

                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={workflowBusy || applied || !openSlot}
                              title={
                                applied
                                  ? preset
                                  : openSlot
                                    ? preset
                                    : "All three recommendation slots are filled."
                              }
                              onClick={() => {
                                if (openSlot) {
                                  update(openSlot)(preset);
                                }
                              }}
                              className={`max-w-full truncate rounded-sm px-2 py-1 text-left text-[11px] font-semibold transition ${
                                applied
                                  ? "bg-brand-orange text-white"
                                  : "bg-[#F3F3F3] text-brand-ink hover:bg-[#FFF1E8] hover:text-[#6B2A00]"
                              } disabled:cursor-default ${
                                !applied && !openSlot ? "opacity-50" : ""
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              {kpiSummary
                ? kpiSummary.client
                : internal
                  ? "Add team details"
                  : "Add account details"}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
              {kpiSummary
                ? [
                    kpiSummary.period,
                    kpiSummary.activeUsers === undefined
                      ? undefined
                      : kpiSummary.licensedUsers === undefined
                        ? `${kpiSummary.activeUsers} active users`
                        : `${kpiSummary.activeUsers}/${kpiSummary.licensedUsers} users`,
                    kpiSummary.adoptionScore === undefined
                      ? "adoption score needed"
                      : `${kpiSummary.adoptionScore}% score`
                  ]
                    .filter(Boolean)
                    .join(" | ")
                : `${internal ? "Who the deck is for" : "Client"}, period, active users, and adoption score are needed for scorecard-style adoption reports.`}
            </p>
            <div className="mt-4 space-y-2 border-t border-[#E5E0DB] pt-3 text-xs font-semibold leading-5 text-[#787E89]">
              <p>
                {internal
                  ? "Audience profiles and source notes can enrich the plan."
                  : "Client profiles and source notes can enrich the plan."}
              </p>
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
