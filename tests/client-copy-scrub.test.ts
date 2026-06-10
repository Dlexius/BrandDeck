import { describe, expect, it } from "vitest";
import brandContractData from "@/data/brand-contract.json";
import type { BrandContract, DeckPlan } from "@/lib/deck-plan-schema";
import { scrubStrayForeignScript } from "@/lib/openaiDeckPlanner";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

const brandContract = brandContractData as unknown as BrandContract;

describe("stray foreign-script scrubbing", () => {
  it("removes sparse fragments from otherwise-English copy", () => {
    expect(
      scrubStrayForeignScript("Executive adoption update | June 2026 ほか")
    ).toBe("Executive adoption update | June 2026");
    expect(scrubStrayForeignScript("Momentum ほか is strong")).toBe(
      "Momentum is strong"
    );
  });

  it("keeps mostly-foreign copy untouched for the validator to judge", () => {
    const japanese = "導入状況の四半期レビュー";
    expect(scrubStrayForeignScript(japanese)).toBe(japanese);
  });

  it("keeps plain English and emphasis markers untouched", () => {
    const statement = "Keep momentum working as *a system, not a one-time push*.";
    expect(scrubStrayForeignScript(statement)).toBe(statement);
  });
});

describe("client copy validation of foreign-script junk", () => {
  it("fails closed when stray script survives into client copy", () => {
    const plan: DeckPlan = {
      deck_type: "client_adoption_report",
      audience: "Customer executives",
      client_name: "Harborview Civil Partners",
      report_period: "June 2026",
      slides: [
        {
          layout_id: "title_client_report",
          title: "Client Adoption Report",
          fields: {
            client_name: "Harborview Civil Partners",
            report_period: "June 2026",
            subtitle: "Executive adoption update ほか"
          }
        }
      ]
    };

    const report = validateDeckPlan(plan, brandContract);
    const copyCheck = report.checks.find(
      (check) => check.label === "Client copy boundary"
    );

    expect(copyCheck?.passed).toBe(false);
  });
});
