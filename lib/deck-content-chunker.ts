import {
  MAX_DECK_SLIDES,
  type DeckPlan,
  type DeckSlide,
  type OmittedEvidence
} from "@/lib/deck-plan-schema";

export const LAYOUT_ITEM_CAPACITY = {
  agenda_items: 6,
  summary_points: 4,
  recommendations: 2,
  steps: 3,
  feature_metrics: 3,
  action_items: 5,
  source_notes: 3
} as const;

const MIN_RENDERED_ITEMS: Partial<
  Record<keyof typeof LAYOUT_ITEM_CAPACITY, number>
> = {
  agenda_items: 4,
  summary_points: 2,
  recommendations: 2,
  steps: 3
};

const FILLER_COPY: Record<string, string> = {
  agenda_items: "Review supporting context",
  summary_points: "Confirm the supporting evidence and owner.",
  recommendations: "Confirm owner, timing, and next review.",
  steps: "Confirm owner, timing, and next review."
};

const TITLE_LIMITS: Record<DeckSlide["layout_id"], number> = {
  title_client_report: 64,
  agenda: 48,
  statement: 40,
  photo_section_divider: 56,
  executive_summary: 72,
  adoption_kpi_scorecard: 80,
  usage_trend: 80,
  feature_adoption: 80,
  risks_recommendations: 72,
  action_plan_table: 72,
  next_steps: 64
};

function compactTitle(title: string, suffix: string, maxLength: number) {
  const nextTitle = `${title} ${suffix}`.replace(/\s+/g, " ").trim();
  return nextTitle.length <= maxLength
    ? nextTitle
    : `${nextTitle.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function padChunk<T>(fieldName: string, chunk: T[]) {
  const minimum = MIN_RENDERED_ITEMS[fieldName as keyof typeof LAYOUT_ITEM_CAPACITY];

  if (!minimum || chunk.length >= minimum) {
    return chunk;
  }

  const filler = FILLER_COPY[fieldName] as T;
  const padded = [...chunk];

  while (padded.length < minimum) {
    padded.push(filler);
  }

  return padded;
}

function fieldCapacityForSlide(slide: DeckSlide) {
  if (slide.layout_id === "agenda" && Array.isArray(slide.fields.agenda_items)) {
    return {
      fieldName: "agenda_items",
      capacity: LAYOUT_ITEM_CAPACITY.agenda_items
    };
  }

  if (
    slide.layout_id === "executive_summary" &&
    Array.isArray(slide.fields.summary_points)
  ) {
    return {
      fieldName: "summary_points",
      capacity: LAYOUT_ITEM_CAPACITY.summary_points
    };
  }

  if (
    slide.layout_id === "risks_recommendations" &&
    Array.isArray(slide.fields.recommendations)
  ) {
    return {
      fieldName: "recommendations",
      capacity: LAYOUT_ITEM_CAPACITY.recommendations
    };
  }

  if (slide.layout_id === "next_steps" && Array.isArray(slide.fields.steps)) {
    return {
      fieldName: "steps",
      capacity: LAYOUT_ITEM_CAPACITY.steps
    };
  }

  if (
    slide.layout_id === "feature_adoption" &&
    Array.isArray(slide.fields.feature_metrics)
  ) {
    return {
      fieldName: "feature_metrics",
      capacity: LAYOUT_ITEM_CAPACITY.feature_metrics
    };
  }

  // Action rows are objects, so they chunk but never pad with filler copy.
  if (
    slide.layout_id === "action_plan_table" &&
    Array.isArray(slide.fields.action_items)
  ) {
    return {
      fieldName: "action_items",
      capacity: LAYOUT_ITEM_CAPACITY.action_items
    };
  }

  return null;
}

function continuationSlide(
  slide: DeckSlide,
  fieldName: string,
  chunk: unknown[],
  index: number
): DeckSlide {
  return {
    ...slide,
    title: compactTitle(
      slide.title,
      index === 1 ? "Continued" : `Continued ${index}`,
      TITLE_LIMITS[slide.layout_id]
    ),
    fields: {
      ...slide.fields,
      [fieldName]: padChunk(fieldName, chunk)
    },
    source_refs: [
      ...(slide.source_refs ?? []),
      `Continuation: ${fieldName}`
    ].slice(0, 12)
  };
}

function chunkSlide(slide: DeckSlide) {
  const field = fieldCapacityForSlide(slide);

  if (!field) {
    return [slide];
  }

  const items = asArray(slide.fields[field.fieldName]);

  if (items.length <= field.capacity) {
    return [
      {
        ...slide,
        fields: {
          ...slide.fields,
          [field.fieldName]: padChunk(field.fieldName, items)
        }
      }
    ];
  }

  return chunkArray(items, field.capacity).map((chunk, index) =>
    index === 0
      ? {
          ...slide,
          fields: {
            ...slide.fields,
            [field.fieldName]: padChunk(field.fieldName, chunk)
          },
          source_refs: [
            ...(slide.source_refs ?? []),
            `Chunked content: ${field.fieldName}`
          ].slice(0, 12)
        }
      : continuationSlide(slide, field.fieldName, chunk, index)
  );
}

function trimToMaxSlides(slides: DeckSlide[], omitted: OmittedEvidence[]) {
  if (slides.length <= MAX_DECK_SLIDES) {
    return { slides, omitted };
  }

  const kept = slides.slice(0, MAX_DECK_SLIDES);
  const removed = slides.length - kept.length;

  return {
    slides: kept,
    omitted: [
      ...omitted,
      {
        id: "slide-budget-overflow",
        reason:
          "Context produced more continuation slides than the active brand deck limit allows.",
        content_type: "continuation_slides",
        item_count: removed,
        source_ref: "Deck slide budget"
      }
    ]
  };
}

export function chunkDeckPlanContent(deckPlan: DeckPlan): DeckPlan {
  const omitted = [...(deckPlan.omitted_evidence ?? [])];
  const expandedSlides = deckPlan.slides.flatMap(chunkSlide);
  const trimmed = trimToMaxSlides(expandedSlides, omitted);

  return {
    ...deckPlan,
    slides: trimmed.slides,
    omitted_evidence: trimmed.omitted.length > 0 ? trimmed.omitted : undefined
  };
}
