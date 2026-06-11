import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { linesForDataBinding } from "@/lib/cloneStarterPptx";
import type { ApprovedLayoutId, DeckSlide } from "@/lib/deck-plan-schema";
import {
  applyCreatorSlideSelection,
  MIN_SELECTED_RECIPE_SLIDES
} from "@/lib/generateDeckPlan";
import { getDeckRecipe } from "@/lib/deck-recipes";
import { LAYOUT_TEXT_FIELD_OPTIONS } from "@/lib/template-binding-catalog";
import { filterDetectedFonts } from "@/lib/template-kit-store";
import { extractTemplateTextObjects } from "@/lib/template-text-fields";

function richSampleSlide(layoutId: ApprovedLayoutId): DeckSlide {
  return {
    layout_id: layoutId,
    title: "Adoption is growing across field teams",
    fields: {
      client_name: "Harborview Construction",
      subtitle: "Quarterly adoption report",
      report_period: "Q2 2026",
      deck_label: "CLIENT REPORT",
      section_label: "ADOPTION",
      agenda_items: [
        "Adoption summary",
        "Usage trends",
        "Feature performance",
        "Risks",
        "Action plan",
        "Next steps"
      ],
      business_impact: "Field adoption gains cut rework this quarter.",
      summary_points: [
        "Active users grew 14 percent",
        "Mobile usage is now the norm",
        "Inspections lead feature growth",
        "Two regions still lag"
      ],
      metric_context: "Counts cover all licensed field teams.",
      adoption_score: 76,
      active_users: 244,
      licensed_users: 300,
      mobile_usage_rate: 61,
      projects_active: 18,
      top_feature: "Inspections",
      lowest_feature: "Forms",
      trend_summary: "Adoption climbed steadily across the quarter.",
      trend_points: [
        { label: "Apr", adoption_score: 64, active_users: 190 },
        { label: "May", adoption_score: 70, active_users: 215 },
        { label: "Jun", adoption_score: 76, active_users: 244 }
      ],
      feature_metrics: [
        { feature: "Inspections", count: 412 },
        { feature: "Daily Logs", count: 318 },
        { feature: "Forms", count: 120 }
      ],
      risk_summary: "Two regions have not adopted standard forms.",
      recommendations: [
        "Standardize the closeout form set",
        "Schedule regional refresher training"
      ],
      note: "Owners confirmed in the steering meeting.",
      steps: [
        "Confirm regional rollout owners",
        "Publish the closeout form set",
        "Review adoption again in 30 days"
      ]
    }
  };
}

describe("text field mapping catalog", () => {
  it("only offers fields the template renderer resolves with content", () => {
    for (const [layoutId, fields] of Object.entries(LAYOUT_TEXT_FIELD_OPTIONS)) {
      const slide = richSampleSlide(layoutId as ApprovedLayoutId);

      for (const field of fields) {
        const lines = linesForDataBinding(
          {
            layoutId: layoutId as ApprovedLayoutId,
            sourceSlide: 1,
            objectId: "100",
            objectType: field.objectType,
            role: field.label,
            dataBinding: field.dataBinding,
            required: field.core
          },
          slide,
          2
        );

        expect(
          lines.length,
          `${layoutId} → ${field.dataBinding} must resolve in the renderer`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every approved layout mappable through the walkthrough", () => {
    for (const fields of Object.values(LAYOUT_TEXT_FIELD_OPTIONS)) {
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((field) => field.core)).toBe(true);
    }
  });

  it("uses plain-language labels without internal jargon", () => {
    const forbidden = /renderer|binding|object map|frame map|drift/i;

    for (const fields of Object.values(LAYOUT_TEXT_FIELD_OPTIONS)) {
      for (const field of fields) {
        expect(forbidden.test(field.label)).toBe(false);
        expect(forbidden.test(field.hint)).toBe(false);
      }
    }
  });
});

describe("bundled creator content stays client-safe", () => {
  // Quick picks and preview notebook sources land in client-visible slides
  // and planner evidence; they must never carry internal or system language.
  const forbidden =
    /\b(ai|openai|gpt|llm|model|prompt|renderer|placeholder|template kit|object map|frame map|drift|api)\b/i;

  it("keeps built-in risk and action quick picks jargon-free", async () => {
    const { BUILT_IN_ACTION_PRESETS } = await import("@/lib/ui-constants");

    for (const preset of [
      ...BUILT_IN_ACTION_PRESETS.risks,
      ...BUILT_IN_ACTION_PRESETS.recommendations
    ]) {
      expect(forbidden.test(preset), preset).toBe(false);
      expect(preset.length).toBeLessThanOrEqual(220);
    }
  });

  it("keeps notebook preview sources jargon-free and clearly examples", async () => {
    const { NOTEBOOKLM_SAMPLE_SOURCES } = await import("@/lib/ui-constants");

    for (const source of NOTEBOOKLM_SAMPLE_SOURCES) {
      expect(source.name.startsWith("Example - ")).toBe(true);
      expect(forbidden.test(source.text), source.id).toBe(false);
    }
  });
});

describe("extractTemplateTextObjects", () => {
  async function buildTestPptx() {
    const zip = new JSZip();
    zip.file(
      "ppt/slides/slide1.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2401" name="Title 1"/></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Presentation title here</a:t></a:r></a:p></p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2402" name="Subtitle 2"/></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Optional eyebrow &amp; subtitle</a:t></a:r></a:p></p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2403" name="Decorative shape"/></p:nvSpPr>
    </p:sp>
    <p:graphicFrame>
      <p:nvGraphicFramePr><p:cNvPr id="2410" name="Feature table"/></p:nvGraphicFramePr>
      <a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>Feature</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic>
    </p:graphicFrame>
  </p:spTree></p:cSld>
</p:sld>`
    );
    zip.file("ppt/slides/slide2.xml", "<p:sld></p:sld>");

    return zip.generateAsync({ type: "nodebuffer" });
  }

  it("lists text boxes and tables with renderer-ready ids", async () => {
    const buffer = await buildTestPptx();
    const objects = await extractTemplateTextObjects(buffer, [1, 2, 99]);

    expect(objects[1].map((object) => object.objectId)).toEqual([
      "2401",
      "2402",
      "2410"
    ]);
    expect(objects[1][0]).toMatchObject({
      objectType: "text_box",
      objectName: "Title 1",
      textPreview: "Presentation title here"
    });
    expect(objects[1][1].textPreview).toBe("Optional eyebrow & subtitle");
    expect(objects[1][2].objectType).toBe("table_cell");
    // Shapes without a text body are not mappable text fields.
    expect(
      objects[1].some((object) => object.objectId === "2403")
    ).toBe(false);
    expect(objects[2]).toEqual([]);
    expect(objects[99]).toEqual([]);
  });
});

describe("creator slide deselection", () => {
  const recipe = getDeckRecipe("client_adoption_report")!;

  it("keeps the recipe untouched when nothing is deselected", () => {
    expect(applyCreatorSlideSelection(recipe, [])).toBe(recipe);
    expect(applyCreatorSlideSelection(recipe, undefined)).toBe(recipe);
  });

  it("removes deselected slides but never the title slide", () => {
    const target = recipe.slide_sequence.find(
      (slide) => slide.slide_role !== "title"
    )!;
    const filtered = applyCreatorSlideSelection(recipe, [
      target.slide_role,
      "title"
    ]);

    expect(
      filtered.slide_sequence.some(
        (slide) => slide.slide_role === target.slide_role
      )
    ).toBe(false);
    expect(
      filtered.slide_sequence.some((slide) => slide.slide_role === "title")
    ).toBe(true);
    expect(filtered.slide_sequence.length).toBe(
      recipe.slide_sequence.length - 1
    );
  });

  it("rejects deselections that drop the deck below the minimum", () => {
    const everythingButTitle = recipe.slide_sequence
      .filter((slide) => slide.slide_role !== "title")
      .map((slide) => slide.slide_role);

    expect(() =>
      applyCreatorSlideSelection(recipe, everythingButTitle)
    ).toThrowError(new RegExp(`at least ${MIN_SELECTED_RECIPE_SLIDES}`));
  });
});

describe("filterDetectedFonts", () => {
  it("drops system fallback fonts and theme slot references", () => {
    expect(
      filterDetectedFonts([
        "Arial",
        "Angsana New",
        "Cordia New",
        "SimSun",
        "MS PGothic",
        "+mj-lt",
        "+mn-ea",
        "Founders Grotesk"
      ])
    ).toEqual(["Arial", "Founders Grotesk"]);
  });

  it("keeps genuine brand fonts untouched", () => {
    const fonts = ["Inter", "Georgia", "Roboto Mono"];
    expect(filterDetectedFonts(fonts)).toEqual(fonts);
  });
});
