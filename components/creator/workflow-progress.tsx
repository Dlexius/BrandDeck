"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { CreatorWorkflowStep } from "@/lib/ui-types";
import { CheckCircle2, FileArchive, FileCheck2, FileText } from "lucide-react";

export const CREATOR_WORKFLOW_STEPS: Array<{
  id: CreatorWorkflowStep;
  title: string;
  detail: string;
}> = [
  {
    id: "brief",
    title: "Describe",
    detail: "Prompt and deck type"
  },
  {
    id: "context",
    title: "Add Context",
    detail: "Metrics and sources"
  },
  {
    id: "export",
    title: "Generate",
    detail: "Review and export"
  }
];

export function CreatorWorkflowProgress({
  activeStep,
  onStepChange,
  promptReady,
  dataReady,
  deckReady
}: {
  activeStep: CreatorWorkflowStep;
  onStepChange: (step: CreatorWorkflowStep) => void;
  promptReady: boolean;
  dataReady: boolean;
  deckReady: boolean;
}) {
  const activeIndex = CREATOR_WORKFLOW_STEPS.findIndex(
    (step) => step.id === activeStep
  );
  const completionByStep: Record<CreatorWorkflowStep, boolean> = {
    brief: promptReady,
    context: dataReady,
    export: deckReady
  };
  const progressWidth = `${((activeIndex + 1) / CREATOR_WORKFLOW_STEPS.length) * 100}%`;

  function stepIcon(step: CreatorWorkflowStep) {
    if (step === "brief") {
      return <FileText className="h-4 w-4" />;
    }

    if (step === "context") {
      return <FileArchive className="h-4 w-4" />;
    }

    return <FileCheck2 className="h-4 w-4" />;
  }

  return (
    <Card className="workflow-soft-raise overflow-hidden">
      <CardContent className="space-y-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F3F3]">
          <div
            className="h-full rounded-full bg-brand-orange transition-[width] duration-500 ease-out"
            style={{ width: progressWidth }}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {CREATOR_WORKFLOW_STEPS.map((step, index) => {
            const isActive = step.id === activeStep;
            const isComplete = completionByStep[step.id];
            const isLocked =
              (step.id === "context" && !promptReady) ||
              (step.id === "export" && !dataReady);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                disabled={isLocked}
                className={`group rounded-md border px-3 py-3 text-left transition duration-300 disabled:cursor-not-allowed disabled:opacity-55 ${
                  isActive
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-md transition duration-300 ${
                      isActive
                        ? "bg-brand-orange text-white"
                        : isComplete
                          ? "bg-[#ECF7EF] text-[#188038]"
                          : "bg-[#F3F3F3] text-brand-ink"
                    }`}
                  >
                    {isComplete && !isActive ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      stepIcon(step.id)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-[#787E89]">
                      Step {index + 1}
                    </span>
                    <span className="mt-1 block text-sm font-black text-brand-charcoal">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#787E89]">
                      {step.detail}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
