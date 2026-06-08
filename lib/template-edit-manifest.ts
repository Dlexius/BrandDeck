import type { ApprovedLayoutId } from "@/lib/deck-plan-schema";
import type { TemplateFrameMapArtifact, TemplateKit } from "@/lib/template-kit-store";
import {
  BUILT_IN_BINDING_TEMPLATE_FINGERPRINTS,
  getTemplateObjectBindingSet,
  templateObjectBindingSource
} from "@/lib/template-object-binding-store";

export type TemplateEditTarget = {
  layoutId: ApprovedLayoutId;
  sourceSlide: number;
  objectId: string;
  objectType: "text_box" | "table_cell" | "slide_chrome";
  role: string;
  dataBinding: string;
  required: boolean;
};

export const TEMPLATE_EDIT_TARGETS: TemplateEditTarget[] = [
  {
    layoutId: "title_client_report",
    sourceSlide: 8,
    objectId: "2401",
    objectType: "text_box",
    role: "Client report title",
    dataBinding: "fields.client_name",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 8,
    objectId: "2402",
    objectType: "text_box",
    role: "Subtitle",
    dataBinding: "fields.subtitle",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 8,
    objectId: "2403",
    objectType: "text_box",
    role: "Report period eyebrow",
    dataBinding: "fields.report_period",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 8,
    objectId: "2404",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 8,
    objectId: "2405",
    objectType: "text_box",
    role: "Prepared by line",
    dataBinding: "system.generated_by",
    required: false
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 10,
    objectId: "2418",
    objectType: "text_box",
    role: "Client report title",
    dataBinding: "fields.client_name",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 10,
    objectId: "2419",
    objectType: "text_box",
    role: "Subtitle",
    dataBinding: "fields.subtitle",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 10,
    objectId: "2420",
    objectType: "text_box",
    role: "Report period eyebrow",
    dataBinding: "fields.report_period",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 10,
    objectId: "2421",
    objectType: "text_box",
    role: "Prepared by line",
    dataBinding: "system.generated_by",
    required: false
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 11,
    objectId: "2427",
    objectType: "text_box",
    role: "Client report title",
    dataBinding: "fields.client_name",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 11,
    objectId: "2428",
    objectType: "text_box",
    role: "Subtitle",
    dataBinding: "fields.subtitle",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 11,
    objectId: "2429",
    objectType: "text_box",
    role: "Report period eyebrow",
    dataBinding: "fields.report_period",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 11,
    objectId: "2430",
    objectType: "text_box",
    role: "Prepared by line",
    dataBinding: "system.generated_by",
    required: false
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 12,
    objectId: "2435",
    objectType: "text_box",
    role: "Client report title",
    dataBinding: "fields.client_name",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 12,
    objectId: "2436",
    objectType: "text_box",
    role: "Subtitle",
    dataBinding: "fields.subtitle",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 12,
    objectId: "2437",
    objectType: "text_box",
    role: "Report period eyebrow",
    dataBinding: "fields.report_period",
    required: true
  },
  {
    layoutId: "title_client_report",
    sourceSlide: 12,
    objectId: "2438",
    objectType: "text_box",
    role: "Prepared by line",
    dataBinding: "system.generated_by",
    required: false
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2465",
    objectType: "text_box",
    role: "Agenda item 1",
    dataBinding: "fields.agenda_items[0]",
    required: true
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2468",
    objectType: "text_box",
    role: "Agenda item 2",
    dataBinding: "fields.agenda_items[1]",
    required: true
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2470",
    objectType: "text_box",
    role: "Agenda item 3",
    dataBinding: "fields.agenda_items[2]",
    required: true
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2472",
    objectType: "text_box",
    role: "Agenda item 4",
    dataBinding: "fields.agenda_items[3]",
    required: true
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2474",
    objectType: "text_box",
    role: "Agenda item 5",
    dataBinding: "fields.agenda_items[4]",
    required: false
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2476",
    objectType: "text_box",
    role: "Agenda item 6",
    dataBinding: "fields.agenda_items[5]",
    required: false
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2467",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "agenda",
    sourceSlide: 15,
    objectId: "2478",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 30,
    objectId: "2631",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 30,
    objectId: "2632",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 30,
    objectId: "2634",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 30,
    objectId: "2633",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 30,
    objectId: "2625",
    objectType: "text_box",
    role: "Business impact and summary list",
    dataBinding: "fields.business_impact_and_summary_points",
    required: true
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 31,
    objectId: "2640",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 31,
    objectId: "2641",
    objectType: "text_box",
    role: "Business impact",
    dataBinding: "fields.business_impact",
    required: true
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 31,
    objectId: "2639",
    objectType: "text_box",
    role: "Summary point group 1",
    dataBinding: "fields.summary_points[0..1]",
    required: true
  },
  {
    layoutId: "executive_summary",
    sourceSlide: 31,
    objectId: "2645",
    objectType: "text_box",
    role: "Summary point group 2",
    dataBinding: "fields.summary_points[2..3]",
    required: false
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 40,
    objectId: "2736",
    objectType: "text_box",
    role: "Slide headline",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 40,
    objectId: "2737",
    objectType: "text_box",
    role: "Metric context",
    dataBinding: "fields.metric_context",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 40,
    objectId: "2739",
    objectType: "text_box",
    role: "Adoption score card",
    dataBinding: "fields.adoption_score",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 40,
    objectId: "2741",
    objectType: "text_box",
    role: "Active users card",
    dataBinding: "fields.active_users",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 40,
    objectId: "2743",
    objectType: "text_box",
    role: "Licensed users card",
    dataBinding: "fields.licensed_users",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 40,
    objectId: "2745",
    objectType: "text_box",
    role: "Mobile usage card",
    dataBinding: "fields.mobile_usage_rate",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2750",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2751",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2753",
    objectType: "text_box",
    role: "Adoption label",
    dataBinding: "system.kpi_label_adoption",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2752",
    objectType: "text_box",
    role: "Adoption point",
    dataBinding: "fields.kpi_adoption_point",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2762",
    objectType: "text_box",
    role: "Active users label",
    dataBinding: "system.kpi_label_users",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2754",
    objectType: "text_box",
    role: "Active users point",
    dataBinding: "fields.kpi_active_users_point",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2756",
    objectType: "text_box",
    role: "Mobile label",
    dataBinding: "system.kpi_label_mobile",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2755",
    objectType: "text_box",
    role: "Mobile point",
    dataBinding: "fields.kpi_mobile_point",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2757",
    objectType: "text_box",
    role: "Licensed users category",
    dataBinding: "fields.kpi_licensed_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2758",
    objectType: "text_box",
    role: "Projects category",
    dataBinding: "fields.kpi_projects_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2759",
    objectType: "text_box",
    role: "Coverage category",
    dataBinding: "fields.kpi_coverage_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 41,
    objectId: "2760",
    objectType: "text_box",
    role: "Focus category",
    dataBinding: "fields.kpi_focus_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2770",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2771",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2767",
    objectType: "text_box",
    role: "Adoption label",
    dataBinding: "system.kpi_label_adoption",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2776",
    objectType: "text_box",
    role: "Adoption point",
    dataBinding: "fields.kpi_adoption_point",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2768",
    objectType: "text_box",
    role: "Active users label",
    dataBinding: "system.kpi_label_users",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2777",
    objectType: "text_box",
    role: "Active users point",
    dataBinding: "fields.kpi_active_users_point",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2769",
    objectType: "text_box",
    role: "Mobile label",
    dataBinding: "system.kpi_label_mobile",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2778",
    objectType: "text_box",
    role: "Mobile point",
    dataBinding: "fields.kpi_mobile_point",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2772",
    objectType: "text_box",
    role: "Licensed users category",
    dataBinding: "fields.kpi_licensed_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2773",
    objectType: "text_box",
    role: "Projects category",
    dataBinding: "fields.kpi_projects_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2774",
    objectType: "text_box",
    role: "Coverage category",
    dataBinding: "fields.kpi_coverage_category",
    required: true
  },
  {
    layoutId: "adoption_kpi_scorecard",
    sourceSlide: 42,
    objectId: "2775",
    objectType: "text_box",
    role: "Focus category",
    dataBinding: "fields.kpi_focus_category",
    required: true
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 129,
    objectId: "4627",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 129,
    objectId: "4628",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 129,
    objectId: "4631",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 129,
    objectId: "4629",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 129,
    objectId: "4630",
    objectType: "text_box",
    role: "Trend summary",
    dataBinding: "fields.trend_summary",
    required: true
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 129,
    objectId: "4632",
    objectType: "text_box",
    role: "Trend proof object",
    dataBinding: "fields.trend_points",
    required: true
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 132,
    objectId: "4671",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 132,
    objectId: "4672",
    objectType: "text_box",
    role: "Trend summary",
    dataBinding: "fields.trend_summary",
    required: true
  },
  {
    layoutId: "usage_trend",
    sourceSlide: 132,
    objectId: "4675",
    objectType: "text_box",
    role: "Trend proof object",
    dataBinding: "fields.trend_points",
    required: true
  },
  {
    layoutId: "feature_adoption",
    sourceSlide: 135,
    objectId: "4698",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "feature_adoption",
    sourceSlide: 135,
    objectId: "4699",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "feature_adoption",
    sourceSlide: 135,
    objectId: "4701",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "feature_adoption",
    sourceSlide: 135,
    objectId: "4700",
    objectType: "table_cell",
    role: "Feature adoption table",
    dataBinding: "fields.feature_metrics",
    required: true
  },
  {
    layoutId: "feature_adoption",
    sourceSlide: 136,
    objectId: "4709",
    objectType: "table_cell",
    role: "Feature adoption table",
    dataBinding: "fields.feature_metrics",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 75,
    objectId: "3328",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 75,
    objectId: "3330",
    objectType: "text_box",
    role: "Risk summary",
    dataBinding: "fields.risk_summary",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 75,
    objectId: "3332",
    objectType: "text_box",
    role: "Recommendation 1",
    dataBinding: "fields.recommendations[0]",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 75,
    objectId: "3334",
    objectType: "text_box",
    role: "Recommendation 2",
    dataBinding: "fields.recommendations[1]",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3343",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3344",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3355",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3345",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3347",
    objectType: "text_box",
    role: "Risk summary",
    dataBinding: "fields.risk_summary",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3349",
    objectType: "text_box",
    role: "Recommendation 1",
    dataBinding: "fields.recommendations[0]",
    required: true
  },
  {
    layoutId: "risks_recommendations",
    sourceSlide: 76,
    objectId: "3351",
    objectType: "text_box",
    role: "Recommendation 2",
    dataBinding: "fields.recommendations[1]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3381",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3382",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3380",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3383",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3384",
    objectType: "text_box",
    role: "Optional note",
    dataBinding: "fields.note",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3389",
    objectType: "text_box",
    role: "Step 1",
    dataBinding: "fields.steps[0]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3390",
    objectType: "text_box",
    role: "Step 2",
    dataBinding: "fields.steps[1]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 78,
    objectId: "3391",
    objectType: "text_box",
    role: "Step 3",
    dataBinding: "fields.steps[2]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3399",
    objectType: "slide_chrome",
    role: "Deck title chrome",
    dataBinding: "system.deck_title",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3400",
    objectType: "slide_chrome",
    role: "Section label chrome",
    dataBinding: "system.section_label",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3398",
    objectType: "slide_chrome",
    role: "Slide number chrome",
    dataBinding: "system.output_slide_number",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3401",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3402",
    objectType: "text_box",
    role: "Optional note",
    dataBinding: "fields.note",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3407",
    objectType: "text_box",
    role: "Step 1",
    dataBinding: "fields.steps[0]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3408",
    objectType: "text_box",
    role: "Step 2",
    dataBinding: "fields.steps[1]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 79,
    objectId: "3409",
    objectType: "text_box",
    role: "Step 3",
    dataBinding: "fields.steps[2]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 80,
    objectId: "3419",
    objectType: "text_box",
    role: "Slide title",
    dataBinding: "slide.title",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 80,
    objectId: "3420",
    objectType: "text_box",
    role: "Optional note",
    dataBinding: "fields.note",
    required: false
  },
  {
    layoutId: "next_steps",
    sourceSlide: 80,
    objectId: "3425",
    objectType: "text_box",
    role: "Step 1",
    dataBinding: "fields.steps[0]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 80,
    objectId: "3426",
    objectType: "text_box",
    role: "Step 2",
    dataBinding: "fields.steps[1]",
    required: true
  },
  {
    layoutId: "next_steps",
    sourceSlide: 80,
    objectId: "3427",
    objectType: "text_box",
    role: "Step 3",
    dataBinding: "fields.steps[2]",
    required: true
  }
];

function editTargetKey(target: TemplateEditTarget) {
  return `${target.layoutId}:${target.sourceSlide}:${target.objectId}:${target.dataBinding}`;
}

export function effectiveTargetsForKit(kit: TemplateKit) {
  const bindingSet = getTemplateObjectBindingSet(kit);

  if (bindingSet) {
    if (!BUILT_IN_BINDING_TEMPLATE_FINGERPRINTS.has(kit.fingerprint)) {
      return bindingSet.targets;
    }

    const importedKeys = new Set(bindingSet.targets.map(editTargetKey));
    const supplementalTargets = TEMPLATE_EDIT_TARGETS.filter(
      (target) => !importedKeys.has(editTargetKey(target))
    );

    return [...bindingSet.targets, ...supplementalTargets];
  }

  const bindingSource = templateObjectBindingSource(kit);

  return bindingSource.source === "built_in_procore" ? TEMPLATE_EDIT_TARGETS : [];
}

export function targetsForLayout(layoutId: ApprovedLayoutId, kit?: TemplateKit) {
  const targets = kit ? effectiveTargetsForKit(kit) : TEMPLATE_EDIT_TARGETS;
  return targets.filter((target) => target.layoutId === layoutId);
}

export function buildTemplateEditGovernance(
  kit: TemplateKit,
  frameMapArtifact: TemplateFrameMapArtifact
 ) {
  const bindingSource = templateObjectBindingSource(kit);
  const effectiveTargets = effectiveTargetsForKit(kit);
  const outputSlides = frameMapArtifact.outputSlides.map((slide) => {
    const targets = effectiveTargets.filter(
      (target) => target.layoutId === slide.layoutId
    ).filter(
      (target) => target.sourceSlide === slide.sourceSlide
    );
    const requiredTargets = targets.filter((target) => target.required);
    const objectTypes = Array.from(new Set(targets.map((target) => target.objectType)));

    return {
      outputSlide: slide.outputSlide,
      layoutId: slide.layoutId,
      sourceSlide: slide.sourceSlide,
      confidence: slide.confidence,
      editTargetCount: targets.length,
      requiredTargetCount: requiredTargets.length,
      objectTypes,
      status:
        slide.sourceSlide === 0
          ? "unmapped"
          : requiredTargets.length > 0
            ? "ready"
            : "needs_admin_mapping",
      targets
    };
  });
  const readyCount = outputSlides.filter((slide) => slide.status === "ready").length;
  const totalTargetCount = outputSlides.reduce(
    (sum, slide) => sum + slide.editTargetCount,
    0
  );

  return {
    schema: "branddeck.template-edit-governance/v1" as const,
    templateKitId: kit.id,
    templateName: kit.templateName,
    templateFingerprint: kit.fingerprint,
    generatedAt: new Date().toISOString(),
    summary: {
      outputSlideCount: outputSlides.length,
      readySlideCount: readyCount,
      editableObjectCount: totalTargetCount,
      textBoxCount: outputSlides.reduce(
        (sum, slide) =>
          sum + slide.targets.filter((target) => target.objectType === "text_box").length,
        0
      ),
      tableCellGroupCount: outputSlides.reduce(
        (sum, slide) =>
          sum + slide.targets.filter((target) => target.objectType === "table_cell").length,
        0
      ),
      governanceScore: Math.round((readyCount / Math.max(outputSlides.length, 1)) * 100),
      bindingSource: bindingSource.source,
      bindingFingerprint: bindingSource.fingerprint,
      bindingUpdatedAt: bindingSource.updatedAt,
      bindingTargetCount:
        bindingSource.source === "built_in_procore"
          ? TEMPLATE_EDIT_TARGETS.length
          : bindingSource.targetCount
    },
    outputSlides
  };
}

export function buildTemplateObjectMapManifest(
  kit: TemplateKit,
  frameMapArtifact: TemplateFrameMapArtifact
) {
  const governance = buildTemplateEditGovernance(kit, frameMapArtifact);

  return {
    schema: "branddeck.template-object-map/v1" as const,
    generatedAt: new Date().toISOString(),
    template: {
      id: kit.id,
      templateName: kit.templateName,
      fingerprint: kit.fingerprint,
      slideCount: kit.slideCount
    },
    frameMap: {
      approval: kit.frameMap.approval,
      coverage: frameMapArtifact.validation.coverage,
      outputSlides: frameMapArtifact.outputSlides.map((slide) => ({
        outputSlide: slide.outputSlide,
        layoutId: slide.layoutId,
        sourceSlide: slide.sourceSlide,
        confidence: slide.confidence,
        evidence: slide.evidence
      }))
    },
    editableObjectGovernance: governance.summary,
    bindingSource: {
      source: governance.summary.bindingSource,
      fingerprint: governance.summary.bindingFingerprint,
      updatedAt: governance.summary.bindingUpdatedAt,
      targetCount: governance.summary.bindingTargetCount
    },
    objectBindings: governance.outputSlides.map((slide) => ({
      outputSlide: slide.outputSlide,
      layoutId: slide.layoutId,
      sourceSlide: slide.sourceSlide,
      status: slide.status,
      requiredTargetCount: slide.requiredTargetCount,
      editTargetCount: slide.editTargetCount,
      targets: slide.targets.map((target) => ({
        objectId: target.objectId,
        objectType: target.objectType,
        role: target.role,
        dataBinding: target.dataBinding,
        required: target.required
      }))
    })),
    rendererBoundary:
      "These object bindings are admin-governed renderer instructions. AI may fill data bindings only; it must not choose object IDs, geometry, colors, or asset placement."
  };
}
