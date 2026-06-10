import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import brandContractData from "@/data/brand-contract.json";
import { auditDeckFit } from "@/lib/auditDeckFit";
import { chunkDeckPlanContent } from "@/lib/deck-content-chunker";
import type {
  ActionPlanItem,
  BrandContract,
  DeckPlan
} from "@/lib/deck-plan-schema";
import { generateDeckPlan, type AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { renderPptx } from "@/lib/renderPptx";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

const brandContract = brandContractData as unknown as BrandContract;

function loadFixtureRows() {
  const csv = fs.readFileSync(
    path.join(process.cwd(), "data", "branddeck-test-client-adoption.csv"),
    "utf8"
  );
  const result = Papa.parse<AdoptionCsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });

  return result.data;
}

function expectValid(deckPlan: DeckPlan) {
  const validation = validateDeckPlan(deckPlan, brandContract);
  const fit = auditDeckFit({ deckPlan, brandContract });

  expect(
    validation.passed,
    validation.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.slideTitle}: ${check.detail}`)
      .join("\n")
  ).toBe(true);
  expect(
    fit.passed,
    fit.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.slideTitle}: ${check.detail}`)
      .join("\n")
  ).toBe(true);
}

describe("action_plan_table layout", () => {
  it("appears in the risk remediation baseline with grounded rows", () => {
    const deckPlan = generateDeckPlan(
      "Build a risk remediation plan for the client.",
      loadFixtureRows(),
      brandContract,
      { recipeId: "risk_remediation_plan" }
    );
    const actionSlide = deckPlan.slides.find(
      (slide) => slide.layout_id === "action_plan_table"
    );

    expect(actionSlide, "risk plan should include an action plan table").toBeDefined();
    const items = actionSlide?.fields.action_items as ActionPlanItem[];
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(5);

    for (const item of items) {
      expect(item.action.length).toBeGreaterThan(0);
      expect(item.owner.length).toBeGreaterThan(0);
      expect(item.timing.length).toBeGreaterThan(0);
      expect(["on_track", "at_risk", "needs_owner", "complete"]).toContain(
        item.status
      );
    }

    expectValid(deckPlan);
  });

  it("appears in the QBR baseline and validates", () => {
    const deckPlan = generateDeckPlan(
      "Prepare the quarterly business review.",
      loadFixtureRows(),
      brandContract,
      { recipeId: "quarterly_business_review" }
    );

    expect(
      deckPlan.slides.some((slide) => slide.layout_id === "action_plan_table")
    ).toBe(true);
    expectValid(deckPlan);
  });

  it("chunks oversized action tables into continuation slides", () => {
    const items: ActionPlanItem[] = Array.from({ length: 8 }, (_, index) => ({
      action: `Confirm rollout step ${index + 1} with the project team.`,
      owner: "Customer success lead",
      timing: "30 days",
      status: "on_track"
    }));
    const plan: DeckPlan = {
      deck_type: "risk_remediation_plan",
      audience: "Customer success leaders",
      client_name: "Harborview Civil Partners",
      report_period: "June 2026",
      slides: [
        {
          layout_id: "action_plan_table",
          title: "30-60-90 Day Action Plan",
          fields: {
            deck_label: "RISK PLAN",
            action_items: items
          }
        }
      ]
    };

    const chunked = chunkDeckPlanContent(plan);
    const actionSlides = chunked.slides.filter(
      (slide) => slide.layout_id === "action_plan_table"
    );

    expect(actionSlides).toHaveLength(2);
    expect(
      (actionSlides[0].fields.action_items as ActionPlanItem[]).length
    ).toBe(5);
    expect(
      (actionSlides[1].fields.action_items as ActionPlanItem[]).length
    ).toBe(3);
    expect(actionSlides[1].title).toContain("Continued");
    expectValid(chunked);
  });
});

describe("photo_section_divider layout", () => {
  it("appears in the QBR baseline with a section label", () => {
    const deckPlan = generateDeckPlan(
      "Prepare the quarterly business review.",
      loadFixtureRows(),
      brandContract,
      { recipeId: "quarterly_business_review" }
    );
    const divider = deckPlan.slides.find(
      (slide) => slide.layout_id === "photo_section_divider"
    );

    expect(divider, "QBR should include a photo section divider").toBeDefined();
    expect(String(divider?.fields.section_label ?? "").length).toBeGreaterThan(0);
    expect(String(divider?.fields.section_label ?? "").length).toBeLessThanOrEqual(40);
  });

  it("divides product update decks by solution area", () => {
    const productUpdateSource = [
      "Solution Area: Project Execution|Tool: Daily Log|Launch Type: GA|Region: All Regions Bulk Delete in Daily Log What: ● Adds bulk delete to the Daily Log web bulk actions panel. Why: ● Reduces administrative cleanup for high-volume job sites.",
      "Solution Area: Financial Management|Tool: Budget|Launch Type: Beta|Region: All Regions Enhanced Budget Table What: ● Lets users dock the forecast panel at the bottom or side of the screen. Why: ● Gives teams more control over workspace layout."
    ].join(" ");
    const deckPlan = generateDeckPlan(
      "Build a product update deck for this client.",
      loadFixtureRows(),
      brandContract,
      {
        recipeId: "product_update_deck",
        sourceDocuments: [
          {
            id: "release-notes",
            name: "Release notes",
            type: "document",
            text: productUpdateSource
          }
        ]
      }
    );
    const dividers = deckPlan.slides.filter(
      (slide) => slide.layout_id === "photo_section_divider"
    );

    expect(dividers.length).toBeGreaterThanOrEqual(1);
    expectValid(deckPlan);
  });
});

describe("rendering the new layouts", () => {
  it("renders a deck containing both new layouts into a valid PPTX package", async () => {
    const deckPlan = generateDeckPlan(
      "Prepare the quarterly business review.",
      loadFixtureRows(),
      brandContract,
      { recipeId: "quarterly_business_review" }
    );

    expect(
      deckPlan.slides.some((slide) => slide.layout_id === "action_plan_table")
    ).toBe(true);
    expect(
      deckPlan.slides.some(
        (slide) => slide.layout_id === "photo_section_divider"
      )
    ).toBe(true);

    const buffer = await renderPptx(deckPlan, brandContract);
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );

    expect(slideFiles.length).toBe(deckPlan.slides.length);

    // The status chips must use approved tokens only (spot-check at_risk orange).
    const slideXml = await Promise.all(
      slideFiles.map((name) => zip.file(name)!.async("string"))
    );
    const allXml = slideXml.join(" ");
    expect(allXml).toContain("FF5200");
  });

  it("ships presenter speaker notes inside the PPTX package", async () => {
    const deckPlan = generateDeckPlan(
      "Prepare the quarterly business review.",
      loadFixtureRows(),
      brandContract,
      { recipeId: "quarterly_business_review" }
    );
    const slidesWithNotes = deckPlan.slides.filter(
      (slide) => slide.speaker_notes
    );

    expect(slidesWithNotes.length).toBeGreaterThanOrEqual(8);

    const buffer = await renderPptx(deckPlan, brandContract);
    const zip = await JSZip.loadAsync(buffer);
    const noteFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/notesSlides/notesSlide") && name.endsWith(".xml")
    );

    expect(noteFiles.length).toBeGreaterThanOrEqual(slidesWithNotes.length);

    const notesXml = await Promise.all(
      noteFiles.map((name) => zip.file(name)!.async("string"))
    );
    expect(
      notesXml.some((xml) => xml.includes("row by row"))
    ).toBe(true);
  });
});
