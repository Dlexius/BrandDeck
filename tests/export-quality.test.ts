import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import brandContractData from "@/data/brand-contract.json";
import { auditDeckAccuracy } from "@/lib/auditDeckAccuracy";
import { auditDeckFit } from "@/lib/auditDeckFit";
import { chunkDeckPlanContent } from "@/lib/deck-content-chunker";
import {
  buildContextPackFromInputs,
  contextPackHasAdoptionMetrics
} from "@/lib/context-pack-schema";
import type {
  BrandContract,
  DeckPlan,
  SourceDocument
} from "@/lib/deck-plan-schema";
import { approvedDeckRecipes } from "@/lib/deck-recipes";
import { generateDeckPlan, type AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { auditPptxPackage } from "@/lib/pptx-package-audit";
import { renderPptx } from "@/lib/renderPptx";
import { validateDeckPlan } from "@/lib/validateDeckPlan";
import { parseBusinessMetricRows } from "@/lib/metric-snapshot-adapter";

const brandContract = brandContractData as unknown as BrandContract;
const qualityPrompt =
  "Create a high-quality executive adoption report using the loaded client data. Emphasize usage growth, workflow gaps, risk, and the next 90 days.";
const productUpdateSource = [
  "Risk: Teams may miss value if rollout owners do not map releases to the tools already deployed.",
  "Action: Review rollout owners with product champions before the customer enablement session.",
  "Solution Area: Platform|Tool: 360 Reporting|Launch Type: Beta|Region: All Regions Asset Management Data Now in 360 Reporting What: ● Integrates asset management data directly into reporting for centralized analysis. ● Adds asset identity, type, trade, status, location, and document fields for portfolio visibility. Why: ● Helps teams track asset inventory and operational footprint. ● Reduces manual tracking and improves equipment planning.",
  "Solution Area: Platform|Tool: Insights|Launch Type: Beta|Region: All Regions Quality Issue Predictions Insight What: ● Surfaces predicted quality issues by analyzing historical organization data and regional patterns. ● Links users to related quality data and reports in context. Why: ● Helps teams shift from reactive issue tracking to proactive quality planning. ● Gives leaders context for likely risk themes before project kickoff.",
  "Solution Area: Financial Management|Tool: Budget|Launch Type: Beta|Region: All Regions Enhanced Budget Table: Flexible Forecast Panel What: ● Lets users dock the forecast panel at the bottom or side of the screen. ● Adds a view-level configuration button for variance and budget displays. Why: ● Gives teams more control over workspace layout and forecast visibility. ● Reduces manual table adjustment for complex project financials.",
  "Solution Area: Financial Management|Tool: Change Orders|Launch Type: Beta|Region: All Regions Bulk Action: Create Change Orders Faster What: ● Adds a bulk action to create a Prime Change Order and Budget Change in one workflow. ● Includes a confirmation step for selected line items. Why: ● Reduces duplicate data entry across revenue and cost workflows. ● Keeps Prime Contract and Budget changes aligned.",
  "Solution Area: Preconstruction|Tool: Documents|Launch Type: GA|Region: All Regions Seamless Document and Version Navigation What: ● Adds previous and next arrows in the document viewer. ● Adds type-ahead search to quickly open related documents. Why: ● Reduces clicks during document review. ● Makes current-versus-prior version checks easier for project teams.",
  "Solution Area: Preconstruction|Tool: Document Management|Launch Type: GA|Region: ANZ, UKI Prevent Outdated Document Revisions in Workflows What: ● Blocks new document revisions from entering workflow when an older revision is active. ● Detects conflicts during single and bulk submissions. Why: ● Keeps reviewers focused on current revisions. ● Improves control and confidence in document workflows.",
  "Solution Area: Project Execution|Tool: Daily Log|Launch Type: GA|Region: All Regions Bulk Delete in Daily Log What: ● Adds bulk delete to the Daily Log web bulk actions panel. ● Lets users select multiple log entries and remove them together. Why: ● Reduces administrative cleanup for high-volume job sites. ● Saves time during daily log management.",
  "Solution Area: Project Execution|Tool: Submittals|Launch Type: Beta|Region: All Regions Streamline Submittals with Dynamic Submittal Plan What: ● Adds automated date calculations for submit-by, open-by, and workflow due dates. ● Links submittals to schedule activities for better procurement timing. Why: ● Replaces external spreadsheet calculations. ● Flags at-risk submittals before they affect the critical path.",
  "Solution Area: Resource Management|Tool: Resource Planning|Launch Type: Beta|Region: APAC, NAMER, UKI Resource View Now Available in Gantt What: ● Adds a resource view in the Gantt chart. ● Shows assignments and open requests for labor and equipment resources. Why: ● Helps teams make informed workforce and equipment allocation decisions. ● Reduces scheduling conflicts."
].join(" ");

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

  if (result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message).join("; "));
  }

  return result.data;
}

function generateFixtureDeck(recipeId = "client_adoption_report") {
  return generateDeckPlan(qualityPrompt, loadFixtureRows(), brandContract, {
    recipeId
  });
}

function expectValidAndAccurate(
  deckPlan: DeckPlan,
  sourceDocuments: SourceDocument[] = []
) {
  const validation = validateDeckPlan(deckPlan, brandContract);
  const accuracy = auditDeckAccuracy({
    deckPlan,
    parsedCsvData: loadFixtureRows(),
    sourceDocuments
  });

  expect(validation.passed, validation.checks.filter((check) => !check.passed).map((check) => check.detail).join("\n")).toBe(true);
  expect(accuracy.passed, accuracy.checks.filter((check) => !check.passed).map((check) => check.detail).join("\n")).toBe(true);
}

function expectValidAccurateAndFit(
  deckPlan: DeckPlan,
  sourceDocuments: SourceDocument[] = [],
  contextPack?: ReturnType<typeof buildContextPackFromInputs>
) {
  const validation = validateDeckPlan(deckPlan, brandContract);
  const accuracy = auditDeckAccuracy({
    deckPlan,
    parsedCsvData: contextPack ? [] : loadFixtureRows(),
    sourceDocuments,
    contextPack
  });
  const fit = auditDeckFit({ deckPlan, brandContract });

  expect(validation.passed, validation.checks.filter((check) => !check.passed).map((check) => check.detail).join("\n")).toBe(true);
  expect(accuracy.passed, accuracy.checks.filter((check) => !check.passed).map((check) => check.detail).join("\n")).toBe(true);
  expect(fit.passed, fit.checks.filter((check) => !check.passed).map((check) => check.detail).join("\n")).toBe(true);
}

describe("export quality gates", () => {
  it("keeps every brand-contract asset available for export", () => {
    const assets = brandContract.template_assets;

    if (!assets) {
      throw new Error("Expected template assets in the brand contract.");
    }

    const assetPaths = [
      assets.wordmark_black,
      assets.wordmark_white,
      assets.hero_photo,
      assets.texture_title,
      assets.texture_agenda,
      ...Object.values(assets.icons)
    ].filter((assetPath): assetPath is string => Boolean(assetPath));

    expect(assetPaths.length).toBeGreaterThanOrEqual(10);

    for (const assetPath of assetPaths) {
      const absolutePath = path.join(process.cwd(), "public", assetPath);
      const stats = fs.statSync(absolutePath);

      expect(stats.size, assetPath).toBeGreaterThan(0);
    }
  });

  it("generates valid, data-accurate plans for every approved deck recipe", () => {
    for (const recipe of approvedDeckRecipes) {
      const deckPlan = generateFixtureDeck(recipe.recipe_id);

      expect(deckPlan.deck_recipe_id).toBe(recipe.recipe_id);
      expect(deckPlan.slides.length).toBeGreaterThanOrEqual(
        recipe.slide_sequence.length
      );
      expectValidAndAccurate(deckPlan);
    }
  });

  it("expands product update decks from release context without leaving approved layouts", () => {
    const sourceDocuments = [
      {
        id: "may-product-updates",
        name: "May 2026 Product Updates",
        type: "presentation" as const,
        text: productUpdateSource
      }
    ];
    const deckPlan = generateDeckPlan(
      "Create a 45 minute product update deck for this client. Use the product update source context, group updates by solution area, and make it more than 10 slides when the context supports it.",
      loadFixtureRows(),
      brandContract,
      {
        recipeId: "product_update_deck",
        sourceDocuments
      }
    );

    expect(deckPlan.deck_recipe_id).toBe("product_update_deck");
    expect(deckPlan.slides.length).toBeGreaterThan(10);
    expect(
      deckPlan.slides.some(
        (slide) => slide.title === "Enhanced Budget Table: Flexible Forecast Panel"
      )
    ).toBe(true);
    expect(
      deckPlan.slides.some((slide) => slide.title === "Project Execution")
    ).toBe(true);
    expectValidAndAccurate(deckPlan, sourceDocuments);
  });

  it("builds a context pack from profile, metrics, and source documents", () => {
    const sourceDocuments = [
      {
        id: "source-notes",
        name: "Client Notes",
        type: "notes" as const,
        text: "Risk: Budget owners need clearer enablement. Action: run a targeted product review."
      }
    ];
    const contextPack = buildContextPackFromInputs({
      clientProfile: {
        id: "summit",
        name: "Summit Ridge Constructors",
        segment: "Commercial GC",
        stage: "Renewal planning",
        ownedTools: ["Budget", "Commitments", "Analytics"],
        businessGoals: ["Improve project-controls visibility"],
        risks: ["Budget workflows lag behind field adoption."],
        stakeholders: ["Executive sponsor"]
      },
      csvRows: loadFixtureRows(),
      sourceDocuments
    });

    expect(contextPack.clientProfile?.ownedTools).toContain("Budget");
    expect(contextPack.metricSnapshots.length).toBeGreaterThan(0);
    expect(contextPack.sourceDocuments).toHaveLength(1);
    expect(contextPackHasAdoptionMetrics(contextPack)).toBe(true);
  });

  it("generates source-only product update decks without fake adoption metrics", () => {
    const sourceDocuments = [
      {
        id: "may-product-updates",
        name: "May 2026 Product Updates",
        type: "presentation" as const,
        text: productUpdateSource
      }
    ];
    const contextPack = buildContextPackFromInputs({
      clientProfile: {
        id: "summit",
        name: "Summit Ridge Constructors",
        segment: "Commercial general contractor",
        stage: "Renewal planning",
        ownedTools: ["Budget", "Commitments", "Analytics"],
        businessGoals: ["Tie product updates to project-controls outcomes."],
        risks: ["Budget workflows need clearer rollout owners."],
        stakeholders: []
      },
      sourceDocuments
    });
    const deckPlan = generateDeckPlan(
      "Create a 60-minute product update release review for this client. Prioritize Budget, Commitments, and Analytics updates.",
      [],
      brandContract,
      {
        recipeId: "product_update_deck",
        sourceDocuments,
        contextPack
      }
    );
    const budgetSlideIndex = deckPlan.slides.findIndex((slide) =>
      /budget/i.test(slide.title)
    );
    const dailyLogSlideIndex = deckPlan.slides.findIndex((slide) =>
      /daily log/i.test(slide.title)
    );

    expect(deckPlan.slides.length).toBeGreaterThan(10);
    expect(deckPlan.slides.some((slide) => slide.layout_id === "adoption_kpi_scorecard")).toBe(false);
    expect(budgetSlideIndex).toBeGreaterThanOrEqual(0);
    expect(dailyLogSlideIndex === -1 || budgetSlideIndex < dailyLogSlideIndex).toBe(true);
    expectValidAccurateAndFit(deckPlan, sourceDocuments, contextPack);
  });

  it("generates source-only ad hoc briefs without requiring CSV rows", () => {
    const sourceDocuments = [
      {
        id: "meeting-brief",
        name: "Meeting Brief",
        type: "brief" as const,
        text: "Risk: regional leaders need a concise rollout narrative. Action: align owners before the steering committee."
      }
    ];
    const contextPack = buildContextPackFromInputs({
      clientProfile: {
        id: "northstar",
        name: "Northstar Utilities Group",
        segment: "Energy and utilities",
        stage: "New product rollout",
        ownedTools: ["Inspections", "Forms", "Analytics"],
        businessGoals: ["Prepare leadership for a rollout decision."],
        risks: ["Inspection owners need role clarity."],
        stakeholders: []
      },
      sourceDocuments
    });
    const deckPlan = generateDeckPlan(
      "Create an ad hoc leadership brief from the source context.",
      [],
      brandContract,
      {
        recipeId: "ad_hoc_brand_safe_deck",
        sourceDocuments,
        contextPack
      }
    );

    expect(deckPlan.slides.some((slide) => slide.layout_id === "adoption_kpi_scorecard")).toBe(false);
    expect(deckPlan.slides.some((slide) => slide.layout_id === "usage_trend")).toBe(false);
    expectValidAccurateAndFit(deckPlan, sourceDocuments, contextPack);
  });

  it("chunks over-capacity arrays before fit approval", () => {
    const deckPlan = generateFixtureDeck();
    const agenda = deckPlan.slides.find((slide) => slide.layout_id === "agenda");

    if (!agenda) {
      throw new Error("Expected agenda slide.");
    }

    agenda.fields.agenda_items = [
      "Executive context",
      "Adoption health",
      "Workflow signals",
      "Risk review",
      "Recommendation detail",
      "Next-quarter plan",
      "Source evidence",
      "Metric appendix"
    ];

    const rawFit = auditDeckFit({ deckPlan, brandContract });
    const chunkedPlan = chunkDeckPlanContent(deckPlan);
    const chunkedFit = auditDeckFit({ deckPlan: chunkedPlan, brandContract });

    expect(rawFit.passed).toBe(false);
    expect(chunkedPlan.slides.filter((slide) => slide.layout_id === "agenda").length).toBeGreaterThan(1);
    expect(chunkedFit.passed, chunkedFit.checks.filter((check) => !check.passed).map((check) => check.detail).join("\n")).toBe(true);
  });

  it("parses BI-style metric exports into business metric snapshots", () => {
    const snapshots = parseBusinessMetricRows(
      [
        {
          client_name: "Summit Ridge Constructors",
          period: "Q2 2026",
          Budget: "42",
          Commitments: "38",
          Analytics: "19"
        }
      ],
      {
        source: "BI export",
        category: "product_usage"
      }
    );

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].metrics.map((metric) => metric.key)).toContain("budget");
    expect(snapshots[0].metrics.find((metric) => metric.key === "commitments")?.value).toBe(38);
  });

  it("renders a no-template PPTX with embedded brand media and a clean package audit", async () => {
    const deckPlan = generateFixtureDeck();
    const buffer = await renderPptx(deckPlan, brandContract);
    const zip = await JSZip.loadAsync(buffer);
    const mediaEntries = Object.keys(zip.files).filter((entry) =>
      entry.startsWith("ppt/media/")
    );
    const audit = await auditPptxPackage(buffer, deckPlan.slides.length);

    expect(buffer.byteLength).toBeGreaterThan(750000);
    expect(mediaEntries.length).toBeGreaterThanOrEqual(8);
    expect(audit.passed, JSON.stringify(audit, null, 2)).toBe(true);
  });

  it("rejects internal copy before export", () => {
    const deckPlan = generateFixtureDeck();
    deckPlan.slides[0].fields.subtitle =
      "Generated by BrandDeck using an OpenAI API model.";

    const validation = validateDeckPlan(deckPlan, brandContract);

    expect(validation.passed).toBe(false);
    expect(
      validation.checks.some(
        (check) => !check.passed && check.label === "Client copy boundary"
      )
    ).toBe(true);
  });

  it("catches placeholder leftovers in PPTX package audits", async () => {
    const deckPlan = generateFixtureDeck();
    const buffer = await renderPptx(deckPlan, brandContract);
    const zip = await JSZip.loadAsync(buffer);
    const slideOne = await zip.file("ppt/slides/slide1.xml")?.async("string");

    if (!slideOne) {
      throw new Error("Expected slide1.xml in rendered PPTX.");
    }

    zip.file("ppt/slides/slide1.xml", `${slideOne}\n<!-- Click to add -->`);

    const contaminatedBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const audit = await auditPptxPackage(
      contaminatedBuffer,
      deckPlan.slides.length
    );

    expect(audit.passed).toBe(false);
    expect(audit.forbiddenPlaceholderHitCount).toBeGreaterThan(0);
  });
});
