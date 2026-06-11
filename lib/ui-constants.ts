import brandContractData from "@/data/brand-contract.json";
import { BrandContract } from "@/lib/deck-plan-schema";
import type { BrandAssetSummary, BusinessSnapshotState, ClientProfile, RecipeBuilderState } from "@/lib/ui-types";

export const defaultBrandContract = brandContractData as unknown as BrandContract;

export const DEFAULT_PROMPT =
  "Create an executive adoption report for the client in the account snapshot. Emphasize usage growth, mobile adoption, feature adoption gaps, risks, and practical next steps for the next 90 days.";

export const EMPTY_BUSINESS_SNAPSHOT: BusinessSnapshotState = {
  client_name: "",
  report_period: "",
  previous_report_period: "",
  active_users: "",
  licensed_users: "",
  adoption_score: "",
  previous_active_users: "",
  previous_adoption_score: "",
  projects_active: "",
  mobile_usage_rate: "",
  previous_mobile_usage_rate: "",
  workflow_metrics: [],
  top_feature: "",
  lowest_feature: "",
  risk_summary: "",
  recommendation_1: "",
  recommendation_2: "",
  recommendation_3: ""
};

export const EXAMPLE_BUSINESS_SNAPSHOT: BusinessSnapshotState = {
  client_name: "Harborview Civil Partners",
  report_period: "June 2026",
  previous_report_period: "May 2026",
  active_users: "244",
  licensed_users: "325",
  adoption_score: "76",
  previous_active_users: "213",
  previous_adoption_score: "73",
  projects_active: "24",
  mobile_usage_rate: "61",
  previous_mobile_usage_rate: "59",
  workflow_metrics: [
    { label: "Daily Logs", count: "1840" },
    { label: "RFIs", count: "286" },
    { label: "Submittals", count: "350" }
  ],
  top_feature: "Daily Logs",
  lowest_feature: "Submittals",
  risk_summary:
    "Submittal response ownership is inconsistent across project teams, which is slowing closeout confidence for executive sponsors.",
  recommendation_1:
    "Assign a named workflow owner before the next executive checkpoint.",
  recommendation_2:
    "Review submittal response targets in weekly project health meetings.",
  recommendation_3:
    "Reinforce mobile daily log habits with field supervisors."
};

export const CLIENT_PROFILES: ClientProfile[] = [
  {
    id: "harborview",
    name: "Harborview Civil Partners",
    segment: "Civil infrastructure",
    stage: "Expansion account",
    tools: ["Project Management", "RFIs", "Submittals", "Daily Logs", "Mobile"],
    focus: "Stabilize submittal ownership and reinforce mobile field habits.",
    snapshot: EXAMPLE_BUSINESS_SNAPSHOT,
    context:
      "Client profile: Harborview Civil Partners is a civil infrastructure contractor using Project Management, RFIs, Submittals, Daily Logs, Documents, and Mobile. Business goal: protect margin by shortening submittal response cycles and making daily log habits repeatable across active projects. Risk: submittal response ownership is inconsistent across project teams. Trend note: mobile adoption improved but field leaders still need role-based coaching. Recommendation: position product update content around Submittals, Daily Logs, and Mobile workflows already deployed for the client."
  },
  {
    id: "summit-ridge",
    name: "Summit Ridge Constructors",
    segment: "Commercial general contractor",
    stage: "Renewal planning",
    tools: ["Core Tools", "Documents", "Budget", "Commitments", "Analytics"],
    focus: "Connect adoption gains to executive renewal and cost-control outcomes.",
    snapshot: {
      client_name: "Summit Ridge Constructors",
      report_period: "Q2 2026",
      previous_report_period: "Q1 2026",
      active_users: "418",
      licensed_users: "520",
      adoption_score: "81",
      previous_active_users: "372",
      previous_adoption_score: "74",
      projects_active: "41",
      mobile_usage_rate: "68",
      previous_mobile_usage_rate: "61",
      workflow_metrics: [
        { label: "Daily Logs", count: "3920" },
        { label: "RFIs", count: "512" },
        { label: "Submittals", count: "680" }
      ],
      top_feature: "Documents",
      lowest_feature: "Budget",
      risk_summary:
        "Budget and commitments workflows lag behind field and document adoption, limiting the renewal value story.",
      recommendation_1:
        "Tie the next business review to budget accuracy, commitments visibility, and project controls outcomes.",
      recommendation_2:
        "Run a project-controls enablement sprint for regional operations leaders.",
      recommendation_3:
        "Use executive dashboards to show adoption impact before renewal planning."
    },
    context:
      "Client profile: Summit Ridge Constructors is a commercial GC using Core Tools, Documents, Budget, Commitments, and Analytics. Business goal: connect adoption to renewal value, cost-control visibility, and project controls maturity. Risk: Budget and Commitments adoption trails field workflows. Trend note: document and mobile usage are strong, but project controls workflows need executive reinforcement. Recommendation: for QBR decks, emphasize value realized, renewal readiness, Budget/Commitments enablement, and executive dashboard adoption."
  },
  {
    id: "northstar",
    name: "Northstar Utilities Group",
    segment: "Energy and utilities",
    stage: "New product rollout",
    tools: ["Quality & Safety", "Inspections", "Observations", "Forms", "Analytics"],
    focus: "Target product updates to quality, safety, and field inspection workflows.",
    snapshot: {
      client_name: "Northstar Utilities Group",
      report_period: "July 2026",
      previous_report_period: "June 2026",
      active_users: "186",
      licensed_users: "260",
      adoption_score: "69",
      previous_active_users: "151",
      previous_adoption_score: "58",
      projects_active: "18",
      mobile_usage_rate: "72",
      previous_mobile_usage_rate: "63",
      workflow_metrics: [
        { label: "Inspections", count: "1240" },
        { label: "Observations", count: "144" },
        { label: "Forms", count: "198" }
      ],
      top_feature: "Inspections",
      lowest_feature: "Forms",
      risk_summary:
        "Teams are engaged in inspections, but form standardization and closeout consistency remain uneven.",
      recommendation_1:
        "Anchor the rollout around inspection templates and supervisor review routines.",
      recommendation_2:
        "Introduce forms updates only with workflow-specific field examples.",
      recommendation_3:
        "Measure adoption by region and inspection type before the next product review."
    },
    context:
      "Client profile: Northstar Utilities Group uses Quality & Safety, Inspections, Observations, Forms, and Analytics. Business goal: standardize field quality processes while preserving fast mobile execution. Risk: forms and closeout routines are not consistent by region. Trend note: mobile and inspection adoption are rising, which creates a good entry point for product update messaging. Recommendation: product update decks should connect new Forms, Inspections, and Analytics capabilities to the tools Northstar already owns."
  }
];

export const BRAND_ASSET_ROLE_OPTIONS: Array<{
  value: BrandAssetSummary["role"];
  label: string;
}> = [
  { value: "logo", label: "Logo" },
  { value: "hero_image", label: "Hero Image" },
  { value: "icon", label: "Icon" },
  { value: "texture", label: "Texture" },
  { value: "supporting_image", label: "Supporting Image" }
];

/**
 * Built-in quick picks for the Risks and actions section. Deliberately
 * vendor-neutral so they read correctly for any product, client-facing or
 * internal; admins extend them with workspace-specific lines.
 */
export const BUILT_IN_ACTION_PRESETS: import("@/lib/ui-types").ActionPresets = {
  risks: [
    "Adoption is concentrated in a few teams, so gains depend on a small group of champions.",
    "Key workflows lack a named owner, which slows follow-through between reviews.",
    "Licensed seats outpace active use, which weakens the value story at renewal time.",
    "Recent gains are not yet standardized into repeatable habits across teams."
  ],
  recommendations: [
    "Assign a named owner for each priority workflow.",
    "Set a 30-day adoption target and review it weekly.",
    "Schedule enablement for the lowest-adoption team before the next review.",
    "Standardize the highest-performing team's workflow habits across regions.",
    "Bring the next review back to these numbers to confirm progress."
  ]
};

/**
 * Preview-mode notebook sources shown while the NotebookLM connector runs
 * without Enterprise credentials. Names are clearly example-flavored; text
 * reads like real grounded notebook answers so the demo exercises the same
 * evidence path a live notebook will use.
 */
export const NOTEBOOKLM_SAMPLE_SOURCES: Array<{
  id: string;
  name: string;
  type: "notes" | "transcript" | "brief";
  detail: string;
  text: string;
}> = [
  {
    id: "notebooklm_sample_interviews",
    name: "Example - Field Team Interview Themes",
    type: "transcript",
    detail: "Grounded summary of rollout interviews with citations",
    text: "Notebook summary of six field-team interviews. Supervisors say daily documentation habits formed quickly once mobile entry was standard, but closeout steps still vary by region. Three interviewees flagged that handoffs between field and office teams rely on individual follow-up rather than a tracked workflow. Cited passages: northern region supervisor notes faster review cycles after weekly check-ins; southern region lead requests clearer ownership for response deadlines."
  },
  {
    id: "notebooklm_sample_readiness",
    name: "Example - Rollout Readiness Assessment",
    type: "brief",
    detail: "Notebook answer on readiness gaps and owner assignments",
    text: "Notebook answer to the question of rollout readiness. Strengths: leadership sponsorship is confirmed, training attendance is above target, and two regions completed the pilot checklist. Gaps: owner assignments for escalation paths are incomplete, and the review cadence after go-live is undecided. Recommended follow-ups from cited sources: confirm named owners per region, agree on a 30-day review checkpoint, and publish the escalation path before expansion."
  },
  {
    id: "notebooklm_sample_support",
    name: "Example - Support Themes This Quarter",
    type: "notes",
    detail: "Recurring support topics pulled from the notebook's sources",
    text: "Notebook synthesis of quarterly support themes. The most common topics were permission setup during onboarding, questions about report exports, and requests for clearer mobile checklists. Volume declined month over month after the new onboarding guide shipped. Cited tickets show two regions still route questions through email instead of the shared queue, which delays resolution and hides recurring issues from the trend data."
  }
];

export const MAX_ADMIN_RECIPE_LAYOUTS = 24;

export const DEFAULT_RECIPE_BUILDER: RecipeBuilderState = {
  name: "Customer Steering Committee Update",
  audience: "Executive sponsors and customer steering committee",
  description:
    "Decision-ready adoption update for a specific audience, governed by approved layouts.",
  keywords: "steering, executive, decision, sponsor, adoption",
  layoutIds: [
    "title_client_report",
    "agenda",
    "executive_summary",
    "adoption_kpi_scorecard",
    "risks_recommendations",
    "next_steps"
  ]
};
