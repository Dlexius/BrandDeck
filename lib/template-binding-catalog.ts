import type { ApprovedLayoutId } from "@/lib/deck-plan-schema";

/**
 * One mappable content field for the guided text-field mapping walkthrough.
 * Every dataBinding here MUST be one the clone-edit renderer resolves (see
 * linesForDataBinding in lib/cloneStarterPptx.ts) - the walkthrough only
 * offers fields that actually fill with content, so mapping fails closed.
 *
 * `core` fields are saved as required bindings: the export dry-run verifies
 * they resolve to client-visible content. Optional fields are cleared when a
 * deck has nothing for them.
 */
export type TemplateTextFieldOption = {
  dataBinding: string;
  label: string;
  hint: string;
  objectType: "text_box" | "table_cell" | "slide_chrome";
  core: boolean;
};

const DECK_TITLE_CHROME: TemplateTextFieldOption = {
  dataBinding: "system.deck_title",
  label: "Presentation name",
  hint: "Small recurring label showing the deck title, often in a header or footer.",
  objectType: "slide_chrome",
  core: false
};

const SECTION_LABEL_CHROME: TemplateTextFieldOption = {
  dataBinding: "system.section_label",
  label: "Section label",
  hint: "Small kicker label naming the current section.",
  objectType: "slide_chrome",
  core: false
};

const SLIDE_NUMBER_CHROME: TemplateTextFieldOption = {
  dataBinding: "system.output_slide_number",
  label: "Slide number",
  hint: "Page number text box, refreshed to match the final slide order.",
  objectType: "slide_chrome",
  core: false
};

const SLIDE_TITLE = (hint: string): TemplateTextFieldOption => ({
  dataBinding: "slide.title",
  label: "Slide title",
  hint,
  objectType: "text_box",
  core: true
});

/**
 * Mappable text fields per approved layout. Variant-specific KPI bindings
 * (kpi_*_point / kpi_*_category) stay on the advanced mapping-file import;
 * the walkthrough covers the base slide for each layout.
 */
export const LAYOUT_TEXT_FIELD_OPTIONS: Record<
  ApprovedLayoutId,
  TemplateTextFieldOption[]
> = {
  title_client_report: [
    {
      dataBinding: "fields.client_name",
      label: "Report title",
      hint: "The big cover title; BrandDeck writes the client name here.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.subtitle",
      label: "Subtitle",
      hint: "Supporting line under the title.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.report_period",
      label: "Reporting period",
      hint: "Short eyebrow line like 'Q2 2026'.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "system.generated_by",
      label: "Prepared-by line",
      hint: "Who the deck was prepared by.",
      objectType: "text_box",
      core: false
    },
    SLIDE_NUMBER_CHROME
  ],
  agenda: [
    SLIDE_TITLE("Headline for the agenda slide."),
    ...[0, 1, 2, 3, 4, 5].map((index) => ({
      dataBinding: `fields.agenda_items[${index}]`,
      label: `Agenda item ${index + 1}`,
      hint:
        index < 4
          ? "One agenda line; every deck fills at least four."
          : "Extra agenda line, cleared when the deck has fewer items.",
      objectType: "text_box" as const,
      core: index < 4
    })),
    DECK_TITLE_CHROME
  ],
  statement: [
    SLIDE_TITLE("The bold framing statement headline."),
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  photo_section_divider: [
    SLIDE_TITLE("Section takeaway shown over the divider photo."),
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  executive_summary: [
    SLIDE_TITLE("Headline for the executive summary."),
    {
      dataBinding: "fields.business_impact",
      label: "Business impact statement",
      hint: "One short paragraph on business impact.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.business_impact_and_summary_points",
      label: "Impact plus summary list",
      hint: "Use when one text box holds the impact line and the summary bullets together.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.summary_points[0..1]",
      label: "Summary points 1-2",
      hint: "Text box holding the first two summary bullets.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.summary_points[2..3]",
      label: "Summary points 3-4",
      hint: "Text box holding the next two summary bullets.",
      objectType: "text_box",
      core: false
    },
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  adoption_kpi_scorecard: [
    SLIDE_TITLE("Headline for the scorecard slide."),
    {
      dataBinding: "fields.metric_context",
      label: "Metric context",
      hint: "Sentence under the headline explaining the numbers.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.adoption_score",
      label: "Adoption score card",
      hint: "Card showing the adoption score percentage.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.active_users",
      label: "Active users card",
      hint: "Card showing the active user count.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.licensed_users",
      label: "Licensed users card",
      hint: "Card showing the licensed user count.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.mobile_usage_rate",
      label: "Mobile usage card",
      hint: "Card showing the mobile usage percentage.",
      objectType: "text_box",
      core: false
    },
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  usage_trend: [
    SLIDE_TITLE("Headline for the trend slide."),
    {
      dataBinding: "fields.trend_summary",
      label: "Trend summary",
      hint: "Sentence describing what the trend shows.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.trend_points",
      label: "Trend data lines",
      hint: "Text box that lists the period-by-period values.",
      objectType: "text_box",
      core: true
    },
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  feature_adoption: [
    SLIDE_TITLE("Headline for the feature usage slide."),
    {
      dataBinding: "fields.feature_metrics",
      label: "Feature usage table",
      hint: "The table whose rows show feature names and counts.",
      objectType: "table_cell",
      core: true
    },
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  risks_recommendations: [
    SLIDE_TITLE("Headline for the risks slide."),
    {
      dataBinding: "fields.risk_summary",
      label: "Risk summary",
      hint: "Paragraph summarizing the key risk.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.recommendations[0]",
      label: "Recommendation 1",
      hint: "First recommendation text box.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.recommendations[1]",
      label: "Recommendation 2",
      hint: "Second recommendation text box.",
      objectType: "text_box",
      core: true
    },
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  action_plan_table: [
    SLIDE_TITLE("Headline for the action plan slide."),
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ],
  next_steps: [
    SLIDE_TITLE("Headline for the next steps slide."),
    {
      dataBinding: "fields.note",
      label: "Supporting note",
      hint: "Optional sentence under the headline.",
      objectType: "text_box",
      core: false
    },
    {
      dataBinding: "fields.steps[0]",
      label: "Step 1",
      hint: "First step text box.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.steps[1]",
      label: "Step 2",
      hint: "Second step text box.",
      objectType: "text_box",
      core: true
    },
    {
      dataBinding: "fields.steps[2]",
      label: "Step 3",
      hint: "Third step text box.",
      objectType: "text_box",
      core: true
    },
    DECK_TITLE_CHROME,
    SECTION_LABEL_CHROME,
    SLIDE_NUMBER_CHROME
  ]
};
