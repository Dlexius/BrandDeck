"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export const GENERATION_STAGES = [
  "Reading your brief",
  "Analyzing the selected context",
  "Planning the slide sequence",
  "Writing grounded slide copy",
  "Checking brand fit and accuracy",
  "Running the final brand review"
];

export function GenerationProgress() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((value) =>
        Math.min(value + 1, GENERATION_STAGES.length - 1)
      );
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="workflow-step-panel rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
        <p
          key={stageIndex}
          className="workflow-soft-raise text-sm font-semibold text-brand-ink"
        >
          {GENERATION_STAGES[stageIndex]}…
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#F3F3F3]">
        <div
          className="h-full rounded-full bg-brand-orange transition-all duration-[7000ms] ease-linear"
          style={{
            width: `${((stageIndex + 1) / GENERATION_STAGES.length) * 100}%`
          }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-[#787E89]">
        Brand rules stay locked while the deck is planned and reviewed.
      </p>
    </div>
  );
}

export function FollowUpQuestions({
  questions,
  busy,
  onApply
}: {
  questions: string[];
  busy: boolean;
  onApply: (answers: Array<{ question: string; answer: string }>) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const answered = questions
    .map((question, index) => ({
      question,
      answer: (answers[index] ?? "").trim()
    }))
    .filter((item) => item.answer.length > 0);

  return (
    <section className="workflow-soft-raise rounded-lg border border-[#E5E0DB] bg-white">
      <header className="px-5 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
          Make It Sharper
        </h2>
        <p className="mt-1 text-sm text-[#787E89]">
          BrandDeck generated your deck, and these optional details would make
          the next pass stronger.
        </p>
      </header>
      <div className="space-y-3 px-5 py-4">
        {questions.map((question, index) => (
          <div key={index}>
            <label className="mb-1 block text-sm font-semibold text-brand-ink">
              {question}
            </label>
            <input
              type="text"
              value={answers[index] ?? ""}
              maxLength={200}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [index]: event.target.value
                }))
              }
              placeholder="Optional - answer in one line"
              className="h-10 w-full rounded-md border border-[#D7CABF] bg-white px-3 text-sm text-brand-charcoal outline-none transition-colors placeholder:text-[#B7B0A8] focus:border-brand-orange"
            />
          </div>
        ))}
      </div>
      <footer className="flex items-center justify-between border-t border-[#F0EBE6] px-5 py-3">
        <p className="text-xs font-medium text-[#787E89]">
          Answers are added to your brief; the brand system stays locked.
        </p>
        <Button
          variant="secondary"
          disabled={answered.length === 0 || busy}
          onClick={() => onApply(answered)}
        >
          <Sparkles className="h-4 w-4" />
          Add details & regenerate
        </Button>
      </footer>
    </section>
  );
}

export function WorkflowNotice({
  message,
  details,
  tone
}: {
  message: string;
  details?: string;
  tone: "info" | "error";
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`workflow-step-panel rounded-md border px-4 py-3 text-sm font-semibold ${
        isError
          ? "border-[#F4C2A8] bg-[#FFF7F2] text-brand-charcoal"
          : "border-[#D7CABF] bg-white text-brand-ink"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isError ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1E8E3E]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="leading-6">{message}</p>
          {details ? (
            <>
              <button
                type="button"
                onClick={() => setShowDetails((value) => !value)}
                className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#787E89] transition-colors hover:text-brand-charcoal"
              >
                {showDetails ? "Hide details" : "Show details"}
              </button>
              {showDetails ? (
                <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-sm bg-white/70 p-2 text-xs font-medium leading-5 text-[#787E89]">
                  {details}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
