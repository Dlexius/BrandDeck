import {
  type BrandContract,
  type BrandLayoutDefinition,
  type DeckPlan,
  type DeckSlide
} from "@/lib/deck-plan-schema";
import { LAYOUT_ITEM_CAPACITY } from "@/lib/deck-content-chunker";

export type DeckFitCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  slideTitle?: string;
};

export type DeckFitAudit = {
  passed: boolean;
  fitScore: number;
  checks: DeckFitCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

function check(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  slideTitle?: string
): DeckFitCheck {
  return { id, label, passed, detail, slideTitle };
}

function stringifyField(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => stringifyField(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      stringifyField(item)
    );
  }

  return [];
}

function findLayout(
  brandContract: BrandContract,
  layoutId: DeckSlide["layout_id"]
): BrandLayoutDefinition | undefined {
  return brandContract.approved_layouts.find(
    (layout) => layout.layout_id === layoutId
  );
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function fieldLineEstimate(value: string, charactersPerLine: number) {
  return Math.max(1, Math.ceil(value.length / charactersPerLine));
}

function capacityChecks(slide: DeckSlide): DeckFitCheck[] {
  const checks: DeckFitCheck[] = [];

  if (slide.layout_id === "agenda") {
    const count = arrayLength(slide.fields.agenda_items);
    checks.push(
      check(
        `${slide.title}:agenda-template-minimum`,
        "Agenda template slots",
        count >= 4,
        `${count}/4 required agenda slots populated.`,
        slide.title
      )
    );
    checks.push(
      check(
        `${slide.title}:agenda-capacity`,
        "Agenda item capacity",
        count <= LAYOUT_ITEM_CAPACITY.agenda_items,
        `${count}/${LAYOUT_ITEM_CAPACITY.agenda_items} agenda items.`,
        slide.title
      )
    );
  }

  if (slide.layout_id === "executive_summary") {
    const count = arrayLength(slide.fields.summary_points);
    checks.push(
      check(
        `${slide.title}:summary-capacity`,
        "Summary point capacity",
        count <= LAYOUT_ITEM_CAPACITY.summary_points,
        `${count}/${LAYOUT_ITEM_CAPACITY.summary_points} summary points.`,
        slide.title
      )
    );
  }

  if (slide.layout_id === "risks_recommendations") {
    const count = arrayLength(slide.fields.recommendations);
    checks.push(
      check(
        `${slide.title}:recommendation-template-minimum`,
        "Recommendation template slots",
        count >= 2,
        `${count}/2 required recommendation slots populated.`,
        slide.title
      )
    );
    checks.push(
      check(
        `${slide.title}:recommendation-capacity`,
        "Recommendation card capacity",
        count <= LAYOUT_ITEM_CAPACITY.recommendations,
        `${count}/${LAYOUT_ITEM_CAPACITY.recommendations} recommendations.`,
        slide.title
      )
    );
  }

  if (slide.layout_id === "next_steps") {
    const count = arrayLength(slide.fields.steps);
    checks.push(
      check(
        `${slide.title}:steps-template-minimum`,
        "Step template slots",
        count >= 3,
        `${count}/3 required step slots populated.`,
        slide.title
      )
    );
    checks.push(
      check(
        `${slide.title}:steps-capacity`,
        "Step card capacity",
        count <= LAYOUT_ITEM_CAPACITY.steps,
        `${count}/${LAYOUT_ITEM_CAPACITY.steps} steps.`,
        slide.title
      )
    );
  }

  if (slide.layout_id === "feature_adoption") {
    const count = arrayLength(slide.fields.feature_metrics);
    checks.push(
      check(
        `${slide.title}:feature-template-minimum`,
        "Feature table template slots",
        count >= 1,
        `${count}/1 required feature rows populated.`,
        slide.title
      )
    );
    checks.push(
      check(
        `${slide.title}:feature-row-capacity`,
        "Feature table capacity",
        count <= LAYOUT_ITEM_CAPACITY.feature_metrics,
        `${count}/${LAYOUT_ITEM_CAPACITY.feature_metrics} feature rows.`,
        slide.title
      )
    );
  }

  const sourceRefs = slide.source_refs ?? [];
  checks.push(
    check(
      `${slide.title}:source-ref-capacity`,
      "Source reference capacity",
      sourceRefs.length <= 12 && sourceRefs.every((ref) => ref.length <= 160),
      `${sourceRefs.length}/12 source references; max 160 characters each.`,
      slide.title
    )
  );

  return checks;
}

function textFitChecks(
  slide: DeckSlide,
  layout: BrandLayoutDefinition
): DeckFitCheck[] {
  const checks: DeckFitCheck[] = [];
  const limits = layout.max_text_lengths;

  Object.entries(slide.fields).forEach(([fieldName, value]) => {
    const fieldLimit =
      limits[fieldName] ??
      limits.metric_label ??
      limits.feature_label ??
      limits.label ??
      limits.note;

    if (!fieldLimit) {
      return;
    }

    const values = stringifyField(value);
    const longest = values.reduce(
      (max, fieldValue) => Math.max(max, fieldValue.length),
      0
    );
    const maxLines =
      fieldName === "risk_summary" || fieldName === "business_impact" ? 4 : 3;
    const longestLineEstimate = values.reduce(
      (max, fieldValue) =>
        Math.max(max, fieldLineEstimate(fieldValue, Math.max(18, fieldLimit / 2))),
      0
    );

    checks.push(
      check(
        `${slide.title}:${fieldName}:text-fit`,
        `Text fit: ${fieldName}`,
        longest <= fieldLimit && longestLineEstimate <= maxLines,
        `Longest value ${longest}/${fieldLimit} characters; estimated ${longestLineEstimate}/${maxLines} lines.`,
        slide.title
      )
    );
  });

  checks.push(
    check(
      `${slide.title}:title-fit`,
      "Title fit",
      slide.title.length <= (limits.title ?? 120),
      `${slide.title.length}/${limits.title ?? 120} title characters.`,
      slide.title
    )
  );

  return checks;
}

export function auditDeckFit({
  deckPlan,
  brandContract
}: {
  deckPlan: DeckPlan;
  brandContract: BrandContract;
}): DeckFitAudit {
  const checks: DeckFitCheck[] = [];

  for (const slide of deckPlan.slides) {
    const layout = findLayout(brandContract, slide.layout_id);

    if (!layout) {
      checks.push(
        check(
          `${slide.title}:layout-fit`,
          "Layout fit",
          false,
          `${slide.layout_id} is not in the active brand contract.`,
          slide.title
        )
      );
      continue;
    }

    checks.push(...capacityChecks(slide));
    checks.push(...textFitChecks(slide, layout));
  }

  const passed = checks.filter((item) => item.passed).length;
  const fitScore = Math.round((passed / Math.max(checks.length, 1)) * 100);

  return {
    passed: checks.every((item) => item.passed),
    fitScore,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed: checks.length - passed
    }
  };
}
