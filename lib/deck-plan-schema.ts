import { z } from "zod";

export const APPROVED_LAYOUT_IDS = [
  "title_client_report",
  "agenda",
  "executive_summary",
  "adoption_kpi_scorecard",
  "usage_trend",
  "feature_adoption",
  "risks_recommendations",
  "next_steps"
] as const;

export const DeckSlideSchema = z.object({
  layout_id: z.enum(APPROVED_LAYOUT_IDS),
  title: z.string().min(1).max(120),
  fields: z.record(z.unknown()),
  speaker_notes: z.string().max(1000).optional(),
  source_refs: z.array(z.string().min(1).max(160)).optional()
});

export const SourceDocumentSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  type: z.enum(["document", "notes", "transcript", "brief"]),
  text: z.string().min(1).max(12000)
});

export const SourcePackSummarySchema = z.object({
  document_count: z.number().int().min(0).max(20),
  evidence_refs: z.array(z.string().min(1).max(160)).max(12),
  constraints: z.array(z.string().min(1).max(160)).max(12)
});

export const DeckPlanSchema = z.object({
  deck_type: z.string().min(1).max(80),
  deck_recipe_id: z.string().min(1).max(80).optional(),
  deck_recipe_name: z.string().min(1).max(80).optional(),
  generation_mode: z.enum(["predefined", "ad_hoc_blueprint"]).optional(),
  recipe_confidence: z.number().min(0).max(100).optional(),
  audience: z.string().min(1).max(80),
  client_name: z.string().min(1).max(80),
  report_period: z.string().min(1).max(60),
  source_pack: SourcePackSummarySchema.optional(),
  slides: z.array(DeckSlideSchema).min(1).max(16)
});

export type ApprovedLayoutId = (typeof APPROVED_LAYOUT_IDS)[number];
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type SourcePackSummary = z.infer<typeof SourcePackSummarySchema>;
export type DeckSlide = z.infer<typeof DeckSlideSchema>;
export type DeckPlan = z.infer<typeof DeckPlanSchema>;

export type BrandLayoutDefinition = {
  layout_id: ApprovedLayoutId;
  name: string;
  purpose: string;
  required_placeholders: string[];
  max_text_lengths: Record<string, number>;
  approved_chart_types: string[];
};

export type BrandContract = {
  companyName: string;
  version: string;
  template_source?: {
    name: string;
    type: string;
    asset_policy: string;
  };
  template_assets?: {
    wordmark_black: string;
    wordmark_white: string;
    hero_photo?: string;
    texture_title?: string;
    texture_agenda?: string;
    icons: Record<string, string>;
  };
  approved_fonts: {
    heading: string[];
    body: string[];
    mono: string[];
  };
  approved_color_tokens: Record<string, string>;
  logo_rules: Record<string, unknown>;
  chart_color_rules: {
    palette: string[];
    neutral_gridline: string;
    axis_label: string;
    use_orange_for: string;
    forbidden_chart_colors: string[];
  };
  forbidden_rules: string[];
  approved_layouts: BrandLayoutDefinition[];
};
