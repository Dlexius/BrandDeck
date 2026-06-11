import { describe, expect, it } from "vitest";
import {
  auditDeckAccuracy,
  safeSourceFidelityLines
} from "@/lib/auditDeckAccuracy";
import type { DeckPlan, SourceDocument } from "@/lib/deck-plan-schema";
import { repairSourceGrounding } from "@/lib/openaiDeckPlanner";

const sourceDocuments: SourceDocument[] = [
  {
    id: "client_profile_context",
    name: "Client profile",
    type: "brief",
    text: "Client profile: Harborview Civil Partners is a civil infrastructure contractor. Risk: submittal response ownership is inconsistent across project teams. Recommendation: position product update content around Submittals, Daily Logs, and Mobile workflows already deployed for the client."
  },
  {
    id: "notebook_example",
    name: "Example - Rollout Readiness Assessment",
    type: "brief",
    text: "Strengths: leadership sponsorship is confirmed and training attendance is above target. Gaps: owner assignments for escalation paths are incomplete."
  }
];

/** A plan whose copy paraphrases everything - no fidelity line survives. */
function paraphrasedDeckPlan(): DeckPlan {
  return {
    deck_type: "Executive Adoption Report",
    audience: "Executive sponsors",
    client_name: "Harborview Civil Partners",
    report_period: "June 2026",
    source_pack: {
      document_count: sourceDocuments.length,
      evidence_refs: [],
      constraints: []
    },
    slides: [
      {
        layout_id: "title_client_report",
        title: "Harborview Civil Partners",
        fields: { client_name: "Harborview Civil Partners" }
      },
      {
        layout_id: "risks_recommendations",
        title: "Where momentum needs help",
        fields: {
          risk_summary: "Some habits differ between groups.",
          recommendations: ["Keep momentum going.", "Meet again soon."]
        }
      },
      {
        layout_id: "next_steps",
        title: "What happens next",
        fields: {
          steps: ["Stay aligned.", "Check progress.", "Celebrate wins."]
        }
      }
    ]
  };
}

describe("source grounding repair", () => {
  it("extracts the same explicit lines the audit checks for", () => {
    const lines = safeSourceFidelityLines(sourceDocuments);

    expect(lines.explicitActions[0]).toMatch(/^Recommendation:/);
    expect(lines.explicitRisks[0]).toMatch(/^Risk:/);
  });

  it("restates fidelity lines so a paraphrased plan passes without model calls", () => {
    const candidate = paraphrasedDeckPlan();
    const before = auditDeckAccuracy({
      deckPlan: candidate,
      parsedCsvData: [],
      sourceDocuments
    });
    const failedIds = new Set(
      before.checks.filter((check) => !check.passed).map((check) => check.id)
    );

    expect(failedIds.has("source-grounding:action")).toBe(true);
    expect(failedIds.has("source-grounding:risk")).toBe(true);

    const repaired = repairSourceGrounding(candidate, failedIds, sourceDocuments);

    expect(repaired).not.toBeNull();

    const after = auditDeckAccuracy({
      deckPlan: repaired!,
      parsedCsvData: [],
      sourceDocuments
    });
    const grounding = after.checks.filter((check) =>
      check.id.startsWith("source-grounding")
    );

    expect(grounding.length).toBeGreaterThan(0);
    expect(grounding.every((check) => check.passed)).toBe(true);
  });

  it("respects brand layout text budgets when restating", () => {
    const candidate = paraphrasedDeckPlan();
    const repaired = repairSourceGrounding(
      candidate,
      new Set(["source-grounding:action", "source-grounding:risk"]),
      sourceDocuments
    )!;
    const stepSlide = repaired.slides.find(
      (slide) => slide.layout_id === "next_steps"
    )!;
    const riskSlide = repaired.slides.find(
      (slide) => slide.layout_id === "risks_recommendations"
    )!;
    const steps = stepSlide.fields.steps as string[];

    expect(steps[steps.length - 1].length).toBeLessThanOrEqual(140);
    expect(String(riskSlide.fields.risk_summary).length).toBeLessThanOrEqual(190);
  });

  it("does nothing when grounding checks already pass", () => {
    expect(
      repairSourceGrounding(
        paraphrasedDeckPlan(),
        new Set(["metric:active_users"]),
        sourceDocuments
      )
    ).toBeNull();
  });
});
